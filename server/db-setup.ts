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
          "notes" TEXT,
          "company_name" TEXT,
          "company_id" TEXT,
          "company_vat_id" TEXT,
          "company_address" TEXT,
          "company_city" TEXT,
          "company_zip" TEXT,
          "company_verified" BOOLEAN DEFAULT FALSE,
          "parent_company_id" INTEGER
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
          "hours" INTEGER,
          "notes" TEXT
        )
      `);
      
      // Kontrola a případné přidání sloupce hours, který byl přidán později
      try {
        await client(`
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'shifts' AND column_name = 'hours'
            ) THEN
              ALTER TABLE shifts ADD COLUMN hours INTEGER;
            END IF;
          END
          $$;
        `);
        console.log('Sloupec hours byl úspěšně zkontrolován a v případě potřeby přidán.');
      } catch (err) {
        console.error('Chyba při kontrole nebo přidání sloupce hours:', err);
      }
      
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
      
      // Vytvoření tabulky faktur
      await client(`
        CREATE TABLE IF NOT EXISTS "invoices" (
          "id" SERIAL PRIMARY KEY,
          "user_id" INTEGER NOT NULL,
          "invoice_number" TEXT NOT NULL,
          "type" TEXT NOT NULL DEFAULT 'issued',
          "date" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "date_due" TIMESTAMP NOT NULL,
          "date_issued" TIMESTAMP,
          "date_received" TIMESTAMP,
          "customer_name" TEXT NOT NULL,
          "customer_address" TEXT NOT NULL,
          "customer_ic" TEXT,
          "customer_dic" TEXT,
          "supplier_name" TEXT,
          "supplier_address" TEXT,
          "supplier_ic" TEXT,
          "supplier_dic" TEXT,
          "bank_account" TEXT,
          "payment_method" TEXT NOT NULL DEFAULT 'bank',
          "is_vat_payer" BOOLEAN DEFAULT TRUE,
          "amount" INTEGER NOT NULL DEFAULT 0,
          "notes" TEXT,
          "is_paid" BOOLEAN DEFAULT FALSE,
          "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Vytvoření tabulky položek faktury
      await client(`
        CREATE TABLE IF NOT EXISTS "invoice_items" (
          "id" SERIAL PRIMARY KEY,
          "invoice_id" INTEGER NOT NULL,
          "description" TEXT NOT NULL,
          "quantity" INTEGER NOT NULL,
          "unit" TEXT NOT NULL,
          "price_per_unit" INTEGER NOT NULL DEFAULT 0
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