import { Download, Lock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { fileApi, sharedLinkApi, storageApi } from '@/db/api';
import { useToast } from '@/hooks/use-toast';
import { downloadBlob, formatFileSize, getFileIcon, isImageFile, isVideoFile } from '@/lib/fileUtils';
import type { File, SharedLink } from '@/types';

export default function SharedViewPage() {
  const { token } = useParams<{ token: string }>();
  const [shareLink, setShareLink] = useState<Pick<SharedLink, 'id' | 'file_id' | 'can_download' | 'expires_at'> | null>(null);
  const [file, setFile] = useState<Pick<File, 'id' | 'name' | 'size' | 'type' | 'storage_path' | 'is_deleted'> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sharedBlob, setSharedBlob] = useState<Blob | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!token) return;

    let active = true;
    const loadSharedContent = async () => {
      setLoading(true);
      setError('');
      setShareLink(null);
      setFile(null);
      setPreviewUrl(null);
      setSharedBlob(null);
      setPassword('');
      setPasswordError('');
      setRequiresPassword(false);
      try {
        if (storageApi.getStorageProvider() === 'AWS S3') {
          const access = await storageApi.getSharedFileInfo(token);
          if (!active) return;
          if (access.file.is_deleted) {
            setError('File not found or has been deleted');
            return;
          }

          setShareLink(access.link);
          setFile(access.file);
          setRequiresPassword(access.requiresPassword);
          if (!access.requiresPassword) {
            const blob = await storageApi.downloadSharedFile(
              access.file.storage_path,
              access.file.type,
              token
            );
            if (!active) return;
            setSharedBlob(blob);
            setPreviewUrl(URL.createObjectURL(blob));
          }
          return;
        }

        const link = await sharedLinkApi.getShareLink(token);
        
        if (!link) {
          setError('Share link not found or has expired');
          return;
        }

        if (link.expires_at && new Date(link.expires_at) < new Date()) {
          setError('This share link has expired');
          return;
        }

        setShareLink(link);

        if (link.file_id) {
          const fileData = await fileApi.getFile(link.file_id);
          if (fileData && !fileData.is_deleted) {
            setFile(fileData);
          } else {
            setError('File not found or has been deleted');
          }
        }
      } catch (err) {
        if (active) setError('Failed to load shared content');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadSharedContent();
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const unlockSharedFile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file || !token) return;

    setUnlocking(true);
    setPasswordError('');
    try {
      const blob = await storageApi.downloadSharedFile(
        file.storage_path,
        file.type,
        token,
        password
      );
      setSharedBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
    } catch {
      setPasswordError('The password is incorrect or the share is no longer available.');
    } finally {
      setUnlocking(false);
    }
  };

  const handleDownload = async () => {
    if (!file || !shareLink?.can_download) return;

    try {
      const blob = sharedBlob || (token && storageApi.getStorageProvider() === 'AWS S3'
        ? await storageApi.downloadSharedFile(file.storage_path, file.type, token, password)
        : await storageApi.downloadFile(file.storage_path, file.type));
      downloadBlob(blob, file.name);
      toast({
        title: 'Success',
        description: 'File downloaded successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to download file',
        variant: 'destructive',
      });
    }
  };

  const renderPreview = () => {
    if (!file) return null;

    if (isImageFile(file.type)) {
      return (
        <div className="flex items-center justify-center bg-muted rounded-lg p-4">
          <img
            src={previewUrl || storageApi.getPublicUrl(file.storage_path) || undefined}
            alt={file.name}
            className="max-w-full max-h-[60vh] object-contain"
          />
        </div>
      );
    }

    if (isVideoFile(file.type)) {
      return (
        <div className="flex items-center justify-center bg-muted rounded-lg p-4">
          <video
            src={previewUrl || storageApi.getPublicUrl(file.storage_path) || undefined}
            controls
            className="max-w-full max-h-[60vh]"
          >
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-4xl mb-4">
          {getFileIcon(file.type)}
        </div>
        <p className="text-muted-foreground mb-4">Preview not available for this file type</p>
        {shareLink?.can_download && (!requiresPassword || previewUrl) && (
          <Button onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download to View
          </Button>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">{error}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Lock className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">EpicBox</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-4xl mx-auto p-6">
          {file && (
            <>
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold mb-2">{file.name}</h1>
                  <p className="text-sm text-muted-foreground">
                    Size: {formatFileSize(file.size)} • Type: {file.type}
                  </p>
                </div>
                {shareLink?.can_download && (!requiresPassword || previewUrl) && (
                  <Button onClick={handleDownload}>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                )}
              </div>

              {requiresPassword && !previewUrl ? (
                <form onSubmit={unlockSharedFile} className="max-w-sm space-y-3">
                  <label htmlFor="share-password" className="text-sm font-medium">
                    This file is password protected
                  </label>
                  <Input
                    id="share-password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  {passwordError && (
                    <p className="text-sm text-destructive">{passwordError}</p>
                  )}
                  <Button type="submit" disabled={unlocking}>
                    {unlocking ? 'Checking…' : 'Unlock file'}
                  </Button>
                </form>
              ) : (
                renderPreview()
              )}

              {!shareLink?.can_download && (
                <div className="mt-6 p-4 bg-muted rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">
                    Downloads are disabled for this shared file
                  </p>
                </div>
              )}
            </>
          )}
        </Card>
      </main>
    </div>
  );
}
