import { createStorageManager } from '@/lib/storageProviders';
import type { File, Folder, Profile, SharedLink } from '@/types';
import { supabase } from './supabase';

// Initialize storage manager with the configured provider.
const storageManager = createStorageManager(supabase);

export const profileApi = {
  async getCurrentProfile(): Promise<Profile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getProfile(id: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getAllProfiles(): Promise<Profile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return Array.isArray(data) ? data : [];
  },

  async updateProfile(id: string, updates: Partial<Profile>): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
  },
};

export const folderApi = {
  async getFolders(parentId: string | null = null): Promise<Folder[]> {
    let query = supabase
      .from('folders')
      .select('*')
      .order('name', { ascending: true });

    if (parentId === null) {
      query = query.is('parent_id', null);
    } else {
      query = query.eq('parent_id', parentId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return Array.isArray(data) ? data : [];
  },

  async getFolder(id: string): Promise<Folder | null> {
    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async createFolder(name: string, parentId: string | null, ownerId: string): Promise<Folder | null> {
    const { data, error } = await supabase
      .from('folders')
      .insert({
        name,
        parent_id: parentId,
        owner_id: ownerId,
      })
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async updateFolder(id: string, updates: Partial<Folder>): Promise<Folder | null> {
    const { data, error } = await supabase
      .from('folders')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async deleteFolder(id: string): Promise<void> {
    const { error } = await supabase
      .from('folders')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getFolderPath(folderId: string | null): Promise<Folder[]> {
    if (!folderId) return [];

    const path: Folder[] = [];
    let currentId: string | null = folderId;

    while (currentId) {
      const folder = await this.getFolder(currentId);
      if (!folder) break;
      path.unshift(folder);
      currentId = folder.parent_id;
    }

    return path;
  },
};

export const fileApi = {
  async getFiles(folderId: string | null = null, includeDeleted = false): Promise<File[]> {
    let query = supabase
      .from('files')
      .select('*')
      .order('created_at', { ascending: false });

    if (folderId === null) {
      query = query.is('folder_id', null);
    } else {
      query = query.eq('folder_id', folderId);
    }

    if (!includeDeleted) {
      query = query.eq('is_deleted', false);
    }

    const { data, error } = await query;

    if (error) throw error;
    return Array.isArray(data) ? data : [];
  },

  async getDeletedFiles(): Promise<File[]> {
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('is_deleted', true)
      .order('deleted_at', { ascending: false });

    if (error) throw error;
    return Array.isArray(data) ? data : [];
  },

  async getFile(id: string): Promise<File | null> {
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async createFile(file: Omit<File, 'id' | 'created_at' | 'updated_at' | 'is_deleted' | 'deleted_at'>): Promise<File | null> {
    const { data, error } = await supabase
      .from('files')
      .insert(file)
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async softDeleteFile(id: string): Promise<File | null> {
    const { data, error } = await supabase
      .from('files')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async restoreFile(id: string): Promise<File | null> {
    const { data, error } = await supabase
      .from('files')
      .update({
        is_deleted: false,
        deleted_at: null,
      })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async permanentDeleteFile(id: string): Promise<void> {
    const { error } = await supabase
      .from('files')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async searchFiles(query: string): Promise<File[]> {
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('is_deleted', false)
      .ilike('name', `%${query}%`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return Array.isArray(data) ? data : [];
  },

  async updateFile(id: string, updates: Partial<File>): Promise<File | null> {
    const { data, error } = await supabase
      .from('files')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async toggleFavorite(id: string, isFavorite: boolean): Promise<File | null> {
    const { data, error } = await supabase
      .from('files')
      .update({ is_favorite: isFavorite })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getFavoriteFiles(): Promise<File[]> {
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('is_favorite', true)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return Array.isArray(data) ? data : [];
  },

  async getRecentFiles(limit = 20): Promise<File[]> {
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('is_deleted', false)
      .not('last_accessed_at', 'is', null)
      .order('last_accessed_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return Array.isArray(data) ? data : [];
  },

  async updateFileAccess(id: string): Promise<void> {
    const { error } = await supabase.rpc('update_file_access', {
      file_uuid: id,
    });

    if (error) throw error;
  },

  async moveFiles(fileIds: string[], targetFolderId: string | null): Promise<void> {
    const { error } = await supabase
      .from('files')
      .update({ folder_id: targetFolderId, updated_at: new Date().toISOString() })
      .in('id', fileIds);

    if (error) throw error;
  },

  async renameFile(id: string, newName: string): Promise<File | null> {
    const { data, error } = await supabase
      .from('files')
      .update({ name: newName, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
  },
};

export const sharedLinkApi = {
  async createShareLink(
    fileId: string | null,
    folderId: string | null,
    ownerId: string,
    canDownload = true,
    expiresAt: string | null = null,
    password: string | null = null
  ): Promise<SharedLink | null> {
    const shareToken = crypto.randomUUID();

    const { data, error } = await supabase
      .from('shared_links')
      .insert({
        file_id: fileId,
        folder_id: folderId,
        owner_id: ownerId,
        share_token: shareToken,
        can_download: canDownload,
        expires_at: expiresAt,
        password,
      })
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getShareLink(token: string): Promise<SharedLink | null> {
    const { data, error } = await supabase
      .from('shared_links')
      .select('*')
      .eq('share_token', token)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getUserShareLinks(userId: string): Promise<SharedLink[]> {
    const { data, error } = await supabase
      .from('shared_links')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return Array.isArray(data) ? data : [];
  },

  async deleteShareLink(id: string): Promise<void> {
    const { error } = await supabase
      .from('shared_links')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async incrementViewCount(shareId: string): Promise<void> {
    const { error } = await supabase.rpc('increment_share_view', {
      share_uuid: shareId,
    });

    if (error) throw error;
  },

  async incrementDownloadCount(shareId: string): Promise<void> {
    const { error } = await supabase.rpc('increment_share_download', {
      share_uuid: shareId,
    });

    if (error) throw error;
  },

  async logShareAccess(
    shareId: string,
    accessType: 'view' | 'download',
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const { error } = await supabase.rpc('log_share_access', {
      share_uuid: shareId,
      access_type_param: accessType,
      ip_param: ipAddress || null,
      user_agent_param: userAgent || null,
    });

    if (error) throw error;
  },
};

export const storageApi = {
  async uploadFile(
    file: globalThis.File,
    userId: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    return await storageManager.uploadFile(file, userId);
  },

  async downloadFile(path: string, fileType: string): Promise<Blob> {
    return await storageManager.downloadFile(path, fileType);
  },

  async downloadSharedFile(
    path: string,
    fileType: string,
    token: string,
    password?: string
  ): Promise<Blob> {
    return storageManager.downloadFile(path, fileType, { token, password });
  },

  async deleteFile(path: string): Promise<void> {
    await storageManager.deleteFile(path);
  },

  async getSharedFileInfo(token: string) {
    return storageManager.getSharedFileInfo(token);
  },

  getPublicUrl(path: string): string | null {
    return storageManager.getPublicUrl(path);
  },

  getStorageProvider(): string {
    return storageManager.getProviderName();
  },
};
