import { 
  pgTable, 
  serial, 
  text, 
  timestamp, 
  varchar, 
  integer, 
  boolean,
  json,
  pgEnum
} from "drizzle-orm/pg-core";

// Enums
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const propertyTypeEnum = pgEnum("property_type", ["house", "apartment", "unit", "townhouse", "other"]);
export const inspectionTypeEnum = pgEnum("inspection_type", ["move-in", "move-out", "routine"]);
export const inspectionStatusEnum = pgEnum("inspection_status", ["pending", "in-progress", "completed"]);
export const conditionEnum = pgEnum("condition", ["excellent", "good", "fair", "poor", "damaged"]);

/**
 * Users table - for landlords and tenants
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("open_id", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  loginMethod: varchar("login_method", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastSignedIn: timestamp("last_signed_in").defaultNow().notNull(),
});

/**
 * Properties table
 */
export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").notNull().references(() => users.id),
  address: text("address").notNull(),
  type: propertyTypeEnum("type").default("house").notNull(),
  bedrooms: integer("bedrooms").default(1),
  bathrooms: integer("bathrooms").default(1),
  latitude: text("latitude"),
  longitude: text("longitude"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Tenants table - links tenants to properties
 */
export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id),
  userId: integer("user_id").references(() => users.id), // null if tenant hasn't signed up yet
  name: text("name").notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Inspections table
 */
export const inspections = pgTable("inspections", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id),
  type: inspectionTypeEnum("type").notNull(),
  status: inspectionStatusEnum("status").default("pending").notNull(),
  date: timestamp("date").notNull(),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  landlordSignature: text("landlord_signature"),
  tenantSignature: text("tenant_signature"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Checkpoints table - individual items in an inspection
 */
export const checkpoints = pgTable("checkpoints", {
  id: serial("id").primaryKey(),
  inspectionId: integer("inspection_id").notNull().references(() => inspections.id),
  room: text("room").notNull(),
  condition: conditionEnum("condition").default("good").notNull(),
  notes: text("notes"),
  photos: json("photos").$type<string[]>().default([]),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  verifiedPhotoData: json("verified_photo_data").$type<{
    capturedAt: string;
    hash: string;
    capturedInApp: boolean;
    gpsLatitude?: number;
    gpsLongitude?: number;
    gpsAccuracy?: number;
    distanceFromProperty?: number;
  } | null>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Team/Company branding table
 */
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  logo: text("logo"),
  primaryColor: varchar("primary_color", { length: 7 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export type Property = typeof properties.$inferSelect;
export type InsertProperty = typeof properties.$inferInsert;

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = typeof tenants.$inferInsert;

export type Inspection = typeof inspections.$inferSelect;
export type InsertInspection = typeof inspections.$inferInsert;

export type Checkpoint = typeof checkpoints.$inferSelect;
export type InsertCheckpoint = typeof checkpoints.$inferInsert;

export type Team = typeof teams.$inferSelect;
export type InsertTeam = typeof teams.$inferInsert;
