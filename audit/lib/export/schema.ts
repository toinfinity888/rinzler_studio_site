import { z } from "zod";

/**
 * Versioned JSON export contract — mirrors specs/.../contracts/json-export.schema.json.
 * v1 is forward-compatible: future versions add optional fields (e.g.
 * `aiRecommendations`) without removing or renaming any v1 field (FR-046).
 */

export const ExportV1 = z.object({
  schemaVersion: z.literal("audit-export.v1"),
  exportedAt: z.string(),
  project: z.object({
    id: z.string(),
    label: z.string(),
    hotelName: z.string().nullable(),
    contactEmail: z.string().email(),
    priority: z.enum(["low", "medium", "high"]),
    status: z.enum([
      "draft",
      "awaiting",
      "in_progress",
      "submitted",
      "reopened",
      "purged",
    ]),
    ongoingEngagement: z.boolean(),
    createdAt: z.string(),
    sentAt: z.string().nullable(),
    submittedAt: z.string().nullable(),
    lastEditedAt: z.string().nullable(),
    lastAdminActivityAt: z.string(),
  }),
  submission: z.object({
    completionPct: z.number().int().min(0).max(100),
    updatedAt: z.string(),
    sections: z
      .array(
        z.object({
          id: z.string().regex(/^s[1-8]$/),
          title: z.string(),
          answers: z.array(
            z.object({
              fieldId: z.string(),
              label: z.string().optional(),
              value: z.unknown(),
              source: z.enum(["client", "admin_prefill"]).optional(),
              updatedAt: z.string().optional(),
            }),
          ),
        }),
      )
      .min(8),
  }),
  scores: z
    .array(
      z.object({
        name: z.enum([
          "automation_opportunity",
          "operational_complexity",
          "modernization_readiness",
          "digital_maturity",
        ]),
        value: z.number().int().min(0).max(100),
        band: z.enum(["low", "medium", "high"]),
        basis: z.array(z.string()).optional(),
        computedAt: z.string().optional(),
      }),
    )
    .min(4),
  internalNotes: z
    .array(
      z.object({
        id: z.string(),
        authorEmail: z.string().email(),
        body: z.string(),
        createdAt: z.string(),
      }),
    )
    .optional(),
});

export type ExportV1Type = z.infer<typeof ExportV1>;
