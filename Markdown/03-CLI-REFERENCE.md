# CLOAK-ENV — CLI Reference (v1 production target)

Design principle: the CLI is where plaintext is allowed to exist (in memory, briefly, on the
developer's own machine). Every command below is designed to be safe-by-default (confirmations,
dry-runs, diffs) so a sleepy 2am `cloak-env push` doesn't clobber production.

## Authentication Commands (`cloak-env auth`)

| Command | Flags | Purpose |
|---|---|---|
| `cloak-env auth login` | `[--no-browser]` `[--local]` `[--host <url>]` | GitHub-style device-code flow: opens browser, no password ever touches the CLI process |
| `cloak-env auth status` | — | Shows host, account, session status, and access token expiry |
| `cloak-env auth logout` | — | Revokes session server-side and clears local credentials from `~/.cloak-env/config.json` |
| `cloak-env auth devices` | — | Lists registered CLI devices with last-used timestamps, IP, and device IDs |
| `cloak-env auth revoke <id>` | `<id>` | Revokes a specific CLI device by ID |

### Deprecated Aliases (Backward-Compatible)
| Legacy Command | Modern Replacement | Behavior |
|---|---|---|
| `cloak-env login` | `cloak-env auth login` | ⚠ Emits deprecation warning and routes to `auth login` |
| `cloak-env logout` | `cloak-env auth logout` | ⚠ Emits deprecation warning and routes to `auth logout` |
| `cloak-env whoami` | `cloak-env auth status` | ⚠ Emits deprecation warning and routes to `auth status` |

## Core secret & workspace commands (from the original spec — kept, tightened)

| Command | What's new / tightened |
|---|---|
| `cloak-env init` | Now also detects existing `.cloak-env/config.json` and offers `--force` to relink |
| `cloak-env push` | Adds a **diff preview** before upload (see below) instead of blind overwrite |
| `cloak-env pull` | Adds `--dry-run` and always shows a diff against the current local `.env` before writing |
| `cloak-env run <cmd>` | Adds `--env` flag to run against a non-default environment without switching context |

## Workspace, secret & team management commands

| Command | Purpose |
|---|---|
| `cloak-env status` | Shows linked project/environment, drift between local `.env` and vault (added/removed/changed keys), last sync time — the single most useful "what state am I in" command |
| `cloak-env diff` | Explicit diff between local `.env` and the vault without pushing or pulling |
| `cloak-env set KEY` | Interactively add/update one secret without touching the rest of `.env` |
| `cloak-env unset KEY` | Remove a single secret, with confirmation |
| `cloak-env get KEY` | Print **one** decrypted value to stdout (only place a value should ever print) — supports `--copy` to send straight to clipboard instead of the terminal, so it never even hits scrollback |
| `cloak-env list` | List secret **keys only** for the current environment (no values) — quick sanity check |
| `cloak-env history KEY` | Show version history/timestamps for one secret (no values by default; `--reveal` to decrypt a specific past version, itself audit-logged) |
| `cloak-env rollback KEY --version N` | Restore a secret to a previous version |
| `cloak-env env list` | List environments in the current project |
| `cloak-env env create <name>` | Create a new environment (e.g. `preview`, `qa`) |
| `cloak-env env switch <name>` | Change the active environment for this local directory without re-running `init` |
| `cloak-env projects` | List all projects the user can access |
| `cloak-env project switch` | Relink current directory to a different project interactively |
| `cloak-env clone <project> <env>` | Copy all secrets from one environment to another (e.g. seed `staging` from `development`), with a confirmation diff |
| `cloak-env doctor` | Sanity-check the local setup: is `.env` in `.gitignore`? is `.cloak-env/` in `.gitignore`? is the device token expired? is there drift? — one command, actionable output |
| `cloak-env scan` | Scans the working directory for likely-secret-looking values that are **not** yet tracked in CLOAK-ENV (regex heuristics for API-key shapes, AWS key patterns, etc.) and suggests `cloak-env push` candidates — this directly targets "accidentally committed a secret" |
| `cloak-env export --format sops\|docker\|k8s` | Export current environment as an encrypted SOPS file, a Docker `--env-file`, or a Kubernetes Secret manifest — bridges CLOAK-ENV into existing pipelines without weakening the vault model |
| `cloak-env team invite <email> --role DEVELOPER` | Invite a teammate directly from the terminal |
| `cloak-env audit` | Tail recent audit log entries for the current project (who did what, not values) |

## Example: `cloak-env push` with diff preview (the safety upgrade)

```
$ cloak-env push

Comparing local .env against vault (development)...

  + FIREBASE_API_KEY      (new)
  ~ JWT_SECRET             (changed)
  = MONGODB_URI            (unchanged, skipped)

Push 2 changes to development? [y/N] y

Encrypting... Uploading...
✓ FIREBASE_API_KEY
✓ JWT_SECRET

2 secrets synchronized. (1 unchanged secret skipped)
```

## Example: `cloak-env status` (the "what state am I in" command)

```
$ cloak-env status

Project:      Club Connect
Environment:  development
Linked:       ✓ (.cloak-env/config.json)
Last sync:    3 hours ago (push)

Local .env vs vault:
  ~ 1 changed   (JWT_SECRET differs locally)
  + 0 new
  - 0 removed

Run `cloak-env diff` for details, or `cloak-env push` / `cloak-env pull` to reconcile.
```

## CLI safety defaults (apply to all commands above)

- Every command that overwrites local files or remote state requires confirmation unless `--yes`
  is explicitly passed (for CI use).
- `pull` and `run` never write to `.env` silently in a directory where `.cloak-env/config.json` is
  missing — they fail with a clear "run `cloak-env init` first" message instead of guessing.
- Every command checks and warns (not silently fixes) if `.env` or `.cloak-env/` is missing from
  `.gitignore`.
- `get`/`history --reveal`/`pull` all generate an audit-log entry, visible later via `cloak-env audit`
  or the dashboard — plaintext access should always be traceable, even by the developer to
  themselves.
