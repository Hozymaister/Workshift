# Workshift

## Database setup and migrations

The backend uses [Drizzle ORM](https://orm.drizzle.team/) migrations stored in the `migrations/` directory that are generated from `shared/schema.ts`.

1. Make sure `DATABASE_URL` points to your PostgreSQL database.
2. Apply the migrations before starting the production server by running:
   ```bash
   npm run db:push
   ```
   The `npm start` command triggers this step automatically via the `prestart` script, so deployments just need to provide the environment variables and run the usual `npm run build && npm start` sequence.
3. Whenever you change the schema, regenerate migrations with:
   ```bash
   DATABASE_URL=... npx drizzle-kit generate
   ```

For local development you can still use `npm run dev`, but ensure migrations have been applied to the target database first.
