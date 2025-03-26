import { neon } from '@neondatabase/serverless';
import { storage } from './storage';

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
    
    // Create tables if they don't exist already
    try {
      console.log('Ensuring database tables exist...');
      
      // No need to run migrations since we've created tables manually
      
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
      
    } catch (initError) {
      console.error('Error initializing database data:',
        initError instanceof Error ? initError.message : String(initError));
    }
    
  } catch (error) {
    console.error('Error setting up the database:',
      error instanceof Error ? error.message : String(error));
  }
}