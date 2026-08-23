# API Server (local dev)

Copy `.env.example` to `.env` and set `DATABASE_URL` and `PORT`.

Run locally:

```bash
# from workspace root
pnpm --filter ./artifacts/api-server run dev
```

Migrations (drizzle-kit):

```bash
# from lib/db
pnpm --filter ./lib/db run push
```

Note: Do not commit real `DATABASE_URL` to source control. Use environment variables.
