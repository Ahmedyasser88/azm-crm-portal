# Azm CRM — Frontend Portal

A Next.js (App Router) + TypeScript frontend for **Azm CRM**. This repository is currently an
empty scaffold: architecture, tooling, and conventions are in place (Tailwind v4, shadcn/radix-ui
components, jotai state, a server-side `apiServerFetch` API pattern, cookie-based auth middleware,
RTL/Arabic-first layout, sonner toasts) but no CRM business screens have been built yet.

## Getting started

```bash
pnpm install
pnpm dev
```

The dev server runs on **http://localhost:3100** by default (see the `dev`/`start` scripts in
`package.json`), matching the port the backend expects the frontend to run on.

## Configuration

Copy `.env.local.example` to `.env.local` and set `NEXT_PUBLIC_API_BASE_URL` to point at the
**azm-crm-backend** API, e.g. a sibling repo checked out at `../azm-crm-backend`:

```bash
cp .env.local.example .env.local
```

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:5100
```

Authentication uses a single cookie, `azm_crm_auth_token` (see `lib/constants/auth.ts`), read by
both `proxy.ts` (route protection) and `lib/api/fetch/server.ts` (the `apiServerFetch` wrapper used
by every server-side API call).

## Project structure

- `app/` — App Router pages. `app/(pages)/` holds authenticated screens rendered inside the shared
  `AppLayout` shell (header + sidebar); `app/login/` is a public route.
- `components/layout/` — `AppLayout`, `Header`, `Sidebar`.
- `components/ui/` — shadcn/radix primitives (add more with `pnpm dlx shadcn@latest add <name>`).
- `lib/api/fetch/` — the `apiServerFetch<T>` server-fetch wrapper and `ApiResult<T>` type. Add new
  `lib/api/*.api.ts` modules on top of it as CRM endpoints are implemented.
- `lib/constants/sidebar.ts` — the nav item list rendered by `Sidebar`; add new CRM sections here.
- `app/atoms/` — jotai atoms (e.g. sidebar collapsed state).

## Scripts

- `pnpm dev` — start the dev server (Turbopack, port 3100)
- `pnpm build` — production build
- `pnpm start` — run the production build (port 3100)
- `pnpm lint` — run ESLint
