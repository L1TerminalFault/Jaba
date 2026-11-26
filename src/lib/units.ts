import type { RawMaterialUnit } from "@/types";

export interface UnitOption {
  label: string;
  value: string;
  factor: number; // Multiplier to get to canonical unit
  category: RawMaterialUnit;
}

export const UNIT_OPTIONS: Record<RawMaterialUnit, UnitOption[]> = {
  g: [
    { label: "Grams (g)", value: "g", factor: 1, category: "g" },
    { label: "Kilograms (kg)", value: "kg", factor: 1000, category: "g" },
    { label: "Quintal (q - 100kg)", value: "quintal", factor: 100000, category: "g" },
    { label: "Tonne (t - 1000kg)", value: "tonne", factor: 1000000, category: "g" },
    { label: "Milligram (mg)", value: "mg", factor: 0.001, category: "g" },
    { label: "Pound (lb)", value: "lb", factor: 453.592, category: "g" },
  ],
  ml: [
    { label: "Millilitres (ml)", value: "ml", factor: 1, category: "ml" },
    { label: "Litres (L)", value: "litre", factor: 1000, category: "ml" },
    { label: "Centilitres (cl)", value: "cl", factor: 10, category: "ml" },
    { label: "Decilitres (dl)", value: "dl", factor: 100, category: "ml" },
    { label: "US Gallon (gal)", value: "gallon", factor: 3785.41, category: "ml" },
    { label: "Cubic Metre (m³)", value: "m3", factor: 1000000, category: "ml" },
  ],
  piece: [
    { label: "Pieces (pcs)", value: "piece", factor: 1, category: "piece" },
    { label: "Dozen (12 pcs)", value: "dozen", factor: 12, category: "piece" },
    { label: "Pack of 10", value: "pack_10", factor: 10, category: "piece" },
    { label: "Pack of 24", value: "pack_24", factor: 24, category: "piece" },
    { label: "Box of 50", value: "box_50", factor: 50, category: "piece" },
    { label: "Box of 100", value: "box_100", factor: 100, category: "piece" },
    { label: "Carton of 200", value: "carton_200", factor: 200, category: "piece" },
  ],
};

/**
 * Returns list of selectable UI unit options for a canonical raw material unit.
 */
export function getUnitsForCanonical(canonical: RawMaterialUnit): UnitOption[] {
  return UNIT_OPTIONS[canonical] || [{ label: canonical, value: canonical, factor: 1, category: canonical }];
}

/**
 * Converts user input in any selected UI unit into the canonical database unit (g, ml, or piece).
 */
export function convertToCanonical(
  value: number,
  selectedUnitValue: string,
  canonical: RawMaterialUnit
): number {
  if (value === 0 || isNaN(value)) return 0;

  const options = UNIT_OPTIONS[canonical] || [];
  const matched = options.find((opt) => opt.value === selectedUnitValue);
  const factor = matched ? matched.factor : 1;

  // Round to 4 decimal places to avoid floating point anomalies
  return Math.round(value * factor * 10000) / 10000;
}

/**
 * Converts canonical database value to target UI unit.
 */
export function convertFromCanonical(
  canonicalValue: number,
  targetUnitValue: string,
  canonical: RawMaterialUnit
): number {
  if (canonicalValue === 0 || isNaN(canonicalValue)) return 0;

  const options = UNIT_OPTIONS[canonical] || [];
  const matched = options.find((opt) => opt.value === targetUnitValue);
  const factor = matched ? matched.factor : 1;

  return Math.round((canonicalValue / factor) * 10000) / 10000;
}

/**
 * Automatically formats canonical values to human-readable units
 * (e.g., 2500 g -> "2.5 kg", 5000000 g -> "5 t", 1500 ml -> "1.5 L").
 */
export function formatWithAutoUnit(
  canonicalValue: number,
  canonicalUnit: RawMaterialUnit
): string {
  if (canonicalValue === null || canonicalValue === undefined) return "0";
  const val = Number(canonicalValue);

  if (canonicalUnit === "g") {
    if (val >= 1000000) {
      return `${(val / 1000000).toLocaleString(undefined, { maximumFractionDigits: 2 })} t`;
    }
    if (val >= 100000) {
      return `${(val / 100000).toLocaleString(undefined, { maximumFractionDigits: 2 })} q`;
    }
    if (val >= 1000) {
      return `${(val / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 })} kg`;
    }
    return `${val.toLocaleString(undefined, { maximumFractionDigits: 2 })} g`;
  }

  if (canonicalUnit === "ml") {
    if (val >= 1000000) {
      return `${(val / 1000000).toLocaleString(undefined, { maximumFractionDigits: 2 })} m³`;
    }
    if (val >= 1000) {
      return `${(val / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 })} L`;
    }
    return `${val.toLocaleString(undefined, { maximumFractionDigits: 2 })} ml`;
  }

  return `${val.toLocaleString(undefined, { maximumFractionDigits: 2 })} pcs`;
}
