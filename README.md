# 🛡️ KEKKAI (結界)

> **Zero-Trust Developer Secret Vault & Environment Synchronization Engine**  
> Plaintext secrets live exclusively in developer memory and local files. Envelope-encrypted with AES-256-GCM + Master KEK at rest and in transit.

---

## ⚡ CLI Authentication (GitHub-Style Device Flow)

KEKKAI CLI uses a seamless, browser-based **OAuth 2.0 Device Authorization Grant (RFC 8628)** flow inspired by the GitHub CLI (`gh auth`). No passwords or plaintext credentials ever touch your terminal process.

```
       Terminal                                     Browser
 ┌──────────────────┐                         ┌──────────────────┐
 │ kekkai auth login│                         │ /login/device    │
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

### New `kekkai auth` Command Suite

| Command | Options / Flags | Description |
|---|---|---|
| `kekkai auth login` | `[--no-browser]` `[--local]` `[--host <url>]` | Authenticate with KEKKAI via browser device-code grant |
| `kekkai auth login --no-browser` | — | Headless / SSH mode: prints verification URL & code without opening browser |
| `kekkai auth login --local` | — | Connects to local development API (`http://localhost:4000`) |
| `kekkai auth login --host <url>` | `--host <url>` | Connects to a custom self-hosted KEKKAI instance |
| `kekkai auth status` | — | Displays active session host, account email, status, and token expiry |
| `kekkai auth logout` | — | Revokes refresh token server-side and clears local stored credentials |
| `kekkai auth devices` | — | Lists all registered CLI devices associated with your account |
| `kekkai auth revoke <id>` | `<id>` | Revokes access for a specific registered CLI device by ID |

---

### Backward Compatibility & Deprecation Matrix

All legacy commands continue to function with a deprecation warning, automatically routing to their modern `kekkai auth` equivalents:

| Legacy Command (Deprecated) | Modern Command | Status | Behavior |
|---|---|---|---|
| `kekkai login` | `kekkai auth login` | ⚠ Deprecated | Emits `⚠ kekkai login is deprecated. Use: kekkai auth login` and launches device login |
| `kekkai logout` | `kekkai auth logout` | ⚠ Deprecated | Emits `⚠ kekkai logout is deprecated. Use: kekkai auth logout` and revokes session |
| `kekkai whoami` | `kekkai auth status` | ⚠ Deprecated | Emits `⚠ kekkai whoami is deprecated. Use: kekkai auth status` and prints account status |

---

### Command Walkthrough & Examples

#### 1. Standard Interactive Login
Automatically opens your browser to the verification page and awaits approval:
```bash
$ kekkai auth login

KEKKAI Authentication

First, copy your one-time code:

   RWMX-NZ5A

Opening:
  https://app.kekkai.io/login/device

⠇ Waiting for authentication...
✔ Authentication successful.

Logged in as dev@kekkai.io
```

#### 2. Headless / SSH / Remote Container Mode (`--no-browser`)
Ideal for headless servers, Docker containers, or remote SSH sessions where no GUI browser is present:
```bash
$ kekkai auth login --no-browser

KEKKAI Authentication

First, copy your one-time code:

   ABCD-EFGH

Open this URL in your browser:

  https://app.kekkai.io/login/device

Enter the code above when prompted.

⠇ Waiting for authentication...
✔ Authentication successful.

Logged in as dev@kekkai.io
```

#### 3. Local Development (`--local`)
Targets the local development API (`http://localhost:4000`) and local frontend verification page (`http://localhost:3000/login/device`):
```bash
$ kekkai auth login --local

Connecting to http://localhost:4000...

KEKKAI Authentication

First, copy your one-time code:

   K9PL-2M4Q

Opening:
  http://localhost:3000/login/device

⠇ Waiting for authentication...
✔ Authentication successful.

Logged in as local-dev@kekkai.io
```

#### 4. Checking Session Status (`kekkai auth status`)
Inspects active connection, logged-in account, and token lifetime:
```bash
$ kekkai auth status

KEKKAI Authentication

Host       https://api.kekkai.io
Account    dev@kekkai.io
Status     Authenticated
Expires    in 14 minutes
```
*(When your access token expires, the CLI automatically and transparently rotates it using your stored refresh token on the next command.)*

#### 5. Listing & Revoking CLI Devices
Audit and manage all machines authorized under your account:
```bash
$ kekkai auth devices

KEKKAI CLI Devices

1. MacBook Pro (Work)
   Last used: 10/2/2026, 8:45:10 PM
   IP: 198.51.100.24
   ID: cly01a2b3c4d5e6f7g8h9j0k1

2. ThinkPad Linux (Personal)
   Last used: 10/1/2026, 11:20:00 AM
   IP: 203.0.113.42
   ID: cly98z7y6x5w4v3u2t1s0r9q8

To revoke a device: kekkai auth revoke <device-id>
```

To immediately revoke a compromised or decommissioned machine:
```bash
$ kekkai auth revoke cly98z7y6x5w4v3u2t1s0r9q8
✔ Device cly98z7y6x5w4v3u2t1s0r9q8 revoked.
```

#### 6. Logging Out (`kekkai auth logout`)
Revokes the refresh token on the server and scrubs local credentials:
```bash
$ kekkai auth logout
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
   - Persisted to `~/.kekkai/config.json` with strict `0600` POSIX permissions (owner read/write only).
   - Host configuration and token state are decoupled to prevent accidental host leakage.
4. **Envelope Encryption for Secrets**:
   - Secrets are encrypted with unique DEKs (Data Encryption Keys) using AES-256-GCM.
   - DEKs are encrypted using a 256-bit Master KEK managed outside the primary application database.
   - Web frontend never receives plaintext secrets.

---

## 🚀 Complete CLI Command Reference

### Secret Management
```bash
kekkai init                 # Link directory to a project & environment
kekkai push                 # Push local .env changes with interactive diff preview
kekkai pull                 # Pull vault secrets into local .env (--dry-run supported)
kekkai run -- <command>     # Inject secrets into process memory without writing to disk
kekkai status               # Inspect project link, environment, and secret drift
kekkai diff                 # Compare local .env against remote vault
kekkai set <KEY>            # Interactively set or update a single secret
kekkai get <KEY>            # Decrypt and display one secret (--copy for clipboard)
kekkai unset <KEY>          # Delete a secret from the vault
kekkai list                 # List tracked secret keys (values masked)
kekkai history <KEY>        # Audit version history of a secret
kekkai rollback <KEY> -v N  # Revert a secret to a specific version
```

### Environment & Diagnostics
```bash
kekkai env list             # List available environments (development, staging, prod)
kekkai env switch <name>    # Switch active local environment
kekkai projects             # List accessible projects
kekkai doctor               # Verify .gitignore, credentials, drift, and directory hygiene
kekkai scan                 # Detect untracked plaintext secrets in local codebase
kekkai audit                # Stream immutable audit log of secret access
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
npx kekkai auth login --local
```

---

## 📄 License

MIT © [KEKKAI](https://kekkai.io)
