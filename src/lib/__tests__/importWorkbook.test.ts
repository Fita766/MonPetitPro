import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  isOperationSheetHeader,
  normalizeNameKey,
  parseWorkbookRows,
  prepareImport,
  type NormalizedImportRow,
} from "../importWorkbook";

const row = (name: string, extra: Partial<NormalizedImportRow> = {}): NormalizedImportRow => ({
  name,
  raw: [],
  ...extra,
});

describe("parseWorkbookRows", () => {
  it("rejette toute tentative d'écriture : aperçu et préparation restent purs", () => {
    const source = readFileSync("src/lib/importWorkbook.ts", "utf8");
    expect(source).not.toMatch(/from\s+['"](?:xlsx|@supabase\/supabase-js)['"]/);
    expect(source).not.toContain("supabase");
    expect(source).not.toContain(".insert(");
  });

  it("mappe les colonnes par nom, insensible à la casse, aux accents et aux espaces", () => {
    const header = ["NOM DE L’OPÉRATION", " Commune ", "Dpt"];
    const rows = [["Amiens Hoche", "AMIENS", "80"]];
    const { normalized, rejected } = parseWorkbookRows(rows, header);
    expect(rejected).toEqual([]);
    expect(normalized).toEqual([
      { name: "Amiens Hoche", commune: "AMIENS", department: "80", raw: ["Amiens Hoche", "AMIENS", "80"] },
    ]);
  });

  it("compose le nom depuis commune + localisation quand l'en-tête n'a pas de colonne nom", () => {
    const header = ["COMMUNE", "Localisation", "Dpt", "Nb logts"];
    const rows = [["AMIENS", "Rue Dejean", "80", 128]];
    const { normalized, rejected } = parseWorkbookRows(rows, header);
    expect(rejected).toEqual([]);
    expect(normalized[0]).toMatchObject({
      name: "AMIENS Rue Dejean",
      commune: "AMIENS",
      department: "80",
      totalHousingUnits: 128,
    });
    expect(normalized[0].raw).toEqual(["AMIENS", "Rue Dejean", "80", 128]);
  });

  it("normalise les nombres français « 1 234,5 » et laisse vide/null à null", () => {
    const header = ["Nom", "Nb logts"];
    const rows = [
      ["A", "1 234,5"],
      ["B", ""],
      ["C", null],
      ["D", "12,5"],
      ["E", "texte"],
    ];
    const { normalized } = parseWorkbookRows(rows, header);
    expect(normalized.map((r) => r.totalHousingUnits)).toEqual([1234.5, null, null, 12.5, null]);
  });

  it("rejette une ligne sans nom exploitable avec une raison lisible et son numéro de ligne", () => {
    const header = ["Nom de l’opération", "COMMUNE"];
    const rows = [["  ", "AMIENS"], ["", "CLAIROIX"], ["Réel", ""]];
    const { normalized, rejected } = parseWorkbookRows(rows, header);
    expect(normalized.map((r) => r.name)).toEqual(["Réel"]);
    expect(rejected).toEqual([
      { row: 1, reason: "nom d’opération manquant" },
      { row: 2, reason: "nom d’opération manquant" },
    ]);
  });

  it("ignore les lignes entièrement vides sans les rejeter", () => {
    const header = ["Nom de l’opération", "Dpt"];
    const rows = [["Amiens Hoche", "80"], [null, null], ["", "  "]];
    const { normalized, rejected } = parseWorkbookRows(rows, header);
    expect(normalized.map((r) => r.name)).toEqual(["Amiens Hoche"]);
    expect(rejected).toEqual([]);
  });

  it("rejette les lignes quand l'en-tête ne fournit aucun nom ni localisation", () => {
    const header = ["COMMUNE", "Dpt"];
    const rows = [["AMIENS", "80"]];
    const { normalized, rejected } = parseWorkbookRows(rows, header);
    expect(normalized).toEqual([]);
    expect(rejected).toEqual([{ row: 1, reason: "nom d’opération introuvable dans l’en-tête" }]);
  });

  it("ne lève jamais sur des cellules malformées", () => {
    const header = [42, null, "COMMUNE"];
    const rows = [[null, undefined, 80], [[1], {}, "AMIENS"]];
    const { normalized, rejected } = parseWorkbookRows(rows, header as unknown as string[]);
    expect(rejected.length + normalized.length).toBe(2);
  });
});

describe("prepareImport", () => {
  it("ne met jamais un nom déjà présent dans toCreate, même avec la casse différente", () => {
    const existing = new Set([normalizeNameKey("AMIENS HOCHE")]);
    const { toCreate, skipped } = prepareImport(
      [row("Amiens Hoche"), row("Soissons Gare")],
      existing,
    );
    expect(toCreate.map((r) => r.name)).toEqual(["Soissons Gare"]);
    expect(skipped).toEqual([{ name: "Amiens Hoche", reason: "Existe déjà" }]);
  });

  it("fait gagner le premier doublon du fichier et ignore les suivants", () => {
    const { toCreate, skipped } = prepareImport(
      ["Clairoix", "amiens", "CLAIROIX"].map((name) => row(name)),
      new Set(),
    );
    expect(toCreate.map((r) => r.name)).toEqual(["Clairoix", "amiens"]);
    expect(skipped).toEqual([{ name: "CLAIROIX", reason: "Doublon dans le fichier" }]);
  });

  it("retourne des listes vides pour une saisie vide", () => {
    expect(prepareImport([], new Set(["A"]))).toEqual({ toCreate: [], skipped: [] });
    expect(prepareImport([row("A")], new Set([normalizeNameKey("A")]))).toEqual({
      toCreate: [],
      skipped: [{ name: "A", reason: "Existe déjà" }],
    });
  });
});

describe("isOperationSheetHeader", () => {
  it("reconnaît l'en-tête TBL BORD du classeur de suivi DMO", () => {
    const header = ["Stade (DO / GPA /", "N° OF", "Dpt", "COMMUNE", "Localisation", "Nb logts", "MOD / VEFA", "Si VEFA, Nom Promo"];
    expect(isOperationSheetHeader(header)).toBe(true);
  });

  it("rejette les en-têtes sans colonnes opération", () => {
    expect(isOperationSheetHeader(["Nom", "Date", "Tél"])).toBe(false);
    expect(isOperationSheetHeader([])).toBe(false);
    expect(isOperationSheetHeader(["Nom de la commune", "Nombre de logement"])).toBe(false);
  });
});
