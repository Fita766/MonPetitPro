import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  "supabase/migrations/202607310001_remove_legacy_broad_policies.sql",
  "utf8",
);

describe("nettoyage des anciennes politiques de démonstration", () => {
  it.each(["operations", "observations"])(
    "supprime l'accès complet hérité sur %s",
    (table) => {
      expect(sql).toContain(
        `drop policy if exists "Allow authenticated full access on ${table}"`,
      );
      expect(sql).toContain(`on public.${table}`);
    },
  );

  it("interdit toute politique ALL authentifiée sans restriction résiduelle", () => {
    expect(sql).toContain("from pg_policies");
    expect(sql).toContain("and cmd = 'ALL'");
    expect(sql).toContain("'authenticated' = any(roles)");
    expect(sql).toContain("raise exception");
  });
});
