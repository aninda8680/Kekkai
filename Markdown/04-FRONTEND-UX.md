# CLOAK-ENV — Frontend UX, Motion & Dashboard Design

## 1. Product tone

CLOAK-ENV is a security product. The UI should feel like the visual language of Vercel, Linear, or
1Password's web vault: dark, precise, restrained motion, monospace accents for anything
secret-adjacent (key names, tokens, hashes), and zero "vibes" that undercut the security promise
(no cutesy illustrations of padlocks, no comic-sans-adjacent playfulness). Confidence and calm, not
flashy.

## 2. Stack additions for smoothness

- **Lenis** for buttery inertia scrolling on the marketing/landing site (not inside the dashboard's
  data-dense tables — smooth-scroll libraries fight with virtualized/long tables, so scope Lenis to
  the marketing pages and static docs, and use native scroll with `scroll-behavior: smooth` sparingly
  inside the app shell).
- **Framer Motion** for shared-layout transitions between dashboard views (project → environment →
  secret list) so navigation feels like drilling into a hierarchy, not a page reload.
- **View Transitions API** (progressive enhancement) for route changes where supported.
- Respect `prefers-reduced-motion` everywhere — disable non-essential animation for users who've
  opted out; this is both an accessibility requirement and a professionalism signal.

## 3. Landing / marketing site

- Hero: the "New Laptop Scenario" (`§50` of the original spec) as the primary animated explainer —
  a scroll-triggered sequence: laptop icon → `cloak-env push` → cloud vault glow → laptop "destroyed"
  → new laptop → `cloak-env pull` → app running. This tells the whole value prop without a paragraph
  of copy.
- Live terminal component on the hero (animated typing of `cloak-env login && cloak-env pull`) — this is
  the single highest-converting pattern for dev-tool landing pages (Doppler, Vercel, Supabase all
  use it) because it lets the visitor "feel" the CLI before installing anything.
- Lenis-smoothed scroll through: Problem → How it works (mirrors `01-ARCHITECTURE.md` diagrams,
  redrawn as clean SVG, not ASCII, for the public site) → Security (the envelope-encryption diagram,
  simplified) → Pricing → CTA.

## 4. Dashboard — information architecture

```
Sidebar                Main panel
────────               ──────────────────────────────
Dashboard               Project grid (cards: name, env count,
                         secret count, last activity, role badge)
Projects
  └ Club Connect
      ├ development      Environment tabs
      ├ staging          Secret table:
      └ production          KEY NAME | •••••••• | version | updated | updated by
Team                       [Copy CLI command] [History] — no reveal, no plaintext, ever
Audit Logs
Settings
```

## 5. The "no plaintext, ever" dashboard pattern (implements `02-SECURITY-ENV-STORAGE.md` §4)

```
┌────────────────────────────────────────────────────────────┐
│  JWT_SECRET                                    v3 · 2h ago   │
│  ••••••••••••••••••••••••                                   │
│  [ Copy CLI command ]   [ History ]   [ Delete ]              │
└────────────────────────────────────────────────────────────┘

"Copy CLI command" → copies:  cloak-env get JWT_SECRET --env production
```

Micro-interactions to add:
- Hover on a masked value subtly shifts the dots (a CSS keyframe, ~200ms) to signal "this is
  interactive but intentionally won't reveal" — reinforces the security posture rather than feeling
  like a missing feature.
- Copying the CLI command triggers a small toast: *"Command copied. Values only ever decrypt in
  your terminal."* — turns the restriction into a trust signal instead of a friction point.
- Adding a secret is a slide-over panel (Framer Motion `AnimatePresence`), not a full page nav —
  keeps the user in flow.
- Version history opens as a timeline (masked values throughout), each entry showing who changed it
  and when, with a "Rollback" action that requires typing the environment name to confirm for
  `production` specifically (Vercel/GitHub-style destructive-action confirmation).

## 6. Empty/first-run states

- First project: illustrate the CLI-first nature immediately — "Projects are created from the CLI
  or here" with a copyable `cloak-env init` snippet, not just an empty table.
- Zero secrets in an environment: show the `cloak-env push` command pre-filled with that environment's
  name, plus a short "why can't I paste a secret here?" link → explains the no-plaintext-in-browser
  policy in one sentence, linking to the security page.

## 7. Motion budget (don't overdo it)

- Page-level transitions: 150–250ms, ease-out.
- List item entrance (staggered) only on first load of a view, never re-triggered on every
  re-render/poll — re-animating on background refresh reads as buggy, not polished.
- No parallax, no auto-playing background video, nothing that could be mistaken for distracting a
  user away from a security-sensitive action (e.g. never animate *during* a delete/rollback
  confirmation — keep those moments still and legible).

## 8. Accessibility & professionalism baseline

- Full keyboard navigation for the secret table and command palette (`Cmd+K` style, listing
  projects/environments/recent audit entries — dev tools live and die by this).
- Color contrast AA minimum even in dark mode; masked-value dots must still be visibly "present but
  hidden," not just invisible text.
- Every destructive action (delete secret, delete project, rollback in production) requires typed
  confirmation of the resource name — no bare "Are you sure?" modals for anything touching
  production secrets.
