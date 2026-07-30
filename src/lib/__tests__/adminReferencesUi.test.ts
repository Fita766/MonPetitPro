import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync("src/pages/AdminReferences.tsx", "utf8");
const app = readFileSync("src/App.tsx", "utf8");
const sidebar = readFileSync("src/components/layout/Sidebar.tsx", "utf8");

describe("administration des référentiels", () => {
  it("propose les listes métier et les communes", () => {
    expect(page).toContain("Communes et zonage");
    expect(page).toContain("Prestataires d’animation");
    expect(page).toContain("Réglementations thermiques");
    expect(page).toContain("program_nature");
  });

  it("permet la création et l'activation sans suppression destructive", () => {
    expect(page).toContain(".insert(");
    expect(page).toContain("is_active");
    expect(page).not.toContain(".delete(");
  });

  it("est routée et visible uniquement avec la permission adaptée", () => {
    expect(app).toContain('path="/admin/references"');
    expect(app).toContain("'references.view'");
    expect(sidebar).toContain('to="/admin/references"');
    expect(sidebar).toContain("'references.view'");
  });
});
