# @kekkai/cli

> The official command-line interface for **KEKKAI** — Zero-trust secret management for developers.

---

## Installation

```bash
# Global installation
npm install -g @kekkai/cli

# Or run directly via npx
npx kekkai <command>
```

---

## ⚡ Authentication (`kekkai auth`)

KEKKAI features a GitHub CLI-style OAuth 2.0 Device Authorization Grant flow (RFC 8628). Authentication happens securely in your web browser — no passwords or sensitive API tokens are ever typed into your terminal.

### Available Commands

```bash
# New commands
kekkai auth login              # opens browser automatically
kekkai auth login --no-browser # prints URL + code only (for SSH/remote)
kekkai auth login --local      # hits localhost:4000
kekkai auth login --host <url> # connects to a custom KEKKAI server
kekkai auth status             # shows host, account, token expiry
kekkai auth logout             # revokes server-side + clears local credentials
kekkai auth devices            # lists registered CLI devices
kekkai auth revoke <id>        # revokes a specific device by ID
```

### Deprecated Command Aliases

All legacy commands continue to work seamlessly with deprecation notices:

| Legacy Command | Deprecation Notice | Target Command |
|---|---|---|
| `kekkai login` | `⚠ kekkai login is deprecated. Use: kekkai auth login` | `kekkai auth login` |
| `kekkai logout` | `⚠ kekkai logout is deprecated. Use: kekkai auth logout` | `kekkai auth logout` |
| `kekkai whoami` | `⚠ kekkai whoami is deprecated. Use: kekkai auth status` | `kekkai auth status` |

---

## Authentication Walkthrough

### 1. Interactive Login
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

### 2. Headless / SSH Mode (`--no-browser`)
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
```

### 3. Local Development (`--local`)
```bash
$ kekkai auth login --local
# Connects to http://localhost:4000 and opens http://localhost:3000/login/device
```

### 4. Check Status
```bash
$ kekkai auth status

KEKKAI Authentication

Host       https://api.kekkai.io
Account    dev@kekkai.io
Status     Authenticated
Expires    in 14 minutes
```

### 5. Managing CLI Devices
```bash
$ kekkai auth devices

KEKKAI CLI Devices

1. Development Laptop
   Last used: 10/2/2026, 8:45:10 PM
   IP: 198.51.100.24
   ID: cly01a2b3c4d5e6f7g8h9j0k1

To revoke a device: kekkai auth revoke <device-id>
```

```bash
$ kekkai auth revoke cly01a2b3c4d5e6f7g8h9j0k1
✔ Device cly01a2b3c4d5e6f7g8h9j0k1 revoked.
```

### 6. Logging Out
```bash
$ kekkai auth logout
✔ Logged out successfully.
```

---

## Everyday Secret Management

```bash
# Initialize current folder with project & environment
kekkai init

# Push local .env changes (includes visual diff preview before sending)
kekkai push

# Pull vault secrets into local .env
kekkai pull

# Run local development with secrets injected directly into memory
kekkai run -- npm run dev

# Inspect drift between local .env and remote vault
kekkai status
kekkai diff

# Manage individual secrets
kekkai set API_KEY
kekkai get API_KEY --copy
kekkai unset API_KEY
kekkai list

# Diagnostic health check
kekkai doctor
```

---

## Security Model

- **No Passwords in CLI**: Device tokens are granted after browser confirmation.
- **Credential Storage**: Stored in `~/.kekkai/config.json` with `0600` permissions.
- **Token Rotation**: Short-lived access tokens (15 mins) with automatic, rotating refresh tokens and reuse detection.
- **Server Ciphertext-Only**: The API and database only store ciphertext encrypted with AES-256-GCM envelope encryption. Plaintext is only decrypted on your local machine.

---

## License

MIT © [KEKKAI](https://kekkai.io)
