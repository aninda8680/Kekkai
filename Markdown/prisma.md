# KEKKAI Prisma & Database Migration Guide

> **Quick Summary for Developers:**  
> **No, changing `schema.prisma` does NOT delete your existing data.**  
> As long as you follow the standard `prisma migrate` workflow documented here, your users, projects, tokens, and secrets will remain 100% safe.

---

## 1. How Prisma Manages Your Database

Prisma is the Object-Relational Mapper (ORM) used by KEKKAI to interact with PostgreSQL (hosted on **Neon**).

Your database state is managed through two key elements:
1. **`prisma/schema.prisma`**: The single source of truth describing your database models, columns, relations, and types in TypeScript-like syntax.
2. **`prisma/migrations/`**: A version-controlled history of raw SQL scripts (like Git commits for your database). Each migration records exact changes made over time.

---

## 2. Does Changing `schema.prisma` Delete Old Data?

### The Short Answer: **NO.**

Prisma **never** silently deletes your data during a migration. 

### Why You Can Be Confident:
1. **Incremental Alterations:** When you add a new model or new fields, Prisma generates standard SQL `CREATE TABLE` or `ALTER TABLE ... ADD COLUMN` statements. Your existing rows are never touched.
2. **Interactive Safety Warning:** If you ever make a destructive change (like deleting a column or renaming without migrating), Prisma detects that existing data would be affected, halts immediately, and displays a prominent warning:
   ```text
   ⚠️ We found that your database contains data that may be lost:
     • The column 'xyz' on the 'User' table will be dropped.
   Are you sure you want to create this migration? (y/N)
   ```
   If you do not explicitly type `y`, **nothing is changed or deleted**.

---

## 3. The Critical Difference: `migrate dev` vs `db push`

| Feature | `npx prisma migrate dev` (Recommended) | `npx prisma db push` (Prototyping Only) |
| :--- | :--- | :--- |
| **How it works** | Generates timestamped SQL files in `prisma/migrations/` | Directly syncs schema to DB without creating history |
| **Data Safety** | **Safe.** Auditable, incremental, and warns before data loss | Can overwrite or drop columns to force a match |
| **Production Use** | **Yes.** Render runs `prisma migrate deploy` | **Never** recommended in production |
| **Commit to Git?** | **Yes**, `prisma/migrations` is tracked in Git | No migration files created |

> ⚠️ **Warning:** Previously, `package.json` had a script running `prisma db push --accept-data-loss`. That was used during initial prototyping. Now that your project is baselined and live in production, **always use `prisma migrate dev`**.

---

## 4. Schema Change Safety Matrix

Refer to this table before modifying `prisma/schema.prisma`:

### ✅ 100% Safe (Zero Risk to Existing Data)
| Change | Example in `schema.prisma` | What Happens in the Database |
| :--- | :--- | :--- |
| **Add a new Table/Model** | `model Organization { ... }` | Creates a new table. Existing tables (`User`, `Secret`, etc.) are completely unaffected. |
| **Add an Optional Field** | `bio String?` | Adds column with `NULL` for existing rows. No existing data is altered. |
| **Add a Field with Default** | `isActive Boolean @default(true)` | Adds column and automatically populates `true` for all existing records. |
| **Add an Index** | `@@index([createdAt])` | Adds a performance index. No table data is modified. |

---

### ⚠️ Requires Care (Needs Manual Review)
| Change | What Could Go Wrong | The Safe Solution |
| :--- | :--- | :--- |
| **Renaming a Field** | Renaming `username` to `handle` in Prisma will generate: `DROP COLUMN "username"; ADD COLUMN "handle";` (which deletes data in that column). | Run `prisma migrate dev --create-only --name rename_username`. In the generated `migration.sql`, replace the drop/add lines with: <br>`ALTER TABLE "User" RENAME COLUMN "username" TO "handle";` |
| **Adding a Required Field without Default** | Adding `phoneNumber String` (without `?` or `@default`) to a `User` table that already has users will fail because existing rows have no phone number. | Either make it optional (`String?`), provide a default value (`@default("")`), or populate it in a two-step migration. |
| **Changing a Field Type** | Changing `age Int` to `age String` or vice versa. | Requires a custom SQL cast in `migration.sql` (e.g. `ALTER TABLE "User" ALTER COLUMN "age" TYPE TEXT USING "age"::text;`). |

---

### ❌ Destructive (Intentional Deletions)
| Change | Effect |
| :--- | :--- |
| **Deleting a Field from `schema.prisma`** | The column and any data inside that specific column will be dropped from the database. |
| **Deleting a Model from `schema.prisma`** | The entire table and all its rows will be dropped (`DROP TABLE`). |

---

## 5. Step-by-Step Workflow: How to Safely Change Your Schema

Whenever you need to add or update database models, follow these steps:

### Step 1: Edit `prisma/schema.prisma`
Open `prisma/schema.prisma` and make your edits (e.g., adding an optional field):
```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  bio       String?  // <-- New optional field
  ...
}
```

### Step 2: Create and Apply the Migration Locally
In your terminal at the root of the project, run:
```bash
npx prisma migrate dev --name add_bio_to_user
```
**What this does automatically:**
1. Compares your `schema.prisma` with your database.
2. Creates a new migration folder under `prisma/migrations/<timestamp>_add_bio_to_user/migration.sql`.
3. Safely applies the SQL script to your database.
4. Regenerates the `@prisma/client` library with new TypeScript types.

### Step 3: Review the Generated SQL
Open `prisma/migrations/<timestamp>_add_bio_to_user/migration.sql` to confirm what SQL will run:
```sql
-- AlterTable
ALTER TABLE "User" ADD COLUMN "bio" TEXT;
```

### Step 4: Commit and Push to GitHub
```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(db): add bio field to user model"
git push origin main
```

### Step 5: Production Deployment on Render
When Render detects your new commit:
1. Render runs `npx prisma migrate deploy`.
2. Prisma checks the `_prisma_migrations` table in Neon.
3. It detects only the new migration (`add_bio_to_user`) and applies it cleanly.
4. **Your production users, secrets, and data remain completely intact.**

---

## 6. How We Baselined the Existing Database (Fixing Error P3005)

When first deploying to Render, the build halted with:
```text
Error: P3005: The database schema is not empty.
Read more about how to baseline an existing production database: https://pris.ly/d/migrate-baseline
```

### What caused this?
Your database on Neon already had tables created from earlier development, but the Git repository didn't have a `prisma/migrations` folder. When `prisma migrate deploy` ran, Prisma refused to run on an existing, non-empty database without a baseline history to prevent data loss.

### How it was resolved:
1. Created the baseline migration representing the entire initial schema:
   `prisma/migrations/0_init/migration.sql`
2. Marked it as already applied in Neon:
   ```bash
   npx prisma migrate resolve --applied 0_init
   ```
3. Committed `prisma/migrations` to Git.
4. Future deploys will now run without errors because Prisma knows `0_init` is accounted for.

---

## 7. Prisma Studio vs Neon Console

| Feature | Prisma Studio (`localhost:5555`) | Neon Web Console |
| :--- | :--- | :--- |
| **Where it runs** | Locally on your computer (`npx prisma studio`) | In the cloud at [console.neon.tech](https://console.neon.tech) |
| **Database target** | Points to the remote Neon database (`DATABASE_URL`) | The Neon database itself |
| **Do you need it running?** | **No.** It is an optional local viewer. You can close it anytime. | Available 24/7 in your browser. |
| **Features** | Visual table viewer, clickable relations | Table browser, SQL Editor, branching, metrics, logs, backups |

Both tools view and edit the **exact same live data**. You can use whichever you find more convenient.

---

## 8. Neon Safety Nets (Cloud Backups & Branching)

Because KEKKAI uses **Neon Serverless Postgres**, you have built-in safeguards:

1. **Instant Point-in-Time Recovery (PITR):**
   Neon continuously saves the WAL (Write-Ahead Log). If an accidental change ever occurs, you can restore your database to any second in the past via the Neon Console.
2. **Branching (Zero-Copy Testing):**
   Before running a risky migration on production, you can create a **Branch** of your database in Neon. A branch is an instant, isolated copy of your schema and data. You can test your migration against the branch first with zero risk to production.

---

## 9. Useful Prisma Commands Reference

```bash
# Check current migration status vs database
npx prisma migrate status

# Create and apply a new migration in development
npx prisma migrate dev --name <migration_name>

# Create a migration SQL file WITHOUT applying it yet (useful for manual edits)
npx prisma migrate dev --create-only --name <migration_name>

# Apply pending migrations in production (used by CI/CD and Render)
npx prisma migrate deploy

# Open local visual database explorer
npx prisma studio

# Re-generate Prisma Client TypeScript types after schema edits
npx prisma generate
```
