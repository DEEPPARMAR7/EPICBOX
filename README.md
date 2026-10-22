# EpicBox

EpicBox is a secure cloud file-storage application built with React,
TypeScript, Vite, Tailwind CSS, and Supabase. It provides authenticated file
management, folders, favorites, recent files, recycle-bin workflows, sharing,
and protected storage operations.

## Features

- Email/password authentication and password reset
- User profiles with admin and user roles
- File upload, download, search, sorting, and preview
- Folder creation and organization
- Favorites, recent files, and recycle bin
- Password-protected and expiring share links
- QR codes and share-access statistics
- Private Supabase Storage with client-side AES-GCM encryption
- Responsive light and dark themes

## Stack

- React 18, TypeScript, and Vite
- React Router with hash-based navigation
- Tailwind CSS and Radix UI
- Supabase Auth, PostgreSQL, Row Level Security, and Storage
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
   VITE_STORAGE_PROVIDER=supabase
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
| `VITE_STORAGE_PROVIDER` | Yes | Use `supabase` for the supported setup |
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
Users, file metadata, and Storage objects are not
automatically transferred when changing Supabase projects.

For a new project:

1. Run all three migrations in Supabase SQL Editor.
2. Confirm the private storage bucket exists.
3. Configure Authentication settings and redirect URLs for local and Vercel
   origins.
4. Register the account again in the new project.

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
- Keep the Storage bucket private.
- Use the same encryption key when accessing existing encrypted files.
- Review and rotate exposed credentials immediately if they are published
  outside the intended deployment configuration.
