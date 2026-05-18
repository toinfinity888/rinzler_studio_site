import { BOOKING_ENGINE } from "./booking-engine";
import { CHANNEL_MANAGER } from "./channel-manager";
import { CRM } from "./crm";
import { GUEST_MESSAGING } from "./guest-messaging";
import { PMS } from "./pms";
import type { FingerprintCategory } from "./types";

export const ALL_FINGERPRINT_CATEGORIES: readonly FingerprintCategory[] = [
  BOOKING_ENGINE,
  PMS,
  CHANNEL_MANAGER,
  CRM,
  GUEST_MESSAGING,
];

export { BOOKING_ENGINE, CHANNEL_MANAGER, CRM, GUEST_MESSAGING, PMS };
export type { FingerprintCategory, VendorFingerprint } from "./types";
