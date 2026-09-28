# KEKKAI — Feasibility & Alternatives Analysis

## 1. Is this a real, viable problem?

Yes. "Where do secrets live when the laptop dies / the team grows / the repo can't hold them" is a
solved-but-still-painful problem, which is exactly the sweet spot for a project like this — there's
proof the market wants it (see §2), but there's still room to build something with a sharper
developer experience, especially for the India/student/indie-hacker segment KEKKAI is aimed at.

You are **not** the first to build this. That's good news, not bad news — it means the architecture
is well understood and battle-tested. Your job is not to invent secret management; it's to build a
clean, secure, opinionated implementation of it, and differentiate on DX, pricing, or a niche
(e.g. "the CLI-first vault for solo/indie devs and small teams," or "built for the Vercel/Render/
Neon indie stack" specifically).

## 2. Existing players (as of late 2026)

| Tool | Model | Notable strength | Notable gap |
|---|---|---|---|
| **Doppler** | Cloud-only SaaS | Fastest onboarding, huge integration list (30+) | Not open-source, no self-host, per-seat pricing gets expensive |
| **Infisical** | Open-source, self-host or cloud | Client-side E2EE, SDKs for every language, Kubernetes operator, cheapest at scale | Dashboard/DX historically rougher than Doppler's |
| **EnvKey** | Desktop app, E2EE | Zero-knowledge by design, works offline-first | Smaller ecosystem, less web-dashboard-centric |
| **HashiCorp Vault** | Self-host or HCP | Dynamic secrets, PKI, enterprise ACLs | Heavy to operate; massive overkill for a solo dev / small team |
| **AWS Secrets Manager / SSM** | Cloud-native | Deep IAM integration, automatic RDS rotation | Locked into AWS; not a general dev workflow tool |
| **Mozilla SOPS** | Git-native, no server | Secrets diff-able and reviewable in PRs | No web dashboard, no team management, manual key distribution |

**Takeaway:** the winning pattern across every serious competitor is the same one your own spec
already converges on — **client-side (or at minimum server-blind) encryption + CLI-first sync +
short-lived tokens + audit logs.** That validates your architecture. The differentiator is
execution quality and a clear niche, not a novel security model.

## 3. Is "encrypted cloud vault as source of truth for `.env`" the right shape?

Yes, with one refinement: don't market it as ".env cloud backup." Position it as what Infisical and
Doppler both learned the hard way — **the vault is the source of truth, `.env` is a disposable local
cache regenerated on demand.** That reframing changes several design decisions in your favor:

- `.env` files become fully disposable — losing a laptop is a non-event.
- You can safely encourage `.gitignore`'d, ephemeral `.env` files, or skip them entirely with
  `kekkai run` (process-level injection), which is strictly safer than writing plaintext to disk.
- Versioning and audit logs become the actual product, not a nice-to-have.

## 4. Are there better/alternative ways to "store the .env"?

Worth naming explicitly, since you asked:

1. **Git-native encrypted files (SOPS/age/git-crypt)** — secrets live *in* the repo, encrypted.
   Pro: reviewable diffs, no separate server to trust. Con: no live audit trail, no per-secret
   access control, key distribution is still a manual problem, doesn't solve "revoke access for
   one teammate" cleanly. Good as a *complementary* export target for KEKKAI (`kekkai export --sops`),
   not a replacement for the vault model.
2. **OS keychain / local secret store (macOS Keychain, libsecret)** — great for *local* secrets,
   solves nothing for team sync or disaster recovery across machines.
3. **Dedicated KMS envelope encryption (AWS KMS/GCP KMS/HashiCorp Transit)** — the *production*
   answer to "how do we manage the encryption key," should be layered on top of your own vault
   rather than an alternative to it. See `02-SECURITY-ENV-STORAGE.md`.
4. **Pure zero-knowledge (client only holds the key, server never can decrypt)** — strictly more
   secure, but adds real UX cost: password reset = secret loss unless you build a recovery
   mechanism (recovery codes, admin-escrow, or per-secret re-encryption on rotation). Recommended
   as a **v2 opt-in mode**, not a v1 requirement — see the phased plan in
   `05-PRODUCTION-READINESS-PROMPT.md`.

**Conclusion: the project is feasible, the architecture is sound, and the closest real-world analog
(Infisical) is a large, funded, well-regarded open-source project — so there's a validated path from
"student project" to "actually useful tool people would install."** The main risks are execution
risks (correct crypto implementation, correct authorization checks, correct handling of tokens),
not conceptual risks. Those risks are addressed directly in `02-SECURITY-ENV-STORAGE.md`.
