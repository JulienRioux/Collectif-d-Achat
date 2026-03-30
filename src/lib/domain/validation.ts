import { z } from "zod";

const moneyField = z.coerce.number().min(0).max(999999);
const intField = z.coerce.number().int();

const basketProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  origin: z.string().trim().min(1).max(30),
  packPrice: moneyField,
  primaryPackaging: z.string().trim().min(1).max(30),
  unitsPerPack: z.coerce.number().int().min(1).max(9999),
  casesToBuy: z.coerce.number().int().min(0).max(999),
});

const basketSectionSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().trim().min(1).max(120),
    unitPrice: moneyField,
    minQuantity: intField.min(0).max(999),
    maxQuantity: intField.min(0).max(999),
    products: z.array(basketProductSchema).max(100),
  })
  .superRefine((value, ctx) => {
    if (value.minQuantity > value.maxQuantity) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Section minQuantity cannot be greater than maxQuantity.",
        path: ["minQuantity"],
      });
    }
  });

export const updateBasketSchema = z
  .object({
    weekLabel: z.string().trim().min(2).max(120).optional(),
    isOpen: z.boolean().optional(),
    sections: z.array(basketSectionSchema).min(1).max(30).optional(),
  })
  .superRefine((value, ctx) => {
    void ctx;
    void value;
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided.",
  });

export const createOrderSchema = z.object({
  basketId: z.string().uuid(),
  customerName: z.string().trim().min(1).max(120),
  sectionSelections: z
    .array(
      z.object({
        sectionId: z.string().uuid(),
        quantity: intField.min(0).max(999),
      })
    )
    .min(1)
    .max(60),
});
