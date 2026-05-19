/**
 * Vendor-admin constants re-exported as plain module values.
 *
 * Lives in its own file because the admin actions module is `"use server"` —
 * which Next.js restricts to async-function exports only. Anything else
 * (objects, arrays, classes) must live outside the action module.
 */
import { VENDOR_STATUSES, VENDOR_CATEGORIES } from "@/db/schema";

export const VENDOR_STATUS_VALUES = VENDOR_STATUSES;
export const VENDOR_CATEGORY_VALUES = VENDOR_CATEGORIES;
