import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  "supabase/migrations/202607300001_july_feedback_rework.sql",
  "utf8",
);

describe("migration des retours du 29 juillet", () => {
  it("crée les nouveaux modèles sans supprimer les données historiques", () => {
    for (const table of [
      "reference_values",
      "communes",
      "operation_program_sections",
      "operation_program_lines",
      "operation_budget_lines",
      "operation_objectives",
      "operation_significant_works",
      "platform_migration_journal",
    ]) {
      expect(sql).toContain(`public.${table}`);
    }

    expect(sql).not.toMatch(
      /drop table\s+(?:if exists\s+)?public\.(operations|observations|profiles)/i,
    );
  });

  it("ajoute l'affectation utilisateur et le changement de mot de passe", () => {
    expect(sql).toContain("must_change_password");
    expect(sql).toContain("assignee_user_id");
    expect(sql).toContain("references auth.users(id)");
  });

  it("journalise et contrôle les migrations de données", () => {
    expect(sql).toContain("platform_migration_journal");
    expect(sql).toContain("source_count");
    expect(sql).toContain("migrated_count");
    expect(sql).toMatch(/raise exception[\s\S]*migration/i);
  });

  it("prépare les nouveaux jalons prévisionnels demandés", () => {
    for (const column of [
      "approvals_expected_date",
      "permit_expected_date",
      "tender_expected_date",
      "cpr_expected_date",
    ]) {
      expect(sql).toContain(column);
    }
  });

  it("active la RLS sur chaque nouvelle table métier", () => {
    for (const table of [
      "reference_values",
      "communes",
      "operation_program_sections",
      "operation_program_lines",
      "operation_budget_lines",
      "operation_objectives",
      "operation_significant_works",
      "platform_migration_journal",
    ]) {
      expect(sql).toContain(
        `alter table public.${table} enable row level security`,
      );
    }
  });
});
