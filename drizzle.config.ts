import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './shared/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url:
      process.env.DATABASE_URL?.trim() ??
      process.env.POSTGRES_URL?.trim() ??
      'postgresql://postgres:postgres@localhost:5432/postgres',
  },
});
