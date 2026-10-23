import type { SupabaseClient } from '@supabase/supabase-js';
import { decryptFile, encryptFile } from './encryption';

export interface SharedStorageFile {
  id: string;
  name: string;
  size: number;
  type: string;
  storage_path: string;
  is_deleted: boolean;
}

export interface SharedStorageAccess {
  link: {
    id: string;
    file_id: string;
    can_download: boolean;
    expires_at: string | null;
  };
  file: Pick<SharedStorageFile, 'id' | 'name' | 'size' | 'type' | 'storage_path' | 'is_deleted'>;
  requiresPassword: boolean;
}

export interface StorageProvider {
  name: string;
  uploadFile(file: Blob, path: string): Promise<string>;
  downloadFile(
    path: string,
    share?: { token: string; password?: string }
  ): Promise<Blob>;
  deleteFile(path: string): Promise<void>;
  getPublicUrl(path: string): string | null;
  getSharedFileInfo?(token: string): Promise<SharedStorageAccess>;
}

type SignedUrlResponse = {
  url: string;
};

async function invokeS3Function<T>(
  supabase: SupabaseClient,
  body: Record<string, unknown>
): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>('s3-storage', { body });
  if (error) throw error;
  if (!data) throw new Error('The S3 storage function returned no data');
  return data;
}

export class S3StorageProvider implements StorageProvider {
  name = 'AWS S3';

  constructor(private supabase: SupabaseClient) {}

  async uploadFile(file: Blob, path: string): Promise<string> {
    const { url } = await invokeS3Function<SignedUrlResponse>(this.supabase, {
      action: 'upload',
      path,
    });
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: file,
    });

    if (!response.ok) {
      throw new Error(`S3 upload failed (${response.status})`);
    }
    return path;
  }

  async downloadFile(
    path: string,
    share?: { token: string; password?: string }
  ): Promise<Blob> {
    const { url } = await invokeS3Function<SignedUrlResponse>(this.supabase, {
      action: 'download',
      path,
      ...(share ? { shareToken: share.token, password: share.password } : {}),
    });
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`S3 download failed (${response.status})`);
    }
    return response.blob();
  }

  async deleteFile(path: string): Promise<void> {
    const { url } = await invokeS3Function<SignedUrlResponse>(this.supabase, {
      action: 'delete',
      path,
    });
    const response = await fetch(url, { method: 'DELETE' });

    if (!response.ok) {
      throw new Error(`S3 delete failed (${response.status})`);
    }
  }

  getPublicUrl(): null {
    return null;
  }

  async getSharedFileInfo(token: string): Promise<SharedStorageAccess> {
    return invokeS3Function<SharedStorageAccess>(this.supabase, {
      action: 'share-info',
      shareToken: token,
    });
  }
}

export class SupabaseStorageProvider implements StorageProvider {
  name = 'Supabase';
  private bucketName = 'app-84kgjmh9j8qp_files';

  constructor(private supabase: SupabaseClient) {}

  async uploadFile(file: Blob, path: string): Promise<string> {
    const { error } = await this.supabase.storage
      .from(this.bucketName)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;
    return path;
  }

  async downloadFile(path: string): Promise<Blob> {
    const { data, error } = await this.supabase.storage
      .from(this.bucketName)
      .download(path);

    if (error) throw error;
    return data;
  }

  async deleteFile(path: string): Promise<void> {
    const { error } = await this.supabase.storage
      .from(this.bucketName)
      .remove([path]);

    if (error) throw error;
  }

  getPublicUrl(path: string): string | null {
    const { data } = this.supabase.storage
      .from(this.bucketName)
      .getPublicUrl(path);

    return data?.publicUrl || null;
  }
}

export class StorageManager {
  constructor(private provider: StorageProvider) {}

  async uploadFile(file: File, userId: string): Promise<string> {
    const encryptedBlob = await encryptFile(file);
    const filePath = `${userId}/${crypto.randomUUID()}.enc`;

    await this.provider.uploadFile(encryptedBlob, filePath);
    return filePath;
  }

  async downloadFile(
    path: string,
    fileType: string,
    share?: { token: string; password?: string }
  ): Promise<Blob> {
    const encryptedBlob = await this.provider.downloadFile(path, share);
    return decryptFile(encryptedBlob, fileType);
  }

  async deleteFile(path: string): Promise<void> {
    await this.provider.deleteFile(path);
  }

  getPublicUrl(path: string): string | null {
    return this.provider.getPublicUrl(path);
  }

  getProviderName(): string {
    return this.provider.name;
  }

  async getSharedFileInfo(token: string): Promise<SharedStorageAccess> {
    if (!this.provider.getSharedFileInfo) {
      throw new Error('Shared S3 storage is not available for this provider');
    }
    return this.provider.getSharedFileInfo(token);
  }
}

export function createStorageManager(supabase: SupabaseClient): StorageManager {
  const storageType = (import.meta.env.VITE_STORAGE_PROVIDER || 's3').toLowerCase();

  switch (storageType) {
    case 's3':
    case 'aws':
      return new StorageManager(new S3StorageProvider(supabase));
    case 'supabase':
      return new StorageManager(new SupabaseStorageProvider(supabase));
    default:
      throw new Error(`Unsupported storage provider: ${storageType}`);
  }
}
