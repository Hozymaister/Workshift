import { neon } from '@neondatabase/serverless';
import { exec } from 'child_process';
import { promisify } from 'util';
import { storage } from './storage';

const execPromise = promisify(exec);

export async function setupDatabase() {
  try {
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL environment variable is not set');
      return;
    }

    console.log('Starting database setup...');
    
    const client = neon(process.env.DATABASE_URL);
    
    // Create sessions table if not exists
    try {
      await client(`
        CREATE TABLE IF NOT EXISTS "sessions" (
          "sid" VARCHAR NOT NULL PRIMARY KEY,
          "sess" JSON NOT NULL,
          "expire" TIMESTAMP(6) NOT NULL
        )
      `);
      
      await client(`
        CREATE INDEX IF NOT EXISTS "IDX_sessions_expire" ON "sessions" ("expire")
      `);
      
      console.log('Sessions table setup completed successfully!');
    } catch (err) {
      console.error('Error setting up sessions table:', err);
    }
    
    // Run the drizzle-kit push command to create schema tables
    try {
      console.log('Running database migrations...');
      
      // Use command line drizzle-kit push to create tables
      try {
        // Use environment variables for DATABASE_URL
        await execPromise('npm run db:push -- --accept-data-loss');
        console.log('Database migrations completed successfully!');
      } catch (error) {
        console.error('Error running db:push command:', 
          error instanceof Error ? error.message : String(error));
      }
      
      // Initialize demo data after tables are created
      if (process.env.DATABASE_URL && storage.constructor.name === 'PostgreSQLStorage') {
        // Cast to access the initialize method
        const pgStorage = storage as any;
        if (typeof pgStorage.initialize === 'function') {
          console.log('Initializing demo data...');
          await pgStorage.initialize();
          console.log('Demo data initialization complete.');
        }
      }
      
    } catch (migrationError) {
      console.error('Error running migrations:',
        migrationError instanceof Error ? migrationError.message : String(migrationError));
    }
    
  } catch (error) {
    console.error('Error setting up the database:',
      error instanceof Error ? error.message : String(error));
  }
}