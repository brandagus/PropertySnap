import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { 
  InsertUser, 
  users, 
  properties, 
  tenants, 
  inspections, 
  checkpoints, 
  teams,
  InsertProperty,
  InsertTenant,
  InsertInspection,
  InsertCheckpoint,
  InsertTeam
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const sql = neon(process.env.DATABASE_URL);
      _db = drizzle(sql);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ USER OPERATIONS ============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    // Check if user exists
    const existing = await db.select().from(users).where(eq(users.openId, user.openId)).limit(1);
    
    if (existing.length > 0) {
      // Update existing user
      await db.update(users)
        .set({
          name: user.name ?? existing[0].name,
          email: user.email ?? existing[0].email,
          phone: user.phone ?? existing[0].phone,
          loginMethod: user.loginMethod ?? existing[0].loginMethod,
          lastSignedIn: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.openId, user.openId));
    } else {
      // Insert new user
      const role = user.openId === ENV.ownerOpenId ? "admin" : (user.role ?? "user");
      await db.insert(users).values({
        openId: user.openId,
        name: user.name,
        email: user.email,
        phone: user.phone,
        loginMethod: user.loginMethod,
        role: role,
        lastSignedIn: new Date(),
      });
    }
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ PROPERTY OPERATIONS ============

export async function createProperty(data: InsertProperty) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(properties).values(data).returning();
  return result[0];
}

export async function getPropertiesByOwner(ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(properties).where(eq(properties.ownerId, ownerId));
}

export async function getPropertyById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(properties).where(eq(properties.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateProperty(id: number, data: Partial<InsertProperty>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(properties).set({ ...data, updatedAt: new Date() }).where(eq(properties.id, id));
}

export async function deleteProperty(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(properties).where(eq(properties.id, id));
}

// ============ TENANT OPERATIONS ============

export async function createTenant(data: InsertTenant) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(tenants).values(data).returning();
  return result[0];
}

export async function getTenantsByProperty(propertyId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(tenants).where(eq(tenants.propertyId, propertyId));
}

export async function updateTenant(id: number, data: Partial<InsertTenant>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(tenants).set({ ...data, updatedAt: new Date() }).where(eq(tenants.id, id));
}

export async function deleteTenant(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(tenants).where(eq(tenants.id, id));
}

// ============ INSPECTION OPERATIONS ============

export async function createInspection(data: InsertInspection) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(inspections).values(data).returning();
  return result[0];
}

export async function getInspectionsByProperty(propertyId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(inspections).where(eq(inspections.propertyId, propertyId));
}

export async function getInspectionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(inspections).where(eq(inspections.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateInspection(id: number, data: Partial<InsertInspection>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(inspections).set({ ...data, updatedAt: new Date() }).where(eq(inspections.id, id));
}

export async function deleteInspection(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(inspections).where(eq(inspections.id, id));
}

// ============ CHECKPOINT OPERATIONS ============

export async function createCheckpoint(data: InsertCheckpoint) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(checkpoints).values(data).returning();
  return result[0];
}

export async function getCheckpointsByInspection(inspectionId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(checkpoints).where(eq(checkpoints.inspectionId, inspectionId));
}

export async function updateCheckpoint(id: number, data: Partial<InsertCheckpoint>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(checkpoints).set({ ...data, updatedAt: new Date() }).where(eq(checkpoints.id, id));
}

export async function deleteCheckpoint(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(checkpoints).where(eq(checkpoints.id, id));
}

// ============ TEAM OPERATIONS ============

export async function createTeam(data: InsertTeam) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(teams).values(data).returning();
  return result[0];
}

export async function getTeamByOwner(ownerId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(teams).where(eq(teams.ownerId, ownerId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateTeam(id: number, data: Partial<InsertTeam>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(teams).set({ ...data, updatedAt: new Date() }).where(eq(teams.id, id));
}
