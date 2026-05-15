import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

import * as schema from './schema.js';

function connectionString(): string {
  const u =
    process.env.DATABASE_URL?.trim() ??
    process.env.POSTGRES_URL?.trim() ??
    process.env.POSTGRES_PRISMA_URL?.trim();
  if (!u) {
    throw new Error('Defina DATABASE_URL ou POSTGRES_URL (Vercel Postgres / Neon).');
  }
  return u;
}

let cached: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function getDb() {
  if (!cached) {
    cached = drizzle(neon(connectionString()), { schema });
  }
  return cached;
}
