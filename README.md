# Que-swer — NEHU Q&A + Previous-Year Papers

A campus-wide Questions & Answers platform for NEHU, with a browsable previous-year
paper library. Rebuilt from the static prototype as a full PERN stack application.

## Stack

| Layer    | Tech                                                                                                     |
| -------- | -------------------------------------------------------------------------------------------------------- |
| Frontend | React 18, Vite, TypeScript, TanStack Query, React Hook Form + Zod, Tailwind CSS, GSAP + Lenis            |
| Backend  | Node.js, Express 5, TypeScript, Zod, pino, Helmet, express-rate-limit                                    |
| Database | PostgreSQL 15+, Prisma ORM                                                                               |
| Auth     | JWT access + rotating refresh token (httpOnly cookie), argon2/bcrypt, roles: student / moderator / admin |
| Test     | Vitest + Supertest                                                                                       |

## Repo layout

```
.
├── client/          # React frontend (phase 3+)
├── server/          # Express API
│   ├── prisma/      # schema.prisma, migrations, seed.ts, import-papers.ts
│   ├── src/
│   │   ├── config/  # env, db, logger
│   │   ├── lib/     # AppError, asyncHandler
│   │   ├── middleware/ # auth, validate, rateLimit, error
│   │   ├── routes/  # feature routers (auth, questions, answers, papers, ...)
│   │   ├── utils/   # jwt, tokens, storage, pagination
│   │   ├── app.ts
│   │   └── index.ts
│   └── tests/       # Vitest + Supertest
└── docs/superpowers/specs/  # design doc
```

## Prerequisites

- Node.js 20+ (developed on Node 24)
- PostgreSQL 15+ running locally (or a connection URL)

## Setup

```bash
# 1. Install dependencies (root installs server + client workspaces)
npm install

# 2. Configure environment
cp server/.env.example server/.env
#    edit server/.env — at minimum DATABASE_URL and JWT secrets

# 3. Create the database (local Postgres)
createdb que_swer            # or create via your tooling

# 4. Migrate + seed
npm run db:migrate           # runs prisma migrate dev
npm run db:seed              # admin/moderator + demo content

# 5. Import the legacy scanned papers (from NEHU/NEP/...)
npm run db:import

# 6. Start the API
npm run dev:server           # http://localhost:4000
```

Seed accounts: `admin@que-swer.app` / `mod@que-swer.app` — password `Password123!`.

## API overview

All endpoints under `/api/v1`. See `server/src/routes/` for the full surface;
highlights:

| Area       | Endpoints                                                                                            |
| ---------- | ---------------------------------------------------------------------------------------------------- |
| Auth       | `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `GET /auth/me`                |
| Questions  | `GET/POST /questions`, `GET/PATCH/DELETE /questions/:id`, `GET/POST /questions/:id/answers`          |
| Answers    | `PATCH/DELETE /answers/:id`, `POST /answers/:id/accept`, comments on answers                         |
| Votes      | `POST/DELETE /votes/:itemType/:itemId` (QUESTION \| ANSWER)                                          |
| Search     | `GET /search?q=&type=questions\|papers\|users` (full-text, highlighted)                              |
| Papers     | `GET /papers`, `GET /papers/:id`, `GET /papers/:id/files/:pageNo`, `POST /papers` (mod/admin upload) |
| Users      | `GET /users/:username`, `PATCH /users/@me`, bookmarks, activity, admin user management               |
| Moderation | `POST /reports`, `GET/PATCH /reports` (mod/admin), `GET/PATCH /messages` (admin)                     |
| Catalog    | `GET /departments`, `/departments/:slug`, `/courses`, `/tags`                                        |
| Health     | `GET /health`                                                                                        |

Common list query params: `page`, `pageSize`, `sort` (per-route allowed values).

## Testing

```bash
cd server
createdb que_swer_test                       # one-time
npm run db:deploy                            # apply migrations to test DB
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/que_swer_test?schema=public npm test
# (tests run against TEST_DATABASE_URL, defaulting to que_swer_test)
```

## Deployment (planned — Phase 6)

Render web service + managed Postgres (Neon). Full guide lands in Phase 6; the
server reads everything from env vars (`server/.env.example` documents all keys
with S3-compatible storage for paper uploads in production).

## Phases

1. ✅ Audit + migration map (docs/superpowers/specs/2026-11-18-que-swer-design.md)
2. ✅ Schema, migrations, seed + import, API with auth + tests
3. 🔄 Design system, layout, routing, auth screens, core Q&A pages (awaiting OK)
4. ⏳ Motion system (Lenis, preloader, hero, page transitions)
5. ⏳ Micro-interactions, feed animations, dashboard polish, theme toggle
6. ⏳ A11y, reduced-motion, performance, SEO, README, deployment guide
