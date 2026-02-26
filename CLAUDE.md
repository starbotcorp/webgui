# CLAUDE.md — Starbot WebGUI

This is the web frontend for Starbot, an AI assistant system. It's a Next.js/React app that provides chat, project management, memory editing, and an admin console.

Live at `https://starbot.cloud/`. Runs on port 3001 behind nginx.

---

## Commands

```bash
npm install              # Install deps
npm run dev              # Dev server on port 3000
npm run build            # Production build (standalone output)
npm start                # Run production build (port 3001)
npm run lint             # ESLint
```

No test suite is configured.

## Deploy

```bash
./deploy.sh              # Build, publish static assets, install service, restart
```

The deploy script builds with `output: 'standalone'`, copies `.next/static/` and `public/` into the standalone directory, installs `deploy/starbot-webgui.service` to systemd, and restarts. Logs: `sudo journalctl -u starbot-webgui -f`

---

## Environment

No `.env` file needed for basic operation. Config comes from systemd environment variables in `deploy/starbot-webgui.service`:

- `PORT=3001`
- `NEXT_PUBLIC_API_URL=http://127.0.0.1:3737` — backend API
- `NEXT_PUBLIC_ADMIN_CONSOLE_HOSTS` — hostnames that trigger admin console mode
- `ADMIN_EMAILS`, `ADMIN_CONSOLE_CODE`, `ADMIN_COOKIE_SECRET` — admin auth

The API runs locally on port 3737. All `/v1/*` requests are proxied by nginx to the API; the WebGUI never talks to the API directly from the browser in production.

---

## Architecture

### How It Connects to the API

- `src/proxy.ts` — Next.js middleware that proxies `/v1/*` requests to the API server. This handles streaming (SSE) for chat generation.
- `src/lib/api.ts` — Base API client with auth token handling.
- `src/lib/api/*.ts` — Typed API functions (chats, projects, messages, folders, memory).

### Streaming Chat

The chat stream uses raw `fetch` + `ReadableStream` (NOT EventSource). The hook `src/hooks/use-chat-stream.ts` handles:
- Sending messages via `POST /v1/chats/:id/run`
- Parsing SSE events: `message.start`, `message.delta`, `message.stop`, `tool.call`, `tool.result`, `inference.complete`
- Updating UI state as tokens arrive

### Auth

- `src/lib/auth-session.ts` — Session management (token storage/retrieval)
- `src/app/api/auth/session/route.ts` — Server-side session endpoint
- `src/app/login/page.tsx` / `src/app/signup/page.tsx` — Auth pages
- Tokens are stored client-side and sent as `Authorization: Bearer <token>`

### Admin Console

Activated by hostname matching (e.g. `console.starbot.cloud`). Controlled by `NEXT_PUBLIC_ADMIN_CONSOLE_HOSTS` and `ADMIN_CONSOLE_HOSTS` env vars.

- `src/app/admin/` — Admin pages (identity, providers)
- `src/components/admin/admin-shell.tsx` — Admin layout wrapper
- `src/lib/server/admin-cookie.ts` — Server-side admin cookie auth

---

## Code Layout

```
src/
  proxy.ts            — Next.js middleware, proxies /v1/* to API
  app/                — Next.js App Router pages
    admin/           — Admin console pages
    api/auth/        — Session API route
  components/        — React components
    chat/            — Chat UI components
    ui/              — Shared UI primitives
  hooks/              — Custom React hooks (use-chat-stream)
  lib/                — Utilities and API clients
    api/             — Typed API functions
  store/              — Zustand state management

public/               — Static assets

deploy/               — Deployment configs (systemd, nginx)
scripts/              — Build helpers
Dockerfile            — Container build (alternative to deploy.sh)
```

---

## Production Build Notes

Next.js is configured with `output: 'standalone'` in `next.config.ts`. The standalone build produces a self-contained server at `.next/standalone/server.js`, but it does NOT include static assets. The deploy script handles this:

1. `npm run build` — produces `.next/standalone/` and `.next/static/`
2. Copy `.next/static/` → `.next/standalone/.next/static/`
3. Copy `public/` → `.next/standalone/public/`
4. Systemd runs `.next/standalone/server.js`

If static assets 404 in production, the copy step was missed.

---

## Common Tasks

**Add a new page:** Create `src/app/<route>/page.tsx`. Next.js App Router handles routing automatically.

**Add a new API call:** Add typed function in `src/lib/api/*.ts`, use it in components. All API calls go through the proxy middleware.

**Change chat behavior:** The streaming logic is in `src/hooks/use-chat-stream.ts`. The chat UI is in `src/components/chat/chat-view.tsx`.

**Change the sidebar:** `src/components/sidebar.tsx` handles project/chat navigation.

**Add a UI component:** Shared primitives go in `src/components/ui/`. Feature components go in `src/components/`.

**Debug streaming issues:** Use browser DevTools Network tab to inspect the `/v1/chats/:id/run` fetch response. Check the `use-chat-stream.ts` hook for parsing logic.

---

## Sibling Repos

- **API** — https://github.com/starbotcorp/api — Fastify backend on port 3737
- **WebGUI** — https://github.com/starbotcorp/webgui — This Next.js frontend
- **TUI** — Rust CLI client at `/home/stella/projects/starbot/Starbot_TUI`
- **Monorepo** (reference) — `/home/stella/projects/starbot`
