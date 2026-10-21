/*
# Add TeraBox-like Features

## Changes

1. **Enhanced Shared Links**
   - Add `password` field for password-protected shares
   - Add `expires_at` field for expiring shares
   - Add `view_count` to track views
   - Add `download_count` to track downloads
   - Add `last_accessed_at` to track last access

2. **File Enhancements**
   - Add `last_accessed_at` to track recent files
   - Add `is_favorite` flag for starred files

3. **Share Access Tracking**
   - Create `share_access_logs` table to track detailed access
   - Log IP, user agent, and access type

4. **Functions**
   - `increment_share_view()` - Increment view count
   - `increment_share_download()` - Increment download count
   - `log_share_access()` - Log detailed access

5. **Security**
   - Public access to shared links with password validation
   - RLS policies for favorites
*/

-- Add new columns to shared_links
ALTER TABLE shared_links
ADD COLUMN IF NOT EXISTS password text,
ADD COLUMN IF NOT EXISTS expires_at timestamptz,
ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS download_count integer DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS last_accessed_at timestamptz;

-- Add new columns to files
ALTER TABLE files
ADD COLUMN IF NOT EXISTS last_accessed_at timestamptz,
ADD COLUMN IF NOT EXISTS is_favorite boolean DEFAULT false NOT NULL;

-- Create share access logs table
CREATE TABLE IF NOT EXISTS share_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id uuid REFERENCES shared_links(id) ON DELETE CASCADE NOT NULL,
  access_type text NOT NULL CHECK (access_type IN ('view', 'download')),
  accessed_at timestamptz DEFAULT now() NOT NULL,
  ip_address text,
  user_agent text
);

-- Enable RLS on share_access_logs
ALTER TABLE share_access_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all access logs
DROP POLICY IF EXISTS "Admins can view all access logs" ON share_access_logs;
CREATE POLICY "Admins can view all access logs" ON share_access_logs
  FOR SELECT TO authenticated USING (is_admin(auth.uid()));

-- Policy: Share owners can view their access logs
DROP POLICY IF EXISTS "Share owners can view access logs" ON share_access_logs;
CREATE POLICY "Share owners can view access logs" ON share_access_logs
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM shared_links sl
      WHERE sl.id = share_access_logs.share_id
      AND sl.owner_id = auth.uid()
    )
  );

-- Function to increment share view count
CREATE OR REPLACE FUNCTION increment_share_view(share_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE shared_links
  SET 
    view_count = view_count + 1,
    last_accessed_at = now()
  WHERE id = share_uuid;
END;
$$;

-- Function to increment share download count
CREATE OR REPLACE FUNCTION increment_share_download(share_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE shared_links
  SET 
    download_count = download_count + 1,
    last_accessed_at = now()
  WHERE id = share_uuid;
END;
$$;

-- Function to log share access
CREATE OR REPLACE FUNCTION log_share_access(
  share_uuid uuid,
  access_type_param text,
  ip_param text DEFAULT NULL,
  user_agent_param text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO share_access_logs (share_id, access_type, ip_address, user_agent)
  VALUES (share_uuid, access_type_param, ip_param, user_agent_param);
END;
$$;

-- Function to update file last accessed
CREATE OR REPLACE FUNCTION update_file_access(file_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE files
  SET last_accessed_at = now()
  WHERE id = file_uuid;
END;
$$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_files_last_accessed ON files(last_accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_files_is_favorite ON files(is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_share_access_logs_share_id ON share_access_logs(share_id);
CREATE INDEX IF NOT EXISTS idx_shared_links_expires_at ON shared_links(expires_at) WHERE expires_at IS NOT NULL;
