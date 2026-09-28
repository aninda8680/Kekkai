# KEKKAI — CLI Reference (v1 production target)

Design principle: the CLI is where plaintext is allowed to exist (in memory, briefly, on the
developer's own machine). Every command below is designed to be safe-by-default (confirmations,
dry-runs, diffs) so a sleepy 2am `kekkai push` doesn't clobber production.

## Core commands (from the original spec — kept, tightened)

| Command | What's new / tightened |
|---|---|
| `kekkai login` | Device-code flow: opens browser, no password ever touches the CLI process |
| `kekkai init` | Now also detects existing `.kekkai/config.json` and offers `--force` to relink |
| `kekkai push` | Adds a **diff preview** before upload (see below) instead of blind overwrite |
| `kekkai pull` | Adds `--dry-run` and always shows a diff against the current local `.env` before writing |
| `kekkai run <cmd>` | Adds `--env` flag to run against a non-default environment without switching context |

## New commands to add (user-friendliness + real-world workflow gaps)

| Command | Purpose |
|---|---|
| `kekkai status` | Shows linked project/environment, drift between local `.env` and vault (added/removed/changed keys), last sync time — the single most useful "what state am I in" command |
| `kekkai diff` | Explicit diff between local `.env` and the vault without pushing or pulling |
| `kekkai whoami` | Shows the logged-in user, active device token expiry, and which projects they can access |
| `kekkai set KEY` | Interactively add/update one secret without touching the rest of `.env` |
| `kekkai unset KEY` | Remove a single secret, with confirmation |
| `kekkai get KEY` | Print **one** decrypted value to stdout (only place a value should ever print) — supports `--copy` to send straight to clipboard instead of the terminal, so it never even hits scrollback |
| `kekkai list` | List secret **keys only** for the current environment (no values) — quick sanity check |
| `kekkai history KEY` | Show version history/timestamps for one secret (no values by default; `--reveal` to decrypt a specific past version, itself audit-logged) |
| `kekkai rollback KEY --version N` | Restore a secret to a previous version |
| `kekkai env list` | List environments in the current project |
| `kekkai env create <name>` | Create a new environment (e.g. `preview`, `qa`) |
| `kekkai env switch <name>` | Change the active environment for this local directory without re-running `init` |
| `kekkai projects` | List all projects the user can access |
| `kekkai project switch` | Relink current directory to a different project interactively |
| `kekkai clone <project> <env>` | Copy all secrets from one environment to another (e.g. seed `staging` from `development`), with a confirmation diff |
| `kekkai doctor` | Sanity-check the local setup: is `.env` in `.gitignore`? is `.kekkai/` in `.gitignore`? is the device token expired? is there drift? — one command, actionable output |
| `kekkai scan` | Scans the working directory for likely-secret-looking values that are **not** yet tracked in KEKKAI (regex heuristics for API-key shapes, AWS key patterns, etc.) and suggests `kekkai push` candidates — this directly targets "accidentally committed a secret" |
| `kekkai export --format sops\|docker\|k8s` | Export current environment as an encrypted SOPS file, a Docker `--env-file`, or a Kubernetes Secret manifest — bridges KEKKAI into existing pipelines without weakening the vault model |
| `kekkai team invite <email> --role DEVELOPER` | Invite a teammate directly from the terminal |
| `kekkai logout` | Revokes the local device token both locally and server-side (not just deleting the local file) |
| `kekkai audit` | Tail recent audit log entries for the current project (who did what, not values) |

## Example: `kekkai push` with diff preview (the safety upgrade)

```
$ kekkai push

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

## Example: `kekkai status` (the "what state am I in" command)

```
$ kekkai status

Project:      Club Connect
Environment:  development
Linked:       ✓ (.kekkai/config.json)
Last sync:    3 hours ago (push)

Local .env vs vault:
  ~ 1 changed   (JWT_SECRET differs locally)
  + 0 new
  - 0 removed

Run `kekkai diff` for details, or `kekkai push` / `kekkai pull` to reconcile.
```

## CLI safety defaults (apply to all commands above)

- Every command that overwrites local files or remote state requires confirmation unless `--yes`
  is explicitly passed (for CI use).
- `pull` and `run` never write to `.env` silently in a directory where `.kekkai/config.json` is
  missing — they fail with a clear "run `kekkai init` first" message instead of guessing.
- Every command checks and warns (not silently fixes) if `.env` or `.kekkai/` is missing from
  `.gitignore`.
- `get`/`history --reveal`/`pull` all generate an audit-log entry, visible later via `kekkai audit`
  or the dashboard — plaintext access should always be traceable, even by the developer to
  themselves.
