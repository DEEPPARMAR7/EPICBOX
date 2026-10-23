import { createClient } from 'npm:@supabase/supabase-js@2.76.1';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from 'npm:@aws-sdk/client-s3@3.948.0';
import { getSignedUrl } from 'npm:@aws-sdk/s3-request-presigner@3.948.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

function respond(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function isObjectKeyForUser(path: unknown, userId: string): path is string {
  if (typeof path !== 'string') return false;
  const [prefix, filename, extra] = path.split('/');
  return prefix === userId &&
    extra === undefined &&
    /^[0-9a-f-]{36}\.enc$/i.test(filename || '');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (request.method !== 'POST') {
    return respond(405, { error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const bucket = Deno.env.get('S3_BUCKET');
    const region = Deno.env.get('AWS_REGION');
    const accessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID');
    const secretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');

    if (!supabaseUrl || !anonKey || !serviceRoleKey || !bucket || !region ||
        !accessKeyId || !secretAccessKey) {
      console.error('S3 storage function is missing required server configuration');
      return respond(503, { error: 'S3 storage is not configured' });
    }

    const payload: unknown = await request.json();
    if (!isRecord(payload) || typeof payload.action !== 'string') {
      return respond(400, { error: 'Invalid request' });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const s3 = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });

    const authHeader = request.headers.get('Authorization') || '';
    const bearerToken = authHeader.match(/^Bearer\s+(.+)$/i)?.[1];
    let user = null;
    if (bearerToken) {
      const authClient = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await authClient.auth.getUser(bearerToken);
      if (!error) user = data.user;
    }

    if (payload.action === 'share-info') {
      if (typeof payload.shareToken !== 'string' || payload.shareToken.length > 128) {
        return respond(400, { error: 'Invalid share link' });
      }

      const { data: link, error: linkError } = await admin
        .from('shared_links')
        .select('id, file_id, can_download, expires_at, password')
        .eq('share_token', payload.shareToken)
        .maybeSingle();
      if (linkError) throw linkError;
      if (!link?.file_id || (link.expires_at && Date.parse(link.expires_at) <= Date.now())) {
        return respond(404, { error: 'Share link not found or expired' });
      }

      const { data: file, error: fileError } = await admin
        .from('files')
        .select('id, name, size, type, storage_path, is_deleted')
        .eq('id', link.file_id)
        .maybeSingle();
      if (fileError) throw fileError;
      if (!file || file.is_deleted) {
        return respond(404, { error: 'Shared file not found' });
      }

      return respond(200, {
        link: {
          id: link.id,
          file_id: link.file_id,
          can_download: link.can_download,
          expires_at: link.expires_at,
        },
        file,
        requiresPassword: Boolean(link.password),
      });
    }

    if (payload.action === 'upload') {
      if (!user) return respond(401, { error: 'Sign in to upload files' });
      if (!isObjectKeyForUser(payload.path, user.id)) {
        return respond(400, { error: 'Invalid object key' });
      }

      const url = await getSignedUrl(
        s3,
        new PutObjectCommand({
          Bucket: bucket,
          Key: payload.path,
          ContentType: 'application/octet-stream',
        }),
        { expiresIn: 300 }
      );
      return respond(200, { url });
    }

    if (payload.action === 'download') {
      if (typeof payload.path !== 'string') {
        return respond(400, { error: 'Invalid object key' });
      }

      if (typeof payload.shareToken === 'string' && payload.shareToken.length > 0) {
        if (payload.shareToken.length > 128) return respond(400, { error: 'Invalid share link' });
        const { data: link, error: linkError } = await admin
          .from('shared_links')
          .select('id, file_id, expires_at, password')
          .eq('share_token', payload.shareToken)
          .maybeSingle();
        if (linkError) throw linkError;
        if (!link?.file_id || (link.expires_at && Date.parse(link.expires_at) <= Date.now())) {
          return respond(404, { error: 'Share link not found or expired' });
        }
        if (link.password && payload.password !== link.password) {
          return respond(403, { error: 'Share password is required or incorrect' });
        }

        const { data: file, error: fileError } = await admin
          .from('files')
          .select('storage_path, is_deleted')
          .eq('id', link.file_id)
          .maybeSingle();
        if (fileError) throw fileError;
        if (!file || file.is_deleted || file.storage_path !== payload.path) {
          return respond(404, { error: 'Shared file not found' });
        }
      } else {
        if (!user) return respond(401, { error: 'Sign in to download files' });
        if (!isObjectKeyForUser(payload.path, user.id)) {
          return respond(403, { error: 'You cannot access this file' });
        }

        const { data: file, error: fileError } = await admin
          .from('files')
          .select('id')
          .eq('storage_path', payload.path)
          .eq('owner_id', user.id)
          .eq('is_deleted', false)
          .maybeSingle();
        if (fileError) throw fileError;
        if (!file) return respond(404, { error: 'File not found' });
      }

      const url = await getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: bucket, Key: payload.path }),
        { expiresIn: 300 }
      );
      return respond(200, { url });
    }

    if (payload.action === 'delete') {
      if (!user) return respond(401, { error: 'Sign in to delete files' });
      if (!isObjectKeyForUser(payload.path, user.id)) {
        return respond(403, { error: 'You cannot access this file' });
      }

      const { data: file, error: fileError } = await admin
        .from('files')
        .select('id')
        .eq('storage_path', payload.path)
        .eq('owner_id', user.id)
        .maybeSingle();
      if (fileError) throw fileError;
      if (!file) return respond(404, { error: 'File not found' });

      const url = await getSignedUrl(
        s3,
        new DeleteObjectCommand({ Bucket: bucket, Key: payload.path }),
        { expiresIn: 300 }
      );
      return respond(200, { url });
    }

    return respond(400, { error: 'Unsupported action' });
  } catch (error) {
    console.error('S3 storage request failed:', error);
    return respond(500, { error: 'Unable to process storage request' });
  }
});
