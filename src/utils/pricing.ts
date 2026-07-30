/**
 * Utility functions for product pricing calculations.
 * Shared across client-side cart context and server-side checkout APIs.
 */

export function getFormatPriceCents(basePriceCents: number, format: string): number {
  const normalized = format.trim().toLowerCase();
  if (normalized === "le duo" || normalized === "duo") {
    return Math.round(basePriceCents * 1.8);
  }
  if (
    normalized === "le deluxe box" ||
    normalized === "deluxe box" ||
    normalized === "le deluxe"
  ) {
    return Math.round(basePriceCents * 3.2);
  }
  return basePriceCents; // Default: "Le Solo" or base price
}
