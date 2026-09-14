# Codeathon

Initial project setup for a 4-person college codeathon team. This repository is intentionally simple so the team can start fast once the problem statement is released.

## Stack

- `apps/web`: Vite frontend with plain TypeScript
- `apps/api`: Node.js HTTP API with no runtime framework dependencies
- npm workspaces from the repository root

## Project Structure

```text
.
├── apps
│   ├── api
│   │   ├── src
│   │   │   ├── app.js
│   │   │   └── server.js
│   │   ├── test
│   │   │   └── health.test.js
│   │   └── package.json
│   └── web
│       ├── src
│       │   ├── main.ts
│       │   └── styles.css
│       ├── index.html
│       ├── package.json
│       └── tsconfig.json
├── .env.example
├── .gitignore
└── package.json
```

## Team Workflow

- Person 1: frontend UI and user flows in `apps/web`
- Person 2: backend routes and integrations in `apps/api`
- Person 3: data models, validation, and API contracts
- Person 4: testing, deployment, docs, and demo polish

Keep feature branches small and merge often. Do not commit real `.env` files or secrets.

## Setup

Requirements:

- Node.js 20 or newer
- npm 10 or newer

Install dependencies:

```bash
npm install
```

Create local environment files as needed:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

## Development

Run the API in one terminal:

```bash
npm run dev:api
```

Run the frontend in another terminal:

```bash
npm run dev:web
```

Default local URLs:

- Frontend: `http://localhost:5173`
- API health check: `http://localhost:4000/health`

## Verification

Run all tests:

```bash
npm test
```

Build all apps:

```bash
npm run build
```

## Notes

- The frontend reads `VITE_API_BASE_URL` and falls back to `http://localhost:4000`.
- The backend uses only built-in Node.js modules for now. Add dependencies only when the problem statement needs them.
