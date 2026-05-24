# Epicbox

Epicbox is a modern cloud storage web application built with React, TypeScript, Vite, Tailwind CSS, and Supabase.

## What this project includes

- File upload, storage, and management UI
- Supabase authentication and file storage integration
- Responsive React interface with Radix UI and reusable components
- Production-ready Vite build configuration

## Tech stack

- React + TypeScript
- Vite
- Supabase
- Tailwind CSS
- Radix UI components
- Axios, React Router, React Hook Form

## Getting started

### Prerequisites

- Node.js 20.x or later
- npm 10.x or later

### Install dependencies

```bash
npm install
```

### Local development

```bash
npm run dev -- --host 127.0.0.1
```

### Build for production

```bash
npm run build
```

## Environment variables

Create a `.env` file at the project root or copy `.env.example` and update the values:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_STORAGE_PROVIDER=supabase
```

> Login now uses the registered email address and password.

## Project structure

- `src/` — application source code
- `src/db/` — Supabase client and API helpers
- `src/pages/` — route page components
- `src/components/` — shared UI components
- `src/hooks/` — reusable hooks
- `src/lib/` — utility helpers
- `public/` — static assets

## Build verification

The application was verified successfully with:

```bash
npm install
npm run build
```

## Notes

- The build completed successfully in this environment.
- The app requires Supabase environment variables to run correctly.
