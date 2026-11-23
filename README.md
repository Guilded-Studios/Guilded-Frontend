# Guilded Frontend

The web client for **Guilded**, a community and communication platform by Guilded Studios.

## Stack
- React 18 + TypeScript
- Vite
- Lucide icons
- Responsive custom CSS

## Getting started
Requirements: Node.js 22+ and pnpm 9+.

```bash
pnpm install
cp .env.example .env
pnpm dev
```

## Environment
`VITE_API_URL` is the public Guilded Backend API base URL (defaults to `http://localhost:4000/api/v1`). Never put database credentials, signing secrets, or other server-only secrets in frontend environment variables.

## Implemented
- Registration, login, session restoration, and logout using the backend HTTP-only session cookie
- Server listing, creation, invite-code joining, server overview, and channel creation
- Channel message history and sending messages through the backend API
- Profile display-name updates
- Responsive dark/light theme with persistent preference

## Not implemented yet
Direct messages, discovery/search, uploads, voice/video, notifications, presence, server member listing, role management, and realtime message updates require additional backend endpoints and/or websocket integration. These are not presented as live features.
