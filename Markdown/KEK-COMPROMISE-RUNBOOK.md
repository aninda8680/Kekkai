# CLOAK-ENV Incident Response — KEK Compromise Runbook

**Status:** Required before production launch (Phase 5 checklist item)  
**Audience:** On-call engineer, platform owner  
**Last Updated:** 2026-09-28

---

## When to activate this runbook

Activate if ANY of the following are true:

- The `MASTER_KEK` environment variable was found in logs, a commit, a Slack message, or a screenshot
- A deploy platform (Render/Railway) secret was accidentally exposed publicly
- An insider threat or account compromise is suspected for an account with access to the KMS/secret config
- A security scanner flagged the KEK value in any output or stored artifact

**Default stance: assume compromise is real. Over-reacting costs hours; under-reacting costs your users' production secrets.**

---

## Step-by-step response

### Step 0 — Alert

- Page the on-call engineer immediately
- Notify the platform owner
- Open an internal incident channel (e.g., `#incident-kek-YYYYMMDD`)
- Do NOT discuss details in public channels or emails until step 5 (communications)

### Step 1 — Rotate the KEK immediately (< 15 minutes)

1. Generate a new KEK:
   ```bash
   # 64 hex chars = 32 bytes
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. Set the new KEK in your deployment platform **without deploying yet**:
   - Render: Dashboard → Environment → `MASTER_KEK` → update value → **do not deploy**
   - Railway: Variables → `MASTER_KEK` → update → **do not deploy**

3. Keep both old and new KEK available for the re-encryption step.

### Step 2 — Re-encrypt all DEKs (< 30 minutes)

Run the re-encryption migration script:

```bash
# This script:
# 1. Reads every Project.wrappedDek from DB
# 2. Unwraps it with the OLD_KEK
# 3. Re-wraps it with the NEW_KEK
# 4. Updates Project.wrappedDek and kekVersion in DB
# 5. Updates SecretVersion.kekVersion for all versions in that project

OLD_KEK=<old-kek-hex> NEW_KEK=<new-kek-hex> node scripts/re-encrypt-all-deks.js
```

> The script must run atomically per project — it wraps the DEK re-wrap in a DB transaction.
> Secret *values* (ciphertext) do NOT need to be re-encrypted — only the DEK wrapper changes.

### Step 3 — Deploy with the new KEK

After re-encryption is confirmed:
1. Deploy the new environment config (with `MASTER_KEK=<new>`)
2. Verify the `/health` endpoint responds
3. Verify a test CLI pull works end-to-end

### Step 4 — Revoke all active sessions (belt + suspenders)

```sql
-- Revoke all refresh tokens (forces re-login for all users)
UPDATE "RefreshToken" SET used = true WHERE used = false;
```

Or use the admin API endpoint (if implemented):
```bash
curl -X POST https://api.cloak-env.io/api/admin/revoke-all-sessions \
  -H "Authorization: Bearer <admin-token>"
```

### Step 5 — Audit what was exposed

1. Query audit logs for all `SYNC_PULL` and `SECRET_ACCESSED` events in the past 90 days:
   ```sql
   SELECT * FROM "AuditLog"
   WHERE action IN ('SYNC_PULL', 'SECRET_ACCESSED')
   AND "createdAt" > NOW() - INTERVAL '90 days'
   ORDER BY "createdAt" DESC;
   ```

2. Determine the blast radius:
   - Which projects had their DEKs at risk?
   - Which users had CLI sessions during the window?

3. Notify affected users if their project secrets may have been exposed.

### Step 6 — Communications

Once containment is complete:
- Send a security advisory to affected users (email from trust@cloak-env.io)
- Include: what happened, when it was contained, what they should do (rotate their secrets)
- Publish a public post-mortem within 72 hours if the incident affected production users

### Step 7 — Post-mortem

Within 7 days, conduct a post-mortem covering:
1. Root cause of the KEK exposure
2. Detection timeline (how was it found, how quickly)
3. Containment timeline
4. Lessons learned
5. Prevention measures (e.g., stricter secret access controls, alerts on KEK-shaped strings in logs)

---

## Re-encryption script template

```javascript
// scripts/re-encrypt-all-deks.js
const { PrismaClient } = require('@prisma/client');
const crypto = require('node:crypto');

const OLD_KEK = Buffer.from(process.env.OLD_KEK, 'hex');
const NEW_KEK = Buffer.from(process.env.NEW_KEK, 'hex');

if (OLD_KEK.length !== 32 || NEW_KEK.length !== 32) {
  throw new Error('Both OLD_KEK and NEW_KEK must be 64-char hex strings');
}

function unwrap(wrapped, kek) {
  const blob = Buffer.from(wrapped, 'base64');
  const nonce = blob.subarray(0, 12);
  const authTag = blob.subarray(blob.length - 16);
  const ciphertext = blob.subarray(12, blob.length - 16);
  const decipher = crypto.createDecipheriv('aes-256-gcm', kek, nonce);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

function wrap(dek, kek) {
  const nonce = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', kek, nonce);
  const ct = Buffer.concat([cipher.update(dek), cipher.final()]);
  return Buffer.concat([nonce, ct, cipher.getAuthTag()]).toString('base64');
}

async function main() {
  const prisma = new PrismaClient();
  const projects = await prisma.project.findMany({ where: { wrappedDek: { not: null } } });

  console.log(`Re-encrypting DEKs for ${projects.length} projects...`);

  for (const project of projects) {
    const dek = unwrap(project.wrappedDek, OLD_KEK);
    const newWrapped = wrap(dek, NEW_KEK);
    await prisma.project.update({
      where: { id: project.id },
      data: { wrappedDek: newWrapped, kekVersion: 'v2' },
    });
    console.log(`  ✓ ${project.name}`);
  }

  console.log('\nDone. Deploy with the new MASTER_KEK now.');
  await prisma.$disconnect();
}

main().catch(console.error);
```

---

## Contacts

| Role | Contact |
|---|---|
| Platform owner | [fill in] |
| On-call rotation | [PagerDuty/Opsgenie link] |
| Security advisory email | trust@cloak-env.io |
| Hosting support (Render/Railway) | [support link] |
