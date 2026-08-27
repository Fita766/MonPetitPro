import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  "supabase/migrations/202608280001_observation_visibility.sql",
  "utf8",
);

describe("migration de visibilité des observations", () => {
  it("restreint la lecture à l'espace de chacun (auteur ou réalisateur) sauf si vue globale", () => {
    expect(sql).toContain("create policy observations_permission_read");
    expect(sql).toContain("public.has_permission('observations.view_all')");
    expect(sql).toContain("user_id = (select auth.uid())");
    expect(sql).toContain("assignee_user_id = (select auth.uid())");
    // La confidentialité DG reste protégée.
    expect(sql).toMatch(/not is_dg or public\.has_permission\('observations\.view_dg'\)/);
  });

  it("retire la vue globale du rôle Lecteur historique", () => {
    expect(sql).toContain("'10000000-0000-0000-0000-000000000004'::uuid");
    expect(sql).toContain("permission_key = 'observations.view_all'");
    expect(sql).toMatch(/delete from public\.custom_role_permissions/);
  });
});
