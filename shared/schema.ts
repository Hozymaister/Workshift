import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Customer schema - pro adresář zákazníků
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  city: text("city"),
  zip: text("zip"),
  ic: text("ic"),
  dic: text("dic"),
  email: text("email"),
  phone: text("phone"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  userId: integer("user_id").notNull(), // Pro vazbu na vlastníka záznamu
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
});

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["admin", "worker", "company"] }).notNull().default("worker"),
  dateOfBirth: timestamp("date_of_birth"),
  personalId: text("personal_id"), // Rodné číslo pro zaměstnance
  phone: text("phone"),
  hourlyWage: integer("hourly_wage"),
  notes: text("notes"),
  // Firemní údaje
  companyName: text("company_name"), // Název firmy
  companyId: text("company_id"),  // IČO firmy
  companyVatId: text("company_vat_id"), // DIČ firmy
  companyAddress: text("company_address"), // Adresa firmy
  companyCity: text("company_city"), // Město
  companyZip: text("company_zip"), // PSČ
  companyVerified: boolean("company_verified").default(false), // Zda byla firma ověřena (např. po kontrole IČO)
  parentCompanyId: integer("parent_company_id"), // ID nadřazené firmy (pokud je uživatel zaměstnancem)
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

// Workplace schema
export const workplaces = pgTable("workplaces", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type", { enum: ["warehouse", "event", "club", "office", "other"] }).notNull(),
  address: text("address"),
  notes: text("notes"),
  managerId: integer("manager_id"),
  ownerId: integer("owner_id"), // ID firmy, která vlastní toto pracoviště
  // Údaje o klientovi/firmě
  companyName: text("company_name"),
  companyId: text("company_id"), // IČO
  companyVatId: text("company_vat_id"), // DIČ
  companyAddress: text("company_address"),
});

export const insertWorkplaceSchema = createInsertSchema(workplaces).omit({
  id: true,
});

// Shift schema
export const shifts = pgTable("shifts", {
  id: serial("id").primaryKey(),
  workplaceId: integer("workplace_id").notNull(),
  userId: integer("user_id"),
  date: timestamp("date", { mode: 'string' }),
  startTime: timestamp("start_time", { mode: 'string' }),
  endTime: timestamp("end_time", { mode: 'string' }),
  hours: integer("hours"),
  notes: text("notes"),
});

export const insertShiftSchema = createInsertSchema(shifts).omit({
  id: true,
});

// Exchange request schema
export const exchangeRequests = pgTable("exchange_requests", {
  id: serial("id").primaryKey(),
  requesterId: integer("requester_id").notNull(),
  requesteeId: integer("requestee_id"),
  requestShiftId: integer("request_shift_id").notNull(),
  offeredShiftId: integer("offered_shift_id").notNull(),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
  notes: text("notes"),
});

export const insertExchangeRequestSchema = createInsertSchema(exchangeRequests).omit({
  id: true,
});

// Report schema
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  totalHours: integer("total_hours").notNull(),
  generated: timestamp("generated").notNull(),
});

export const insertReportSchema = createInsertSchema(reports).omit({
  id: true,
});

// Document schema - pro naskenované dokumenty
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  type: text("type", { enum: ["image", "pdf"] }).notNull(),
  size: text("size").notNull(),
  path: text("path").notNull(),
  thumbnailPath: text("thumbnail_path"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertWorkplace = z.infer<typeof insertWorkplaceSchema>;
export type Workplace = typeof workplaces.$inferSelect;

export type InsertShift = z.infer<typeof insertShiftSchema>;
export type Shift = typeof shifts.$inferSelect;

export type InsertExchangeRequest = z.infer<typeof insertExchangeRequestSchema>;
export type ExchangeRequest = typeof exchangeRequests.$inferSelect;

export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reports.$inferSelect;

export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;
