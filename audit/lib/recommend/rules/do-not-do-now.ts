/**
 * T068 — Do-not-do-now rules.
 *
 * Compatibility alias: the spec discusses "exclusions" and "do not do now"
 * as two slices of the same concept. We keep them as a single rule library
 * for now and re-export from here so the file separation matches the spec
 * for future evolution (e.g., when do-not-do-now grows beyond exclusions to
 * include premature/risky positive actions).
 */
export { generateExclusions as generateDoNotDoNow } from "./exclusions";
