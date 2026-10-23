# EpicBox

EpicBox is a cloud file-storage application built with React, TypeScript, Vite,
Supabase, and Amazon S3. It provides authenticated file management, folders,
favorites, recent files, recycle-bin workflows, sharing, and private object
storage through short-lived, server-generated upload and download URLs.

## Features

- Email/password authentication and password reset
- User profiles with admin and user roles
- File upload, download, search, sorting, and preview
- Folder creation and organization
- Favorites, recent files, and recycle bin
- Password-protected and expiring share links
- QR codes and share-access statistics
- Private Amazon S3 storage with client-side AES-GCM encryption
- Supabase Edge Function authorization and short-lived S3 presigned URLs
- Responsive light and dark themes

## Stack

- React 18, TypeScript, and Vite
- React Router with hash-based navigation
- Tailwind CSS and Radix UI
- Supabase Auth, PostgreSQL, and Row Level Security
- Amazon S3 and Supabase Edge Functions
- Vercel deployment
- npm 10 and Node.js 20 or newer

## Repository

- GitHub: [DEEPPARMAR7/EPICBOX](https://github.com/DEEPPARMAR7/EPICBOX)
- Production: [epicbox.vercel.app](https://epicbox.vercel.app/)

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env` from `.env.example`:

   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
   VITE_STORAGE_PROVIDER=s3
   VITE_ENCRYPTION_KEY=your-existing-encryption-key
   ```

   `.env` is ignored by Git. Use only a Supabase publishable/anon key in this
   browser application. Never expose a Supabase service-role key.

3. Apply the Supabase migrations in the SQL Editor, in this order:

   - `supabase/migrations/00001_create_initial_schema.sql`
   - `supabase/migrations/00002_add_terabox_features.sql`
   - `supabase/migrations/00003_fix_profile_creation.sql`
   - `supabase/migrations/00004_repair_profile_trigger.sql`

   These migrations create the database tables, Row Level Security policies,
   profile trigger, functions, indexes, and private storage bucket. The final
   migration repairs profile creation for projects where an earlier migration
   was incomplete or the trigger was replaced.

4. Start the development server:

   ```bash
   npm run dev
   ```

   The application uses hash-based navigation. The login page is available at
   `/#/login`.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Yes | URL of the active Supabase project |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase publishable key |
| `VITE_SUPABASE_ANON_KEY` | Legacy | Older anon-key name still supported |
| `VITE_STORAGE_PROVIDER` | Yes | Use `s3` for private S3 storage; `supabase` remains available |
| `VITE_ENCRYPTION_KEY` | For compatibility | AES key used for encrypted files |

`VITE_*` values are embedded in the frontend bundle. The encryption key is
therefore not a server-only secret. Keep the same `VITE_ENCRYPTION_KEY` value
when restoring access to existing encrypted files; changing it makes those
files unreadable. If no key was configured for older files, the application’s
legacy fallback may be required for compatibility. Plan a key migration before
changing encryption behavior.

## Supabase setup

The active project must contain all four migrations listed above. New users are
created in the active Supabase project and their profile is created by a
database trigger; the browser must not insert profile rows during signup.
Users and file metadata are not automatically transferred when changing
Supabase projects.

For a new project:

1. Run all four migrations in Supabase SQL Editor.
2. Confirm the migrations complete successfully. The Supabase storage bucket
   is only used when `VITE_STORAGE_PROVIDER=supabase`.
3. Configure Authentication settings and redirect URLs for local and Vercel
   origins.
4. Register the account again in the new project.

## AWS S3 storage setup

S3 is the configured provider in `.env.example`. AWS credentials are used only
by the `s3-storage` Supabase Edge Function; never add them to a `VITE_*`
variable or the frontend environment.

1. Create a private S3 bucket in the AWS region you will configure. Block all
   public access.
2. Create a dedicated IAM identity limited to `s3:PutObject`, `s3:GetObject`,
   and `s3:DeleteObject` on that bucket's objects. Do not grant bucket listing
   or public-access permissions.
3. Configure the bucket's CORS policy to allow the EpicBox web origins and
   `PUT`, `GET`, and `DELETE` methods, with the `Content-Type` request header.
4. Set these Supabase Edge Function secrets: `AWS_ACCESS_KEY_ID`,
   `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, and `S3_BUCKET`. Supabase supplies
   the project URL and keys to Edge Functions.
   Set them with `supabase secrets set AWS_ACCESS_KEY_ID=your-access-key AWS_SECRET_ACCESS_KEY=your-secret-key AWS_REGION=your-region S3_BUCKET=your-bucket-name`.
5. Deploy the function with `supabase functions deploy s3-storage`. The
   function verifies Supabase users for uploads, private downloads, and
   deletes; public share downloads are checked against the share token,
   expiration, and optional password. S3 URLs expire after five minutes.
6. Set `VITE_STORAGE_PROVIDER=s3` in local and Vercel environments and
   redeploy the frontend.

Files are encrypted in the browser before upload. Existing files stored in
Supabase Storage are not copied to S3 when changing providers; migrate those
objects and their metadata before switching a populated deployment.

## Vercel deployment

Connect Vercel to the `DEEPPARMAR7/EPICBOX` repository and set the production
branch to the branch you intend to deploy. The project configuration is:

- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm install`

Add these environment variables in Vercel for Production, Preview, and
Development:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_STORAGE_PROVIDER
VITE_ENCRYPTION_KEY
```

Redeploy after changing any `VITE_*` value. `vercel.json` rewrites clean entry
URLs such as `/login` to the Vite application entry point, preventing Vercel
from returning a 404 before the client router loads.

If a replacement Supabase project contains test data, the optional
`supabase/reset-data.sql` script removes users, application records, and
Storage objects while preserving the schema. Review it carefully and run it
manually only in the intended replacement project.

## Production validation

Run the production build locally:

```bash
npm run build
```

The generated files are written to `dist/`. The repository also provides a
combined lint and build command:

```bash
npm run lint
```

## Project structure

```text
src/
  components/       Shared UI and layout components
  contexts/         Authentication and application state
  db/               Supabase client and data-access APIs
  hooks/             Reusable React hooks
  lib/               Encryption and storage providers
  pages/             Route-level screens
  routes.tsx        Application routes
supabase/
  migrations/       Database schema and security migrations
docs/prd.md         Product requirements record
vercel.json         Vercel build and SPA rewrite configuration
```

## Security notes

- Never commit `.env`, service-role keys, database passwords, or access tokens.
- Supabase Row Level Security must remain enabled on application tables.
- Keep the S3 bucket private and AWS credentials in Supabase Edge Function
  secrets, not in browser configuration.
- Use the same encryption key when accessing existing encrypted files.
- Review and rotate exposed credentials immediately if they are published
  outside the intended deployment configuration.
