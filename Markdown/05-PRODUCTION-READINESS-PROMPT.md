# KEKKAI — Production Readiness Implementation Prompt

Paste this whole document (or hand the repo + this file) to Claude Code / your implementation agent
as the working brief. It assumes the current state described in the "Implementation Status Report"
(monorepo scaffolded, Prisma schema drafted, auth + login CLI command working, dashboard/login/
dashboard pages started, `init/push/pull/run` scaffolded but not wired).

---

## Context to give the agent

> You are working on KEKKAI, a developer secret-vault platform (monorepo: `apps/api`,
> `apps/kekkai-web`, `packages/cli`, `packages/shared`, Prisma + PostgreSQL). Read
> `00-FEASIBILITY.md`, `01-ARCHITECTURE.md`, `02-SECURITY-ENV-STORAGE.md`, `03-CLI-REFERENCE.md`,
> and `04-FRONTEND-UX.md` in full before writing any code — they are the spec. Security decisions
> in `02-SECURITY-ENV-STORAGE.md` are non-negotiable; if a request would conflict with them
> (e.g. "just add a reveal button to the dashboard"), flag the conflict instead of silently
> implementing it.

## Definition of "production ready" for this project

Not "feature complete" — **safe to let a real developer store a real production database URL in
it.** That bar means: correct encryption, correct authorization, no plaintext leakage anywhere it
shouldn't be, and a UX that doesn't tempt users into unsafe habits (like pasting secrets into a
browser).

## Phase 1 — Close the security gaps first (do this before any new feature work)

1. Implement envelope encryption exactly as specified in `02-SECURITY-ENV-STORAGE.md` §2:
   per-project DEK, wrapped by a KEK held outside Postgres (start with an env-var-injected master
   key read at boot from the deployment platform's secret store — Render/Railway secret config —
   and structure the code so swapping in a real KMS later is a one-file change).
2. Implement the **two-token-type model** (§4): `token_type: "web" | "cli"` claim, and make the
   reveal/pull/sync endpoints check it before anything else. Write a test that asserts a web-session
   token gets `403` on every value-returning endpoint.
3. Move the CLI login flow to a device-code flow (browser approval, CLI polling) — do not let the
   CLI process ever hold or transmit a raw password, even once.
4. Implement refresh-token rotation with reuse detection.
5. Wire audit logging into every mutating and every secret-read code path (including `kekkai get`
   and `kekkai pull` — plaintext access should always be traceable). Confirm no code path ever logs
   a secret value or a full Authorization header (add a redacting logger middleware and a test that
   fails CI if a value-shaped string appears in log output during the test suite).
6. Add `.gitleaks.toml` (or similar) and run secret-scanning in CI on the KEKKAI repo itself.

## Phase 2 — Backend: finish the API surface

Implement per `01-ARCHITECTURE.md` §1 and the endpoint list in the original spec, plus:
- `GET /api/secrets` returns **metadata only** (key, version, updated_at, updated_by) — no
  ciphertext, no plaintext — for dashboard consumption.
- `GET /api/secrets/:id/reveal` — CLI-only (token_type check), returns ciphertext + nonce + tag for
  local decryption, or decrypts server-side and returns plaintext over TLS if you're keeping v1's
  server-side-decrypt model (pick one and document it — don't do both inconsistently).
- `POST /api/sync/push`, `POST /api/sync/pull` for the CLI's bulk operations, diffed server-side so
  the CLI's `push` diff preview (see `03-CLI-REFERENCE.md`) has real data to render.
- `GET /api/audit` with pagination and filters (by project, by user, by action type).
- `POST /api/projects/:id/environments/:envId/clone` backing `kekkai clone`.
- Every route: Zod input validation, rate limiting (stricter on `/auth/*` and `/secrets/*/reveal`),
  explicit CORS allow-list (no `origin: "*"`), server-side RBAC check independent of any
  client-supplied project/role claim.

## Phase 3 — CLI: wire the scaffolded commands + add the new ones

- Finish `init`, `push`, `pull`, `run` with the diff-preview / confirmation / `.gitignore`-check
  behavior specified in `03-CLI-REFERENCE.md`.
- Add: `status`, `diff`, `whoami`, `set`, `unset`, `get`, `list`, `history`, `rollback`, `env list`,
  `env create`, `env switch`, `projects`, `project switch`, `clone`, `doctor`, `scan`, `export`,
  `team invite`, `logout`, `audit` — table in `03-CLI-REFERENCE.md` has the full spec for each.
- `kekkai doctor` should be genuinely useful, not decorative: check `.gitignore` coverage, token
  expiry, drift, and network reachability to the API, and print actionable fixes.
- Package for `npm install -g kekkai` with a proper `bin` entry and semantic-versioned releases.

## Phase 4 — Frontend: dashboard + marketing site

- Rebuild the secrets table to **never fetch or render a value-bearing endpoint** — enforce this by
  construction (the frontend API client shouldn't even have a method that calls `/reveal`).
- Implement the masked-value component, "Copy CLI command" action, and version-history timeline
  from `04-FRONTEND-UX.md` §5.
- Add Framer Motion shared-layout transitions for the project → environment → secrets drill-down.
- Add Lenis to the marketing/landing pages only (scope it out of the dashboard's data tables).
- Build the "New Laptop Scenario" scroll-triggered hero sequence and the live animated-terminal hero
  component described in `04-FRONTEND-UX.md` §3.
- Add typed-confirmation modals for destructive actions on `production` environments specifically.
- Respect `prefers-reduced-motion`; keyboard nav + `Cmd+K` command palette for power users.

## Phase 5 — Hardening & launch checklist

Run through the entire checklist in `02-SECURITY-ENV-STORAGE.md` §6 and mark each line off with
evidence (a test, a config diff, or a screenshot of the check passing) before calling this
"production ready." Specifically do not skip:
- The log-redaction test (no secret-shaped string ever appears in stdout/stderr during CI).
- The token-type enforcement test (§4 of the security doc).
- A basic load test on `/sync/pull` and `/sync/push` (these are the CLI's hot paths).
- A documented incident-response runbook for "we think the KEK leaked."

## Phase 6 (v2, don't build yet) — Zero-knowledge mode

Only start this after Phases 1–5 are solid and real users are on the platform. Follow
`02-SECURITY-ENV-STORAGE.md` §3 exactly — client-side key derivation, recovery-code UX modeled on
crypto-wallet seed phrases, and clear, loud UI copy about the "no recovery without your code"
trade-off. Ship it as an explicit opt-in per project, never silently upgrade existing projects into
it.

## Things to explicitly refuse or push back on during implementation

- Any request to add a "reveal in dashboard" button — this contradicts the core security promise;
  point back to `02-SECURITY-ENV-STORAGE.md` §4.
- Any request to log `req.body` wholesale on API routes that touch `/secrets` or `/auth`.
- Any request to put the KEK or a raw DB connection string into a `NEXT_PUBLIC_*` or `VITE_*`
  variable, or into frontend source at all.
- Skipping the diff-preview/confirmation step in `push`/`pull` "to make it faster" — this is the
  exact class of shortcut that causes accidental production-secret overwrites.
