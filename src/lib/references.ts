import type { CommuneReference, ReferenceValue } from "../types/domain";

export function normalizeReferenceLabel(value: string): string {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) throw new Error("Le libellé est obligatoire");
  return normalized;
}

export function selectCommune(commune: CommuneReference): {
  communeId: string;
  commune: string;
  department: string;
  zoning: string;
} {
  return {
    communeId: commune.id,
    commune: commune.name,
    department: commune.department_code,
    zoning: commune.housing_zone ?? "",
  };
}

export function sortReferences<T extends ReferenceValue>(rows: T[]): T[] {
  return [...rows].sort(
    (left, right) =>
      left.sort_order - right.sort_order ||
      left.label.localeCompare(right.label, "fr"),
  );
}

export function activeReferences<T extends ReferenceValue>(rows: T[]): T[] {
  return rows.filter((row) => row.is_active);
}
