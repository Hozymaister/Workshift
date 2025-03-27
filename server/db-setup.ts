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
      
      // Vytvoření tabulek podle schématu
      await client(`
        CREATE TABLE IF NOT EXISTS "users" (
          "id" SERIAL PRIMARY KEY,
          "first_name" TEXT NOT NULL,
          "last_name" TEXT NOT NULL,
          "username" TEXT NOT NULL UNIQUE,
          "email" TEXT NOT NULL UNIQUE,
          "password" TEXT NOT NULL,
          "role" TEXT NOT NULL DEFAULT 'worker',
          "date_of_birth" TIMESTAMP,
          "personal_id" TEXT,
          "phone" TEXT,
          "hourly_wage" INTEGER,
          "notes" TEXT
        )
      `);
      
      await client(`
        CREATE TABLE IF NOT EXISTS "workplaces" (
          "id" SERIAL PRIMARY KEY,
          "name" TEXT NOT NULL,
          "type" TEXT NOT NULL,
          "address" TEXT,
          "notes" TEXT,
          "manager_id" INTEGER,
          "company_name" TEXT,
          "company_id" TEXT,
          "company_vat_id" TEXT,
          "company_address" TEXT
        )
      `);
      
      await client(`
        CREATE TABLE IF NOT EXISTS "shifts" (
          "id" SERIAL PRIMARY KEY,
          "workplace_id" INTEGER NOT NULL,
          "user_id" INTEGER,
          "date" TIMESTAMP,
          "start_time" TIMESTAMP,
          "end_time" TIMESTAMP,
          "notes" TEXT
        )
      `);
      
      await client(`
        CREATE TABLE IF NOT EXISTS "exchange_requests" (
          "id" SERIAL PRIMARY KEY,
          "requester_id" INTEGER NOT NULL,
          "requestee_id" INTEGER,
          "request_shift_id" INTEGER NOT NULL,
          "offered_shift_id" INTEGER NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'pending',
          "notes" TEXT
        )
      `);
      
      await client(`
        CREATE TABLE IF NOT EXISTS "reports" (
          "id" SERIAL PRIMARY KEY,
          "user_id" INTEGER NOT NULL,
          "month" INTEGER NOT NULL,
          "year" INTEGER NOT NULL,
          "total_hours" INTEGER NOT NULL,
          "generated" TIMESTAMP NOT NULL
        )
      `);
      
      await client(`
        CREATE TABLE IF NOT EXISTS "customers" (
          "id" SERIAL PRIMARY KEY,
          "name" TEXT NOT NULL,
          "address" TEXT NOT NULL,
          "city" TEXT,
          "zip" TEXT,
          "ic" TEXT,
          "dic" TEXT,
          "email" TEXT,
          "phone" TEXT,
          "notes" TEXT,
          "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "user_id" INTEGER NOT NULL
        )
      `);
      
      await client(`
        CREATE TABLE IF NOT EXISTS "documents" (
          "id" SERIAL PRIMARY KEY,
          "user_id" INTEGER NOT NULL,
          "name" TEXT NOT NULL,
          "type" TEXT NOT NULL,
          "size" TEXT NOT NULL,
          "path" TEXT NOT NULL,
          "thumbnail_path" TEXT,
          "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      console.log('Všechny tabulky byly úspěšně vytvořeny nebo již existují.');
      
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