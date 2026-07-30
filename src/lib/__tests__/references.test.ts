import { describe, expect, it } from "vitest";
import type { CommuneReference, ReferenceValue } from "../../types/domain";
import {
  activeReferences,
  normalizeReferenceLabel,
  selectCommune,
  sortReferences,
} from "../references";

describe("référentiels métier", () => {
  it("normalise les espaces sans détruire les accents", () => {
    expect(normalizeReferenceLabel("  SAINT   QUENTIN ")).toBe("SAINT QUENTIN");
    expect(normalizeReferenceLabel("Béguinage")).toBe("Béguinage");
  });

  it("refuse un libellé vide après normalisation", () => {
    expect(() => normalizeReferenceLabel(" \n\t ")).toThrow(
      "Le libellé est obligatoire",
    );
  });

  it("remplit département et zonage depuis la commune choisie", () => {
    const commune: CommuneReference = {
      id: "c1",
      name: "CLAIROIX",
      insee_code: "60156",
      postal_code: "60280",
      department_code: "60",
      department_name: "Oise",
      region_name: "Hauts-de-France",
      housing_zone: "B2",
      is_active: true,
    };

    expect(selectCommune(commune)).toEqual({
      communeId: "c1",
      commune: "CLAIROIX",
      department: "60",
      zoning: "B2",
    });
  });

  it("conserve un zonage vide sans inventer de valeur", () => {
    const commune: CommuneReference = {
      id: "c2",
      name: "AMIENS",
      insee_code: "80021",
      postal_code: "80000",
      department_code: "80",
      department_name: "Somme",
      region_name: "Hauts-de-France",
      housing_zone: null,
      is_active: true,
    };

    expect(selectCommune(commune).zoning).toBe("");
  });

  it("filtre les valeurs inactives et respecte ordre puis libellé", () => {
    const rows: ReferenceValue[] = [
      { id: "2", kind: "ctx", label: "Zoé", is_active: true, sort_order: 20 },
      { id: "1", kind: "ctx", label: "Alice", is_active: true, sort_order: 10 },
      { id: "3", kind: "ctx", label: "Ancien", is_active: false, sort_order: 0 },
      { id: "4", kind: "ctx", label: "Alix", is_active: true, sort_order: 10 },
    ];

    expect(activeReferences(sortReferences(rows)).map((row) => row.label)).toEqual([
      "Alice",
      "Alix",
      "Zoé",
    ]);
  });
});
