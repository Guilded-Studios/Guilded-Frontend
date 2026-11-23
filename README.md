# Guilded Frontend

The web client for **Guilded**, a community and communication platform by Guilded Studios.

Built alongside [Guilded Backend](https://github.com/Guilded-Studios/Guilded-Backend), with a familiar community-chat layout, a distinct Guilded visual identity, and selectable dark and light themes.

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
| Variable | Description | Default |
| --- | --- | --- |
| `VITE_API_URL` | Guilded Backend API base URL | `http://localhost:4000/api/v1` |

Only public configuration belongs in `VITE_*` variables. Never put database credentials or server secrets in frontend environment variables.

## Current status
The initial shell includes server and channel navigation, a chat view, a member list, a local demo message composer, and a persistent light/dark theme toggle. Sample content is placeholder data; authentication and live backend integration are upcoming.
