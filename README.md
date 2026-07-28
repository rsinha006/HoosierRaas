# HROS — HoosierRaas Operating System

HROS is the internal executive board tool for [HoosierRaas](https://hoosierRaas.com), Indiana University's competitive Raas/Garba team. It handles roster management, attendance tracking, competition logistics, and team finances — reimbursements, expense requests, budgets, and IUFB tracking.

Built with Next.js (App Router), React, TypeScript, Tailwind CSS, and Supabase (Postgres, Auth, Storage).

## Prerequisites

- Node.js 20+
- npm
- A Supabase project (local via the [Supabase CLI](https://supabase.com/docs/guides/cli) or hosted)

## Getting started

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Create a `.env.local` file in the project root with the variables listed below.

3. Apply database migrations (if using Supabase locally):

```bash
supabase db reset
```

4. Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). New users sign up at `/signup` and must be granted a role by a Captain or Team Manager before they can access the app.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous (publishable) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-side only) |
| `GOOGLE_GEMINI_API_KEY` | For AI packet extraction | Google Gemini API key |
| `GOOGLE_GEMINI_MODEL` | No | Gemini model name (defaults to `gemini-2.5-flash-lite`) |
| `RESEND_API_KEY` | For deadline reminders | Resend API key for outbound email |
| `REMINDER_FROM_EMAIL` | For deadline reminders | Sender address for reminder emails |
| `REMINDER_CRON_SECRET` | For deadline reminders | Shared secret for the `/api/reminders/send` cron endpoint |
| `APP_URL` | For deadline reminders | Public app URL (e.g. `https://hros-peach.vercel.app`) |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run the test suite |

## Project structure

- `app/` — Next.js App Router pages and API routes
- `components/` — React components
- `lib/` — Shared business logic, Supabase clients, and utilities
- `supabase/migrations/` — Postgres schema migrations
- `test/` — Node.js test runner tests

## Roles

HROS uses role-based access control. Roles include Captain, Team Manager, Finance, and Dancer (no access). Write permissions are enforced in both the application layer and Postgres row-level security policies.
