# Que-swer — NEHU Q&A + PYQ Platform: Design

**Date:** 2026-11-18 · **Status:** Approved in conversation (phase 1 gate) · **Repo:** `silv3r1224-ops/Que-swer`

## Intent & Why

Replace the static NEHU question-paper site with a campus-wide platform: students ask and
answer questions, browse previous-year papers, and build reputation. The why: the current
site is broken (dead links, missing pages, placeholder data) and can't grow — no auth, no
data layer, no way to add papers without editing JS.

## Goals / Non-goals / Anti-goals

- **Goals:** Working Q&A with PK, reputation, notifications, moderation; browsable PYQ
  library with in-app uploads ( search; premium motion-rich frontend (GSAP/Lenis); deployable
  to Render + Neon with a single command.
- **Non-goals:** Email notifications; bilingual UI; native apps; real-time collaboration
  beyond notifications.
- **Anti-goals:** Shippable with dead links; JS-animation-dependent navigation; anything
  slower than 60fps; data loss on migration.

## Constraints (agreed with user)

| Constraint    | Value                                                                    |
| ------------- | ------------------------------------------------------------------------ |
| Scope         | Full Q&A + PYQ library                                                   |
| Existing data | 32 JPG scans (2024 Sem 3 B.Sc) — import; rest added via in-app upload UI |
| Registration  | Open public, roles: student / moderator / admin                          |
| Scale         | Campus-wide (thousands)                                                  |
| Deploy        | Render + managed Postgres (Neon)                                         |
| Notifications | In-app only                                                              |
| Language      | English only                                                             |

## Stack (chosen — do not substitute without asking)

- **DB:** PostgreSQL + Prisma ORM (migrations + seed).
- **API:** Node.js + Express + TypeScript, REST under `/api/v1`. Zod validation, centralized
  error handler, async wrapper. pino logging. Helmet, CORS allow-list, rate limiting on auth
  and write routes, parameterized queries only, `.env.example`, no secrets in repo.
  Pagination/filter/sort on all lists; full-text search (tsvector + GIN) with ranking +
  highlighting.
- **Auth:** email/password, argon2; short-lived JWT access + rotating refresh token in
  httpOnly/secure/sameSite cookie. Roles: student, moderator, admin.
- **Frontend:** React 18 + Vite + TS, React Router, TanStack Query, RHF + Zod, Tailwind +
  custom design-token layer.
- **Monorepo:** `client/`, `server/`, `shared/`. ESLint + Prettier + husky. README with
  setup steps.
- **Motion:** GSAP + ScrollTrigger, SplitText, Flip, @gsap/react; Lenis; motion tokens;
  reduced-motion + touch fallbacks; transform/opacity/clip-path only.

## Data model (Prisma)

Users, Roles (enum), Departments, Courses, Questions, Answers, Comments, Votes (unique per
user per item), Tags + QuestionTags, Bookmarks, Notifications, Reports (moderation), AuditLog,
Papers/PaperPages (PYQ library; uploads reference object storage paths). Indexes on
department, course, created_at, score, tsvector.

## Approaches considered

1. **Full PERN greenfield rebuild** (chosen) — best fit for the brief; everything is
   backward-compatible with the static site's content once imported.
2. **Keep static + bolt on backend** — rejected: still leaves duplicated HTML, no motion/DX,
   poor growth.
3. **Next.js full-stack** — rejected by brief; Express API keeps separation the user asked for.

## Legacy → new mapping

See audit in `migration-map.md` (same folder). Short form: static pages → React routes;
`science.js` data → Postgres + API; broken arts/commerce → real data-driven streams;
`searchPapers()` → full-text API; contact form → messages inbox for admins; no auth →
JWT + roles; scans → object storage (local disk in dev) + import script.

## Deliverables by phase (stop + summarize after 1 & 3)

1. Audit + migration map + questions — **done**.
2. Schema, Prisma migrations, seed + import script, API with auth + tests.
3. Design system, layout shell, routing, auth screens, core Q&A pages wired to API —
   **wait for user OK**.
4. Motion system (Lenis, preloader, hero, scroll storytelling, page transitions).
5. Micro-interactions, feed animations, dashboard polish, theme toggle.
6. A11y, reduced-motion, performance, SEO, README, deployment guide.

## Builder calls (minor decisions settled here)

- `shared/` package holds zod schemas + types shared client/server.
- Papers stored as files under `server/storage/papers/**` in dev (served via `/api/v1/papers/.../file`); production plan: S3-compatible bucket via env var (documented in Phase 6).
- Search: `search_vector tsvector` column + GIN index; ranking via `ts_rank`; highlight via `ts_headline`.
- Contact form → `Message` table surfaced in an admin inbox route.
- Seed: one admin + moderator account, demo departments/courses, the 32 imported scans.
