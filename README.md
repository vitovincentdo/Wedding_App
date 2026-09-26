# Gerald & Angie — Wedding Invitation

Native Next.js wedding invitation prepared for Vercel.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

The page can run without a database. RSVP and wishes require `DATABASE_URL`.

## Vercel + Neon setup

1. Import this GitHub repository into Vercel.
2. In the Vercel project, open **Storage / Marketplace** and add **Neon**.
3. Create a free Neon database and connect it to the project.
4. Confirm that Vercel added `DATABASE_URL` to the project environment variables.
5. Redeploy the latest commit.

The `submissions` table is created automatically on the first RSVP or wish.

## Commands

```bash
npm run dev
npm run build
npm start
```
