# 🛡️ CLOAK-ENV (結界)

> **Zero-Trust Developer Secret Vault & Environment Synchronization Engine**  
> Plaintext secrets live exclusively in developer memory and local files. Envelope-encrypted with AES-256-GCM + Master KEK at rest and in transit.

---

## ⚡ CLI Authentication (GitHub-Style Device Flow)

CLOAK-ENV CLI uses a seamless, browser-based **OAuth 2.0 Device Authorization Grant (RFC 8628)** flow inspired by the GitHub CLI (`gh auth`). No passwords or plaintext credentials ever touch your terminal process.

```
       Terminal                                     Browser
 ┌──────────────────┐                         ┌──────────────────┐
 │ cloak-env auth login│                         │ /login/device    │
 └────────┬─────────┘                         └────────┬─────────┘
          │                                            │
          │ 1. Request user code & verification URL    │
          │ ─────────────────────────────────────────► │
          │    User Code: ABCD-EFGH                    │
          │                                            │
          │ 2. Opens browser automatically             │
          │    (or paste code if --no-browser)         │
          │ ─────────────────────────────────────────► │ User enters code
          │                                            │ & approves login
          │ 3. Polls token endpoint (exponential backoff)
          │ ◄───────────────────────────────────────── │
          │                                            │
          │ 4. Issued short-lived access JWT +         │
          │    rotating refresh token saved securely   │
          ▼                                            ▼
```

---

### New `cloak-env auth` Command Suite

| Command | Options / Flags | Description |
|---|---|---|
| `cloak-env auth login` | `[--no-browser]` `[--local]` `[--host <url>]` | Authenticate with CLOAK-ENV via browser device-code grant |
| `cloak-env auth login --no-browser` | — | Headless / SSH mode: prints verification URL & code without opening browser |
| `cloak-env auth login --local` | — | Connects to local development API (`http://localhost:4000`) |
| `cloak-env auth login --host <url>` | `--host <url>` | Connects to a custom self-hosted CLOAK-ENV instance |
| `cloak-env auth status` | — | Displays active session host, account email, status, and token expiry |
| `cloak-env auth logout` | — | Revokes refresh token server-side and clears local stored credentials |
| `cloak-env auth devices` | — | Lists all registered CLI devices associated with your account |
| `cloak-env auth revoke <id>` | `<id>` | Revokes access for a specific registered CLI device by ID |

---

### Backward Compatibility & Deprecation Matrix

All legacy commands continue to function with a deprecation warning, automatically routing to their modern `cloak-env auth` equivalents:

| Legacy Command (Deprecated) | Modern Command | Status | Behavior |
|---|---|---|---|
| `cloak-env login` | `cloak-env auth login` | ⚠ Deprecated | Emits `⚠ cloak-env login is deprecated. Use: cloak-env auth login` and launches device login |
| `cloak-env logout` | `cloak-env auth logout` | ⚠ Deprecated | Emits `⚠ cloak-env logout is deprecated. Use: cloak-env auth logout` and revokes session |
| `cloak-env whoami` | `cloak-env auth status` | ⚠ Deprecated | Emits `⚠ cloak-env whoami is deprecated. Use: cloak-env auth status` and prints account status |

---

### Command Walkthrough & Examples

#### 1. Standard Interactive Login
Automatically opens your browser to the verification page and awaits approval:
```bash
$ cloak-env auth login

CLOAK-ENV Authentication

First, copy your one-time code:

   RWMX-NZ5A

Opening:
  https://cloak-env.vercel.app/login/device

⠇ Waiting for authentication...
✔ Authentication successful.

Logged in as dev@cloak-env.io
```

#### 2. Headless / SSH / Remote Container Mode (`--no-browser`)
Ideal for headless servers, Docker containers, or remote SSH sessions where no GUI browser is present:
```bash
$ cloak-env auth login --no-browser

CLOAK-ENV Authentication

First, copy your one-time code:

   ABCD-EFGH

Open this URL in your browser:

  https://cloak-env.vercel.app/login/device

Enter the code above when prompted.

⠇ Waiting for authentication...
✔ Authentication successful.

Logged in as dev@cloak-env.io
```

#### 3. Local Development (`--local`)
Targets the local development API (`http://localhost:4000`) and local frontend verification page (`http://localhost:3000/login/device`):
```bash
$ cloak-env auth login --local

Connecting to http://localhost:4000...

CLOAK-ENV Authentication

First, copy your one-time code:

   K9PL-2M4Q

Opening:
  http://localhost:3000/login/device

⠇ Waiting for authentication...
✔ Authentication successful.

Logged in as local-dev@cloak-env.io
```

#### 4. Checking Session Status (`cloak-env auth status`)
Inspects active connection, logged-in account, and token lifetime:
```bash
$ cloak-env auth status

CLOAK-ENV Authentication

Host       https://api.cloak-env.io
Account    dev@cloak-env.io
Status     Authenticated
Expires    in 14 minutes
```
*(When your access token expires, the CLI automatically and transparently rotates it using your stored refresh token on the next command.)*

#### 5. Listing & Revoking CLI Devices
Audit and manage all machines authorized under your account:
```bash
$ cloak-env auth devices

CLOAK-ENV CLI Devices

1. MacBook Pro (Work)
   Last used: 10/2/2026, 8:45:10 PM
   IP: 198.51.100.24
   ID: cly01a2b3c4d5e6f7g8h9j0k1

2. ThinkPad Linux (Personal)
   Last used: 10/1/2026, 11:20:00 AM
   IP: 203.0.113.42
   ID: cly98z7y6x5w4v3u2t1s0r9q8

To revoke a device: cloak-env auth revoke <device-id>
```

To immediately revoke a compromised or decommissioned machine:
```bash
$ cloak-env auth revoke cly98z7y6x5w4v3u2t1s0r9q8
✔ Device cly98z7y6x5w4v3u2t1s0r9q8 revoked.
```

#### 6. Logging Out (`cloak-env auth logout`)
Revokes the refresh token on the server and scrubs local credentials:
```bash
$ cloak-env auth logout
✔ Logged out successfully.
```

---

## 🔒 Security Architecture Highlights

1. **RFC 8628 OAuth 2.0 Device Grant**:
   - Human-friendly user codes (`XXXX-XXXX`) with 15-minute expiry.
   - Device codes are SHA-256 hashed before storage; the raw code exists only in memory on the requesting CLI.
   - Polling uses server-directed intervals with `slow_down` rate-limit backoff.
   - Atomic single-use code consumption prevents race conditions.
2. **Rotating Refresh Tokens & Reuse Detection**:
   - Each refresh exchange issues a new token pair and revokes the prior refresh token.
   - If an invalidated refresh token is replayed, the entire session family is revoked immediately.
3. **Local Credential Storage**:
   - Persisted to `~/.cloak-env/config.json` with strict `0600` POSIX permissions (owner read/write only).
   - Host configuration and token state are decoupled to prevent accidental host leakage.
4. **Envelope Encryption for Secrets**:
   - Secrets are encrypted with unique DEKs (Data Encryption Keys) using AES-256-GCM.
   - DEKs are encrypted using a 256-bit Master KEK managed outside the primary application database.
   - Web frontend never receives plaintext secrets.

---

## 🚀 Complete CLI Command Reference

### Secret Management
```bash
cloak-env init                 # Link directory to a project & environment
cloak-env push                 # Push local .env changes with interactive diff preview
cloak-env pull                 # Pull vault secrets into local .env (--dry-run supported)
cloak-env run -- <command>     # Inject secrets into process memory without writing to disk
cloak-env status               # Inspect project link, environment, and secret drift
cloak-env diff                 # Compare local .env against remote vault
cloak-env set <KEY>            # Interactively set or update a single secret
cloak-env get <KEY>            # Decrypt and display one secret (--copy for clipboard)
cloak-env unset <KEY>          # Delete a secret from the vault
cloak-env list                 # List tracked secret keys (values masked)
cloak-env history <KEY>        # Audit version history of a secret
cloak-env rollback <KEY> -v N  # Revert a secret to a specific version
```

### Environment & Diagnostics
```bash
cloak-env env list             # List available environments (development, staging, prod)
cloak-env env switch <name>    # Switch active local environment
cloak-env projects             # List accessible projects
cloak-env doctor               # Verify .gitignore, credentials, drift, and directory hygiene
cloak-env scan                 # Detect untracked plaintext secrets in local codebase
cloak-env audit                # Stream immutable audit log of secret access
```

---

## 🛠️ Local Development Setup

Clone the repository and spin up PostgreSQL, Redis, API, and Web dashboard:

```bash
# Install dependencies
npm install

# Start Docker containers (PostgreSQL + Redis) and launch dev servers
npm run dev:all
```

- **Web Dashboard**: [http://localhost:3000](http://localhost:3000)
- **API Server**: [http://localhost:4000](http://localhost:4000)
- **Prisma Studio**: [http://localhost:5555](http://localhost:5555) (`npx prisma studio`)

Authenticate your local CLI:
```bash
npx cloak-env auth login --local
```

---

## 📄 License

MIT © [CLOAK-ENV](https://cloak-env.vercel.app)
