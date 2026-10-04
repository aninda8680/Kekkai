# CLOAK-ENV — Production Architecture & Data Flow

## 1. System map

```
                                   ┌──────────────────────────┐
                                   │        End Users         │
                                   └────────────┬──────────────┘
                    ┌───────────────────────────┼───────────────────────────┐
                    ▼                           ▼                           ▼
           ┌────────────────┐         ┌──────────────────┐        ┌────────────────┐
           │  cloak-env-web     │         │   cloak-env CLI      │        │  Future: IDE /  │
           │  (Next.js)      │         │  (Node.js/TS)      │        │  CI/CD plugins  │
           │  dashboard only │         │  push/pull/run     │        │                 │
           │  NO plaintext   │         │  full plaintext    │        │                 │
           └────────┬────────┘         └─────────┬──────────┘        └────────┬────────┘
                    │  HTTPS + JWT               │  HTTPS + device token       │
                    └───────────────┬────────────┴──────────────┬─────────────┘
                                     ▼                           ▼
                          ┌──────────────────────────────────────────┐
                          │           cloak-env-api (Express/TS)         │
                          │  ┌────────────┐ ┌────────────┐           │
                          │  │   Auth      │ │  RBAC /     │          │
                          │  │  (JWT+refr) │ │ Authorization│          │
                          │  └────────────┘ └────────────┘           │
                          │  ┌────────────┐ ┌────────────┐           │
                          │  │ Secret Svc  │ │ Audit Svc   │          │
                          │  │ (envelope   │ │ (immutable  │          │
                          │  │  encryption)│ │  log)       │          │
                          │  └─────┬──────┘ └─────┬───────┘          │
                          └────────┼──────────────┼──────────────────┘
                                   ▼              ▼
                     ┌───────────────────┐  ┌──────────────────┐
                     │   PostgreSQL       │  │  KMS / Master Key │
                     │  ciphertext only   │  │  (outside DB)     │
                     └───────────────────┘  └──────────────────┘
```

**Non-negotiable rule baked into this diagram:** the web dashboard and the API talk to each other
over the same authenticated channel as the CLI, but the **dashboard route that would return secret
plaintext simply does not exist** on the API. That's not a frontend hide-the-eye-icon trick — see
`02-SECURITY-ENV-STORAGE.md` §4 for why this has to be enforced server-side.

## 2. Request-level trust boundaries

```
 Browser (cloak-env-web)                CLI (cloak-env)                    API (cloak-env-api)
 ─────────────────────               ─────────────                  ─────────────────
 • Session cookie (httpOnly,         • Device-bound refresh          • Verifies JWT signature
   Secure, SameSite=Strict)            token in ~/.cloak-env/config      + expiry on every request
 • Short-lived access JWT              (0600 perms, never in repo)  • Re-derives project/env
   in memory only, never in           • Short-lived access token       membership from DB —
   localStorage                        refreshed transparently         NEVER trusts client-sent
 • CSRF token on state-changing       • Talks HTTPS only               projectId/role claims
   requests                                                          • Emits audit event for
                                                                        every read/write
```

## 3. End-to-end secret lifecycle (push → store → pull/run)

```
 Dev machine                     CLOAK-ENV API                      PostgreSQL / KMS
 ───────────                     ──────────                      ────────────────
 .env (plaintext,
 local only)
     │
     │ cloak-env push
     ▼
 Read + parse .env
 Validate keys (regex,
 size limits, forbidden
 patterns)
     │
     │ Fetch project Data
     │ Encryption Key (DEK)
     │◄───────────────────────── DEK unwrapped using KEK
     │                            (KMS call, never persisted
     │                             unwrapped)
     ▼
 AES-256-GCM encrypt
 each value locally
 with per-secret nonce
     │  HTTPS, ciphertext +
     │  nonce + auth tag only
     ▼
                          ──────►  Verify auth + membership
                                   Store {ciphertext, nonce,
                                   auth_tag, version++} per key
                                   Write AUDIT_LOG:
                                   "SECRET_CREATED key=JWT_SECRET"
                                   (never the value)
                                                     │
                                                     ▼
                                              PostgreSQL row
                                              (ciphertext only)

 cloak-env pull / cloak-env run
     │  HTTPS request for
     │  environment secrets
     ▼
                          ──────►  Verify auth + membership
                                   Fetch ciphertext rows
                                   Unwrap DEK via KMS
                                   Return ciphertext (NOT
                                   plaintext — see note)
     │◄──────────────────────────
 Decrypt locally with
 unwrapped DEK
     │
     ├─ pull → write .env (0600, gitignore-checked)
     └─ run  → inject into child_process.env only,
               never touches disk
```

> **Design note:** In the *v1* model the API unwraps the DEK server-side and could technically
> decrypt — this is documented and accepted as the v1 trust model (server-side envelope
> encryption). In the **v2 zero-knowledge mode** (see `00-FEASIBILITY.md` §4 and the phased plan),
> the DEK itself is wrapped with a key derived from the user's password/passphrase, so the server
> only ever forwards ciphertext it cannot open. Never blur these two modes together in the docs or
> the UI — tell the user plainly which mode a given project is in.

## 4. Environments / projects / secrets hierarchy

```
User
 └── ProjectMember (role: OWNER | ADMIN | DEVELOPER | VIEWER)
      └── Project
           └── Environment (development | staging | production | custom)
                └── Secret (key)
                     └── SecretVersion (ciphertext, nonce, auth_tag, version N)
```

## 5. Deployment topology (production)

```
                    ┌─────────────┐
   Users ─────────► │  Vercel      │  cloak-env-web (Next.js, edge-cached static,
                    │  (frontend)  │  API calls proxied to backend over HTTPS)
                    └──────┬───────┘
                           │ HTTPS
                    ┌──────▼───────┐        ┌───────────────┐
   CLI ───────────► │  Render/      │◄──────►│ KMS (cloud KMS │
                    │  Railway      │        │ or self-hosted │
                    │  (cloak-env-api) │        │ Vault Transit) │
                    └──────┬───────┘        └───────────────┘
                           │ TLS, connection pooling (pgbouncer)
                    ┌──────▼───────┐
                    │  Neon/Supabase│
                    │  PostgreSQL   │
                    │  (encrypted   │
                    │  at rest,     │
                    │  PITR backups)│
                    └───────────────┘
```

Key production requirements layered onto the original plan:
- **Separate the master key from the app.** The KEK must live in a managed KMS or a secrets
  facility the API process reads at boot, never in the same Postgres instance as ciphertext, and
  never in a `.env` committed anywhere.
- **Connection pooling** (pgbouncer/Prisma Accelerate) for Neon/Supabase under real concurrent CLI
  traffic.
- **Separate rate-limit tiers** for `/auth/*`, `/cli/*`, and `/secrets/*` — brute-force and scraping
  attempts target these differently.
- **Blue/green or canary deploys** for the API specifically because a bad deploy here can mean
  secret unavailability for every connected project — treat this service with the same care as a
  database migration.
