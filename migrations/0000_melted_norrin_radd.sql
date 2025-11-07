CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"city" text,
	"zip" text,
	"ic" text,
	"dic" text,
	"email" text,
	"phone" text,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"user_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"size" text NOT NULL,
	"path" text NOT NULL,
	"thumbnail_path" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "exchange_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"requester_id" integer NOT NULL,
	"requestee_id" integer,
	"request_shift_id" integer NOT NULL,
	"offered_shift_id" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "invoice_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer NOT NULL,
	"description" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit" text NOT NULL,
	"price_per_unit" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"invoice_number" text NOT NULL,
	"type" text DEFAULT 'issued' NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
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
	"payment_method" text DEFAULT 'bank' NOT NULL,
	"is_vat_payer" boolean DEFAULT true,
	"amount" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"is_paid" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"total_hours" integer NOT NULL,
	"generated" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar(255) PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shifts" (
	"id" serial PRIMARY KEY NOT NULL,
	"workplace_id" integer NOT NULL,
	"user_id" integer,
	"date" timestamp,
	"start_time" timestamp,
	"end_time" timestamp,
	"hours" integer,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"role" text DEFAULT 'worker' NOT NULL,
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
	"parent_company_id" integer,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "workplaces" (
	"id" serial PRIMARY KEY NOT NULL,
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
--> statement-breakpoint
CREATE INDEX "IDX_sessions_expire" ON "sessions" USING btree ("expire");