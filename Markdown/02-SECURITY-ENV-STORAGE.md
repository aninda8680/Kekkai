# CLOAK-ENV — Security Model & Secure `.env` Storage

This is the single most important document in the project. Every implementation decision should be
checked against it before being merged.

## 1. Threat model summary

| Attacker capability | Must NOT result in |
|---|---|
| Full read access to the PostgreSQL database | Plaintext secret values, plaintext passwords, or the unwrapped master key |
| Full read access to application logs | Any secret value, access token, refresh token, or password |
| A stolen/leaked API access token | Standing access beyond the token's short TTL; no refresh without the paired refresh token |
| A compromised frontend build (XSS) | Ability to read another user's secrets, or the current user's secrets via a hidden dashboard endpoint |
| A malicious/compromised project member with VIEWER role | Any secret plaintext, ever |
| Network interception | Anything, because TLS 1.2+ is mandatory everywhere, including CLI↔API |
| Brute-forcing `/auth/login` | Success, because of Argon2id cost + rate limiting + lockout |

## 2. Envelope encryption (v1 production model)

```
                    ┌─────────────────────────────┐
                    │   Key Encryption Key (KEK)    │
                    │   lives in KMS / HSM, never    │
                    │   stored in Postgres, never    │
                    │   logged, rotated periodically │
                    └───────────────┬────────────────┘
                                    │ wraps / unwraps
                                    ▼
                    ┌─────────────────────────────┐
                    │  Data Encryption Key (DEK)     │
                    │  one per Project (or per        │
                    │  Environment for tighter blast   │
                    │  radius), stored ENCRYPTED        │
                    │  (wrapped) in Postgres             │
                    └───────────────┬────────────────┘
                                    │ encrypts / decrypts
                                    ▼
                    ┌─────────────────────────────┐
                    │  AES-256-GCM per secret value  │
                    │  unique nonce per encryption op │
                    │  auth tag stored alongside       │
                    └─────────────────────────────────┘
```

Why a DEK per project instead of one global key: **blast radius**. If one DEK is ever compromised
(bug, insider, misconfigured backup), only that project's secrets are exposed — not the whole
platform. Rotating a compromised DEK means re-wrapping it under a new KEK and re-encrypting only
that project's secret values, not every customer's.

### What actually sits in a `SecretVersion` row

```
secret_version
├── id
├── secret_id
├── version            (monotonic per secret)
├── ciphertext          (base64, AES-256-GCM output)
├── nonce                (12 bytes, unique per encryption)
├── auth_tag              (16 bytes, GCM tag — tamper-evidence)
├── kek_version            (which KEK wrapped the DEK used — enables rotation)
└── created_at
```

Nothing in that row is useful without the unwrapped DEK, and the DEK is nowhere near the row.

## 3. Zero-knowledge mode (v2, opt-in per project)

For users who want the strongest guarantee — "even CLOAK-ENV's own operators can't read my secrets" —
offer a project-level toggle:

```
 User password / passphrase
        │  Argon2id (client-side, WASM)
        ▼
 Key-derivation → local encryption key
        │  never transmitted
        ▼
 Encrypts the project's DEK client-side before it ever reaches the API
        │
        ▼
 Server stores only: wrapped(DEK) + ciphertext(secrets)
 Server can never unwrap the DEK — it doesn't have the passphrase-derived key
```

Trade-off to document loudly in the product UI: **if the user forgets their vault passphrase and
has no recovery code saved, their secrets for that project are permanently unrecoverable.** This is
the correct trade-off for zero-knowledge systems (see 1Password, EnvKey) — don't build a "secret
backdoor recovery" because that silently defeats the whole model. Instead:
- Generate a one-time **recovery code** at project creation, shown once, user must confirm they
  saved it (same UX pattern as crypto wallet seed phrases).
- Optionally support **admin/owner-escrow re-encryption**: an OWNER can add a new member's public
  key to the wrapped-DEK envelope without ever seeing the DEK in plaintext, using per-user
  asymmetric wrapping (X25519) in addition to the passphrase wrap.

Ship v1 with server-side envelope encryption (§2) only. Ship zero-knowledge as an explicit, clearly
labeled v2 feature — don't half-implement it, since a broken zero-knowledge claim is worse than not
claiming it.

## 4. Why the dashboard must never return plaintext — enforced, not hidden

You asked specifically: *dashboard env values should never be visible, only in CLI.* Implement this
as a **capability the API simply does not expose to the web session type**, not a UI toggle:

```
Token type: "web_session"   → GET /api/secrets/:id/reveal  →  403 Forbidden (route rejects this
                                                                  token type outright)
Token type: "cli_device"    → GET /api/secrets/:id/reveal  →  200, ciphertext returned for
                                                                  local decryption
```

Concretely:
- Issue two distinct token types at login: a **web session token** (short TTL, browser-only, tied
  to a `token_type: "web"` claim) and a **CLI device token** (issued only via `cloak-env login`'s
  device flow, `token_type: "cli"`).
- The `/secrets/:id/reveal` and `/sync/pull` endpoints check `token_type === "cli"` **before**
  checking anything else — a compromised web session simply cannot call the reveal path, full stop,
  regardless of frontend code.
- The web dashboard only ever calls `GET /api/secrets` (metadata: key name, created/updated,
  version count, last accessed by whom) — never a value-bearing endpoint. There is no "Reveal"
  button in the dashboard at all, because there is no server route for the browser to call.
- Dashboard shows `••••••••` permanently, with `Copy CLI command` instead of `Copy value` — e.g.
  `cloak-env get JWT_SECRET --env production`, which requires the user to run it in an authenticated
  terminal session, and that access is itself audit-logged.

This is meaningfully stronger than "hide the value until clicked," because it removes an entire
class of frontend-compromise and shoulder-surfing risk, and it gives you a very clean product
story: **"secrets never render in a browser, period."**

## 5. Password & token handling

- Passwords: Argon2id, memory cost ≥ 19 MiB, iterations ≥ 2, parallelism ≥ 1 (tune to server specs;
  never fall back to bcrypt/scrypt "for simplicity").
- Access tokens: JWT, 10–15 minute TTL, signed with a dedicated signing key (not the encryption
  KEK — never reuse keys across purposes).
- Refresh tokens: opaque random tokens (not JWTs), stored hashed in DB, rotated on every use
  (refresh-token rotation with reuse detection — if a rotated-out token is replayed, revoke the
  entire session family immediately, it's a strong signal of theft).
- CLI device auth: a device-code flow (`cloak-env login` opens a browser, user approves in the
  dashboard, CLI polls for the resulting device token) rather than the CLI ever handling the raw
  password — this is what GitHub CLI and Doppler both do, for good reason.

## 6. Defense-in-depth checklist (must all be true before "production ready")

```
[ ] TLS everywhere, HSTS enabled, no HTTP fallback
[ ] Secrets encrypted at rest with per-project DEK, DEK wrapped by KMS-held KEK
[ ] No secret value ever appears in: logs, error messages, analytics events, URLs, audit logs
[ ] Dashboard has zero routes capable of returning secret plaintext
[ ] Rate limiting: separate stricter limits on /auth/*, /cli/auth, /secrets/*/reveal
[ ] Refresh-token rotation with reuse detection
[ ] RBAC checked server-side on every request, never trusting client-supplied IDs
[ ] Argon2id for passwords, AES-256-GCM for secrets, unique nonce per encryption
[ ] Audit log is append-only (DB-level: no UPDATE/DELETE grants on audit_log table)
[ ] Dependency & container image scanning in CI (npm audit / Snyk / Trivy)
[ ] Automated secret-scanning on the CLOAK-ENV repo itself (ironic but essential — e.g. gitleaks)
[ ] Backups of the ciphertext DB are themselves encrypted; KEK backup procedure is documented
    and access-controlled separately from DB backup access
[ ] Incident response doc: what happens if the KEK is suspected compromised (full re-encryption
    runbook, not theoretical)
[ ] Penetration test / at minimum a structured self-audit against OWASP ASVS before public launch
```
