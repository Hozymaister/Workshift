CREATE TABLE IF NOT EXISTS "users" (
  "id" serial PRIMARY KEY,
  "first_name" text NOT NULL,
  "last_name" text NOT NULL,
  "username" text NOT NULL,
  "email" text NOT NULL,
  "password" text NOT NULL,
  "role" text NOT NULL DEFAULT 'worker',
  "date_of_birth" timestamp,
  "personal_id" text,
  "phone" text,
  "hourly_wage" integer,
  "notes" text,
  "company_name" text,
  "company_id" text,
  "company_vat_id" text,
  "company_address" text,
  "company_city" text,
  "company_zip" text,
  "company_verified" boolean DEFAULT false,
  "parent_company_id" integer
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_username_unique" ON "users" ("username");
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_unique" ON "users" ("email");

CREATE TABLE IF NOT EXISTS "workplaces" (
  "id" serial PRIMARY KEY,
  "name" text NOT NULL,
  "type" text NOT NULL,
  "address" text,
  "notes" text,
  "manager_id" integer,
  "owner_id" integer,
  "company_name" text,
  "company_id" text,
  "company_vat_id" text,
  "company_address" text
);

CREATE TABLE IF NOT EXISTS "shifts" (
  "id" serial PRIMARY KEY,
  "workplace_id" integer NOT NULL,
  "user_id" integer,
  "date" timestamp,
  "start_time" timestamp,
  "end_time" timestamp,
  "hours" integer,
  "notes" text
);

CREATE TABLE IF NOT EXISTS "exchange_requests" (
  "id" serial PRIMARY KEY,
  "requester_id" integer NOT NULL,
  "requestee_id" integer,
  "request_shift_id" integer NOT NULL,
  "offered_shift_id" integer NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "notes" text
);

CREATE TABLE IF NOT EXISTS "reports" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL,
  "month" integer NOT NULL,
  "year" integer NOT NULL,
  "total_hours" integer NOT NULL,
  "generated" timestamp NOT NULL
);

CREATE TABLE IF NOT EXISTS "customers" (
  "id" serial PRIMARY KEY,
  "name" text NOT NULL,
  "address" text NOT NULL,
  "city" text,
  "zip" text,
  "ic" text,
  "dic" text,
  "email" text,
  "phone" text,
  "notes" text,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
  "user_id" integer NOT NULL
);

CREATE TABLE IF NOT EXISTS "documents" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL,
  "name" text NOT NULL,
  "type" text NOT NULL,
  "size" text NOT NULL,
  "path" text NOT NULL,
  "thumbnail_path" text,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "invoices" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL,
  "invoice_number" text NOT NULL,
  "type" text NOT NULL DEFAULT 'issued',
  "date" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "date_due" timestamp NOT NULL,
  "date_issued" timestamp,
  "date_received" timestamp,
  "customer_name" text NOT NULL,
  "customer_address" text NOT NULL,
  "customer_ic" text,
  "customer_dic" text,
  "supplier_name" text,
  "supplier_address" text,
  "supplier_ic" text,
  "supplier_dic" text,
  "bank_account" text,
  "payment_method" text NOT NULL DEFAULT 'bank',
  "is_vat_payer" boolean DEFAULT true,
  "amount" integer NOT NULL DEFAULT 0,
  "notes" text,
  "is_paid" boolean DEFAULT false,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "invoice_items" (
  "id" serial PRIMARY KEY,
  "invoice_id" integer NOT NULL,
  "description" text NOT NULL,
  "quantity" integer NOT NULL,
  "unit" text NOT NULL,
  "price_per_unit" integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "sessions" (
  "sid" varchar NOT NULL PRIMARY KEY,
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
);

CREATE INDEX IF NOT EXISTS "sessions_expire_idx" ON "sessions" ("expire");
