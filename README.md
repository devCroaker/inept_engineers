# Inept Engineers

Event coordination for the Inept Engineers, an SCA household. Camping events, parties, and day
events: what is happening, who is coming, who is cooking, and who owes what for the food buy-in.

Runs at [ineptengineers.com](https://ineptengineers.com).

## Stack

| Layer          | Technology                                                   |
| -------------- | ------------------------------------------------------------ |
| Monorepo       | pnpm workspaces + Turborepo                                  |
| Front end      | Next.js 16 (App Router), React, MUI 9, Tailwind CSS 4, Jotai |
| Auth           | Better Auth with Google and Discord sign-in                  |
| API            | Hono with `@hono/zod-openapi`, deployed as a single Lambda   |
| Contract       | OpenAPI 3.1, generated from Zod schemas                      |
| Database       | PostgreSQL on RDS, Drizzle ORM                               |
| Infrastructure | AWS CDK (TypeScript)                                         |
| CI/CD          | GitHub Actions with OIDC, no static AWS keys                 |

## Repository layout

```
apps/
  web/            Next.js application
  api/            Hono API, Lambda and local server entry points
packages/
  db/             Drizzle schema, migrations, client factory
  api-contract/   Zod schemas that generate the OpenAPI document
  api-client/     Typed client generated from the OpenAPI document
  ui/             Shared MUI theme and components
  config/         Shared ESLint, Prettier, and TypeScript config
infra/            AWS CDK application
```

## Getting started

Requires Node 22 (see `.nvmrc`), pnpm, and Docker.

```bash
nvm use
pnpm install
cp .env.example .env
pnpm db:up          # start local Postgres
pnpm dev            # web on :3000, api on :8787
```

Useful scripts:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm format
```

## Notes on cost

This runs for roughly 18 USD per month, most of which is the RDS instance. The design deliberately
avoids two expensive traps: a NAT Gateway (about 32 USD per month) and an always-on Application
Load Balancer (about 17 USD per month). CI asserts that neither is ever introduced.
