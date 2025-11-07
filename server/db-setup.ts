import path from 'path';
import { fileURLToPath } from 'url';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import { storage } from './storage';
import { config } from './config';

export async function setupDatabase() {
  if (!config.databaseUrl) {
    console.warn('setupDatabase called without DATABASE_URL; skipping migrations.');
    return;
  }

  try {
    console.log('Starting database setup...');

    const sql = neon(config.databaseUrl);
    const db = drizzle(sql);

    const migrationsFolder = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "../migrations"
    );

    await migrate(db, { migrationsFolder });
    console.log('Database migrations applied successfully.');

    // Initialize demo data after migrations are applied
    if (storage.constructor.name === 'PostgreSQLStorage') {
      const pgStorage = storage as any;
      if (typeof pgStorage.initialize === 'function') {
        console.log('Initializing demo data...');
        await pgStorage.initialize();
        console.log('Demo data initialization complete.');
      }
    }
  } catch (error) {
    console.error('Error setting up the database:',
      error instanceof Error ? error.message : String(error));
    throw error;
  }
}