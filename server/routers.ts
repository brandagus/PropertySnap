import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { storagePut, storageGet } from "./storage";
import { uploadPhotoToR2, getR2SignedUrl, isR2Configured } from "./r2-storage";

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ============ PROPERTY ROUTES ============
  properties: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getPropertiesByOwner(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getPropertyById(input.id);
      }),

    create: protectedProcedure
      .input(z.object({
        address: z.string().min(1),
        type: z.enum(["house", "apartment", "unit", "townhouse", "other"]).default("house"),
        bedrooms: z.number().optional(),
        bathrooms: z.number().optional(),
        latitude: z.string().optional(),
        longitude: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createProperty({
          ownerId: ctx.user.id,
          address: input.address,
          type: input.type,
          bedrooms: input.bedrooms,
          bathrooms: input.bathrooms,
          latitude: input.latitude,
          longitude: input.longitude,
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        address: z.string().min(1).optional(),
        type: z.enum(["house", "apartment", "unit", "townhouse", "other"]).optional(),
        bedrooms: z.number().optional(),
        bathrooms: z.number().optional(),
        latitude: z.string().optional(),
        longitude: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateProperty(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteProperty(input.id);
        return { success: true };
      }),
  }),

  // ============ TENANT ROUTES ============
  tenants: router({
    listByProperty: protectedProcedure
      .input(z.object({ propertyId: z.number() }))
      .query(async ({ input }) => {
        return db.getTenantsByProperty(input.propertyId);
      }),

    create: protectedProcedure
      .input(z.object({
        propertyId: z.number(),
        name: z.string().min(1),
        email: z.string().email().optional(),
        phone: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createTenant({
          propertyId: input.propertyId,
          name: input.name,
          email: input.email,
          phone: input.phone,
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateTenant(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteTenant(input.id);
        return { success: true };
      }),
  }),

  // ============ INSPECTION ROUTES ============
  inspections: router({
    listByProperty: protectedProcedure
      .input(z.object({ propertyId: z.number() }))
      .query(async ({ input }) => {
        return db.getInspectionsByProperty(input.propertyId);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getInspectionById(input.id);
      }),

    create: protectedProcedure
      .input(z.object({
        propertyId: z.number(),
        type: z.enum(["move-in", "move-out", "routine"]),
        date: z.string().transform((s) => new Date(s)),
        dueDate: z.string().transform((s) => new Date(s)).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createInspection({
          propertyId: input.propertyId,
          type: input.type,
          date: input.date,
          dueDate: input.dueDate,
          notes: input.notes,
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pending", "in-progress", "completed"]).optional(),
        completedAt: z.string().transform((s) => new Date(s)).optional(),
        landlordSignature: z.string().optional(),
        tenantSignature: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateInspection(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteInspection(input.id);
        return { success: true };
      }),
  }),

  // ============ CHECKPOINT ROUTES ============
  checkpoints: router({
    listByInspection: protectedProcedure
      .input(z.object({ inspectionId: z.number() }))
      .query(async ({ input }) => {
        return db.getCheckpointsByInspection(input.inspectionId);
      }),

    create: protectedProcedure
      .input(z.object({
        inspectionId: z.number(),
        room: z.string().min(1),
        condition: z.enum(["excellent", "good", "fair", "poor", "damaged"]).default("good"),
        notes: z.string().optional(),
        photos: z.array(z.string()).optional(),
        verifiedPhotoData: z.object({
          capturedAt: z.string(),
          hash: z.string(),
          capturedInApp: z.boolean(),
          gpsLatitude: z.number().optional(),
          gpsLongitude: z.number().optional(),
          gpsAccuracy: z.number().optional(),
          distanceFromProperty: z.number().optional(),
        }).optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createCheckpoint({
          inspectionId: input.inspectionId,
          room: input.room,
          condition: input.condition,
          notes: input.notes,
          photos: input.photos,
          verifiedPhotoData: input.verifiedPhotoData,
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        condition: z.enum(["excellent", "good", "fair", "poor", "damaged"]).optional(),
        notes: z.string().optional(),
        photos: z.array(z.string()).optional(),
        verifiedPhotoData: z.object({
          capturedAt: z.string(),
          hash: z.string(),
          capturedInApp: z.boolean(),
          gpsLatitude: z.number().optional(),
          gpsLongitude: z.number().optional(),
          gpsAccuracy: z.number().optional(),
          distanceFromProperty: z.number().optional(),
        }).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateCheckpoint(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteCheckpoint(input.id);
        return { success: true };
      }),
  }),

  // ============ TEAM/BRANDING ROUTES ============
  team: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return db.getTeamByOwner(ctx.user.id);
    }),

    upsert: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        logo: z.string().optional(),
        primaryColor: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const existing = await db.getTeamByOwner(ctx.user.id);
        if (existing) {
          await db.updateTeam(existing.id, input);
          return { ...existing, ...input };
        } else {
          return db.createTeam({
            ownerId: ctx.user.id,
            name: input.name,
            logo: input.logo,
            primaryColor: input.primaryColor,
          });
        }
      }),
  }),

  // ============ STORAGE ROUTES ============
  storage: router({
    uploadPhoto: protectedProcedure
      .input(z.object({
        base64Data: z.string(),
        fileName: z.string(),
        contentType: z.string().default("image/jpeg"),
      }))
      .mutation(async ({ ctx, input }) => {
        // Try R2 first, fall back to built-in storage
        if (isR2Configured()) {
          try {
            return await uploadPhotoToR2(input.base64Data, input.fileName, input.contentType);
          } catch (error) {
            console.warn("R2 upload failed, falling back to built-in storage:", error);
          }
        }
        
        // Fallback to built-in storage
        const buffer = Buffer.from(input.base64Data, "base64");
        const key = `photos/${ctx.user.id}/${Date.now()}-${input.fileName}`;
        const result = await storagePut(key, buffer, input.contentType);
        return result;
      }),

    getPhotoUrl: protectedProcedure
      .input(z.object({ key: z.string() }))
      .query(async ({ input }) => {
        // Check if it's an R2 key
        if (isR2Configured() && input.key.startsWith("photos/")) {
          try {
            const url = await getR2SignedUrl(input.key);
            return { key: input.key, url };
          } catch (error) {
            console.warn("R2 URL generation failed, falling back:", error);
          }
        }
        return storageGet(input.key);
      }),
  }),
});

export type AppRouter = typeof appRouter;
