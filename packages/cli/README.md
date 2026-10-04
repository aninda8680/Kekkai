# cloak-env

> The official command-line interface for **CLOAK-ENV** — Zero-trust secret management for developers.

---

## Installation

```bash
# Global installation
npm install -g cloak-env

# Or run directly via npx
npx cloak-env <command>
```

---

## ⚡ Authentication (`cloak-env auth`)

CLOAK-ENV features a GitHub CLI-style OAuth 2.0 Device Authorization Grant flow (RFC 8628). Authentication happens securely in your web browser — no passwords or sensitive API tokens are ever typed into your terminal.

### Available Commands

```bash
# New commands
cloak-env auth login              # opens browser automatically
cloak-env auth login --no-browser # prints URL + code only (for SSH/remote)
cloak-env auth login --local      # hits localhost:4000
cloak-env auth login --host <url> # connects to a custom CLOAK-ENV server
cloak-env auth status             # shows host, account, token expiry
cloak-env auth logout             # revokes server-side + clears local credentials
cloak-env auth devices            # lists registered CLI devices
cloak-env auth revoke <id>        # revokes a specific device by ID
```

### Deprecated Command Aliases

All legacy commands continue to work seamlessly with deprecation notices:

| Legacy Command | Deprecation Notice | Target Command |
|---|---|---|
| `cloak-env login` | `⚠ cloak-env login is deprecated. Use: cloak-env auth login` | `cloak-env auth login` |
| `cloak-env logout` | `⚠ cloak-env logout is deprecated. Use: cloak-env auth logout` | `cloak-env auth logout` |
| `cloak-env whoami` | `⚠ cloak-env whoami is deprecated. Use: cloak-env auth status` | `cloak-env auth status` |

---

## Authentication Walkthrough

### 1. Interactive Login
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

### 2. Headless / SSH Mode (`--no-browser`)
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
```

### 3. Local Development (`--local`)
```bash
$ cloak-env auth login --local
# Connects to http://localhost:4000 and opens http://localhost:3000/login/device
```

### 4. Check Status
```bash
$ cloak-env auth status

CLOAK-ENV Authentication

Host       https://api.cloak-env.io
Account    dev@cloak-env.io
Status     Authenticated
Expires    in 14 minutes
```

### 5. Managing CLI Devices
```bash
$ cloak-env auth devices

CLOAK-ENV CLI Devices

1. Development Laptop
   Last used: 10/2/2026, 8:45:10 PM
   IP: 198.51.100.24
   ID: cly01a2b3c4d5e6f7g8h9j0k1

To revoke a device: cloak-env auth revoke <device-id>
```

```bash
$ cloak-env auth revoke cly01a2b3c4d5e6f7g8h9j0k1
✔ Device cly01a2b3c4d5e6f7g8h9j0k1 revoked.
```

### 6. Logging Out
```bash
$ cloak-env auth logout
✔ Logged out successfully.
```

---

## Everyday Secret Management

```bash
# Initialize current folder with project & environment
cloak-env init

# Push local .env changes (includes visual diff preview before sending)
cloak-env push

# Pull vault secrets into local .env
cloak-env pull

# Run local development with secrets injected directly into memory
cloak-env run -- npm run dev

# Inspect drift between local .env and remote vault
cloak-env status
cloak-env diff

# Manage individual secrets
cloak-env set API_KEY
cloak-env get API_KEY --copy
cloak-env unset API_KEY
cloak-env list

# Diagnostic health check
cloak-env doctor
```

---

## Security Model

- **No Passwords in CLI**: Device tokens are granted after browser confirmation.
- **Credential Storage**: Stored in `~/.cloak-env/config.json` with `0600` permissions.
- **Token Rotation**: Short-lived access tokens (15 mins) with automatic, rotating refresh tokens and reuse detection.
- **Server Ciphertext-Only**: The API and database only store ciphertext encrypted with AES-256-GCM envelope encryption. Plaintext is only decrypted on your local machine.

---

## License

MIT © [CLOAK-ENV](https://cloak-env.vercel.app)
