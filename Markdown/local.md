# Local Development Setup Guide

This guide outlines the steps to run the CLOAK-ENV project on your local machine for development purposes.

## 1. Prerequisites

Make sure you have the following installed on your machine:
- **Node.js** (LTS version)
- **npm** (Node Package Manager)
- **Git**
- **Docker** and **Docker Compose** (Required to run the local database)

## 2. Start the Local Database

CLOAK-ENV uses PostgreSQL. For local development, this runs inside a Docker container.

1. Open your terminal in the root directory (`cloak-env-monorepo`).
2. Start the database in the background by running:
   ```bash
   docker compose up -d
   ```
   
> **Note:** To stop the database later, you can run `docker compose down`. If you ever need to completely reset the database and wipe all data, run `docker compose down -v`.

## 3. Configure Environment Variables

The CLOAK-ENV backend API requires some secrets to start up securely.

1. Navigate to the backend folder (e.g., `apps/api`).
2. Create a file named `.env`.
3. Add the following variables:

```env
# Database connection (Must match docker-compose.yml)
DATABASE_URL="postgresql://cloak-env:cloak-env_dev_password@localhost:5432/cloak-env"

# Authentication & Encryption Keys (Generate random strings for these locally)
JWT_SECRET="local_development_jwt_secret"
REFRESH_TOKEN_SECRET="local_development_refresh_secret"
ENCRYPTION_KEY="local_development_encryption_key"
```

> **Warning:** Ensure this `.env` file is never committed to GitHub.

## 4. Install Dependencies

Since this is an NPM Workspace (monorepo), you must install dependencies from the **root** folder. This will automatically link your local packages and install dependencies for all apps.

Run this in the root directory:
```bash
npm install
```

## 5. Sync Database & Generate Prisma Client

If this is your first time setting up the project, or if you have made changes to the database schema (`schema.prisma`), you need to push those changes to the database and generate the client.

First, push the schema to the database to create the tables:
```bash
npx prisma db push
```

Then, generate the TypeScript client so your backend code can talk to it:
```bash
npx prisma generate
```

## 6. Run the Development Servers

You can start the frontend and backend simultaneously using the workspace command defined in your root `package.json`.

Run this in the root directory:
```bash
npm run dev
```

Your applications should now be running locally with hot-reloading enabled.

---

## 7. Developer Workflow Cheat Sheet

It is important to know the difference between modifying your *code* versus modifying your *database*. Here is your ultimate cheat sheet for when to run which command:

### `docker compose up -d`
* **When to run it:** Once at the start of your day, or after restarting your computer.
* **What it does:** Starts your empty PostgreSQL database engine in the background.

### `npx prisma db push`
* **When to run it:** ONLY when you make changes to `prisma/schema.prisma` (like adding a new table or column). 
* **What it does:** Pushes your schema changes to the live PostgreSQL database to actually create/update the tables.

### `npx prisma generate`
* **When to run it:** Usually immediately after `npx prisma db push`, or if you clone your project on a brand new computer.
* **What it does:** Updates the TypeScript code in `node_modules` so that your backend code knows about the new tables and gives you autocomplete. 

### `npm run dev`
* **When to run it:** Whenever you sit down to write code!
* **What it does:** Starts your Express backend and Next.js frontend so you can test your application.

### `npx prisma studio`
* **When to run it:** Only when you want to manually peek inside your database.
* **What it does:** Opens a web browser tab (`http://localhost:5555`) where you can visually view, add, or delete the actual data inside your tables.
