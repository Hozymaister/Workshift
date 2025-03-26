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
  role: text("role", { enum: ["admin", "worker"] }).notNull().default("worker"),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

// Workplace schema
export const workplaces = pgTable("workplaces", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type", { enum: ["warehouse", "event", "club"] }).notNull(),
  address: text("address"),
  notes: text("notes"),
});

export const insertWorkplaceSchema = createInsertSchema(workplaces).omit({
  id: true,
});

// Shift schema
export const shifts = pgTable("shifts", {
  id: serial("id").primaryKey(),
  workplaceId: integer("workplace_id").notNull(),
  userId: integer("user_id"),
  date: timestamp("date").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
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
