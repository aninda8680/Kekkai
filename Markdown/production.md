# Production Deployment Guide

This guide outlines the essential steps and considerations for deploying the KEKKAI monorepo to production.

## 1. Architecture Overview

- **Frontend (Web Dashboard):** Hosted on Vercel or Netlify.
- **Backend (API):** Hosted on Render, Railway, or AWS (via Docker).
- **Database:** Managed PostgreSQL provider (e.g., Neon or Supabase PostgreSQL).
- **CLI:** Published to the NPM Registry for users to download via `npm install -g kekkai`.

## 2. Deploying the Backend API (Docker)

When containerizing your API from a monorepo, the Docker build context must be the **root directory** so it can access shared packages.

**Example `Dockerfile` (located in `apps/api/Dockerfile`):**
```dockerfile
FROM node:18-alpine
WORKDIR /app

# Copy root workspace configs
COPY package*.json ./

# Copy all apps and packages
COPY apps/api ./apps/api
COPY packages ./packages

# Install dependencies for the whole workspace
RUN npm ci

# Generate Prisma Client (CRITICAL for production)
RUN npx prisma generate

# Build the API
RUN npm run build -w apps/api

# Start the API
CMD ["npm", "start", "-w", "apps/api"]
```

> **Important:** To build this image, you must run the build command from the root folder: 
> `docker build -t kekkai-api -f apps/api/Dockerfile .`

## 3. Database Migrations in Production

When deploying a new version with database changes, you must apply those changes to your production database.

Run this command as part of your CI/CD pipeline (or release phase in Render):
```bash
npx prisma migrate deploy
```

> **Warning:** Do not run `migrate dev` in production. Always use `migrate deploy` to safely apply migrations.

## 4. Deploying the Frontend (Vercel)

Vercel natively supports monorepos, but it needs to know which app to build.

1. Import your GitHub repository into Vercel.
2. In the project settings, set the **Root Directory** to `apps/kekkai-web`.
3. Vercel will automatically detect the Next.js/Vite setup and install dependencies from the root level.
4. Ensure you add any required environment variables to the Vercel dashboard.

## 5. Publishing the CLI

To allow other developers to use `kekkai`, you must publish the CLI to the NPM registry.

1. Ensure your CLI package (`packages/cli/package.json`) has a unique name, version, and the `"bin"` field configured.
2. Build the CLI package.
3. Run the publish command from within the `packages/cli` directory:
   ```bash
   npm publish
   ```

Once published, users can install it globally:
```bash
npm install -g kekkai
```
