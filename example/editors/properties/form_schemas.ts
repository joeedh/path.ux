import { z } from "zod";

// Application-owned fixtures mirror character/location field shapes without importing a consumer
const outfit = z.union([
  z.string(),
  z.object({ description: z.string().default(""), art_notes: z.string().optional() }).strict(),
]);
export const characterFormSchema = z
  .object({
    id            : z.string().min(1),
    type          : z.literal("character").optional(),
    name          : z.string().min(1, "Name is required"),
    status        : z.enum(["draft", "candidates", "approved", "locked"]).default("draft"),
    default_outfit: z.string().default("default"),
    palette       : z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)).default([]),
    traits        : z.array(z.string()).default([]),
    art_notes     : z.string().optional(),
    seed          : z.number().int().nonnegative().optional(),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, "Use a six-digit hex color")
      .optional(),
    outfits       : z.record(outfit).optional(),
    tags          : z.array(z.string()).default([]),
    age           : z.number().int().nonnegative().optional(),
    min           : z.number().optional(),
    max           : z.number().optional(),
  })
  .superRefine((value, context) => {
    if (value.min !== undefined && value.max !== undefined && value.min > value.max)
      context.addIssue({
        code   : "custom",
        path   : ["max"],
        message: "Maximum must be at least minimum",
      });
  });

export const locationFormSchema = z.object({
  id       : z.string().min(1),
  type     : z.literal("location").optional(),
  name     : z.string().min(1),
  mood     : z.string().optional(),
  lighting : z.string().optional(),
  palette  : z.array(z.string()).default([]),
  variants: z
    .array(
      z.union([
        z.string(),
        z.object({ id: z.string().min(1), description: z.string().default("") }),
      ])
    )
    .default(["day"]),
  reference: z
    .discriminatedUnion("kind", [
      z.object({ kind: z.literal("asset"), hash: z.string().min(1) }),
      z.object({ kind: z.literal("plate"), locationId: z.string().min(1), variant: z.string() }),
    ])
    .optional(),
});
