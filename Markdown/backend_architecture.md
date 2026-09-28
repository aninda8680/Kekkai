# KEKKAI Backend Architecture & Flow

This document explains the entire backend flow, from database storage to the API, and how the frontend and CLI interact with it.

## 1. The Big Picture (ASCII Diagram)

Here is the data flow for the KEKKAI ecosystem:

```text
                      +-------------------+
                      |                   |
                      |  Next.js Frontend | (Port 3000)
                      |  (Dashboard)      |
                      |                   |
                      +---------+---------+
                                |
                          (HTTP / JSON)
                                |
+---------------+     +---------v---------+     +-------------------+
|               |     |                   |     |                   |
|  KEKKAI CLI   +----->  Express.js API   +----->   PostgreSQL DB   |
| (Terminal)    |     |  (Backend)        |     |  (Storage)        |
+---------------+     |  (Port 4000)      |     |  (Port 5432)      |
                      +---------+---------+     +-------------------+
                                |                         ^
                                |                         |
                                +------- (Prisma) --------+
```

### How Data Moves:
1. **User Action:** A user logs in via the Frontend Dashboard or types `kekkai login` in the CLI.
2. **API Request:** That request is sent via HTTP to the **Express.js API** (the backend).
3. **Database Query:** The Express API uses **Prisma** to talk to the **PostgreSQL** database.
4. **Storage:** The PostgreSQL database verifies the credentials and returns the data back to Prisma.
5. **Response:** The Express API sends a JSON response (like an access token) back to the Frontend or CLI.

---

## 2. Why Prisma and How it Works

### What is Prisma?
Prisma is an **ORM** (Object-Relational Mapper). If you are coming from MongoDB, you can think of Prisma as the equivalent of **Mongoose**, but for SQL databases. 

Instead of writing raw SQL commands (like `SELECT * FROM users`), Prisma allows you to write Javascript/Typescript:
```typescript
// How Prisma fetches a user (similar to Mongoose's User.findOne)
const user = await prisma.user.findUnique({ where: { email: "test@test.com" } });
```

### How it Works:
- **`prisma/schema.prisma`:** This file is the single source of truth. It defines what your tables look like (User, Project, Secret). It is equivalent to your Mongoose schemas.
- **Prisma Client:** When you run `npx prisma generate`, Prisma reads your schema and generates a custom Typescript client inside `node_modules`. This client is what your Express backend uses to talk to the database.

---

## 3. The Storage Side (Database & Containerization)

We are using **PostgreSQL** as our database. 

Because installing PostgreSQL directly on your computer can be messy and complex, we use **Docker** (Containerization).

### Local Development (Docker Compose)
When you run `docker compose up -d`:
1. Docker downloads a pre-configured PostgreSQL "container" (think of it as a tiny virtual machine that only runs a database).
2. It starts this database on port `5432`.
3. Your Express backend connects to it using the `DATABASE_URL` in your `.env` file.

**No other part of the app is containerized locally**—only the database. Your frontend and backend run directly on your computer using Node.js (`npm run dev`).

---

## 4. The Auth Flow (Login & Registering)

1. **Register:** When a user registers, the Express API hashes their password using `bcrypt` and tells Prisma to save the new user into the PostgreSQL database.
2. **Login:** When a user logs in, Prisma checks the database. If the password matches, the Express API generates a **JWT (JSON Web Token)**.
3. **Tokens:** The API returns an `accessToken` to the frontend/CLI, and securely stores a `refreshToken` as an HTTP-only cookie in the browser. 

---

## 5. How to Run Everything Locally

To start the entire KEKKAI ecosystem on your machine:

1. **Start the Database (Storage):**
   ```bash
   docker compose up -d
   ```
   *(This starts the PostgreSQL container).*

2. **Start the Servers (Frontend & Backend):**
   ```bash
   npm run dev
   ```
   *(This starts Next.js on port 3000 and Express on port 4000).*

3. **View the Database (Optional):**
   ```bash
   npx prisma studio
   ```
   *(This opens a browser UI to see your data, just like MongoDB Compass).*

---

## 6. What Happens in Production?

When you deploy this to the internet, things change slightly:

| Component | Local Development | Production Deployment |
| :--- | :--- | :--- |
| **Storage (DB)** | Local Docker Container (`docker compose up`) | Managed Cloud Database (e.g., **Neon.tech**, Supabase, AWS RDS). |
| **Backend API** | Node.js (`npm run dev`) | The Express server is put into its own Docker container and deployed to a host like **Render** or **Railway**. |
| **Frontend** | Node.js (`npm run dev`) | Hosted on **Vercel** as a serverless application. |
| **CLI** | Local symlink (`npm link`) | Published to the NPM Registry (`npm publish`) so users can `npm install -g kekkai`. |

In production, you do **not** run `docker-compose`. Instead, Vercel hosts your frontend, Render hosts your Dockerized backend, and Neon hosts your PostgreSQL database.
