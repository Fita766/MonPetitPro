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
    expect(sql).not.toContain("uuid_generate_v4()");
    expect(sql).toContain("gen_random_uuid()");
  });

  it("ajoute l'affectation utilisateur et le changement de mot de passe", () => {
    expect(sql).toContain("must_change_password");
    expect(sql).toContain("assignee_user_id");
    expect(sql).toContain("references auth.users(id)");

    // A1 (17/08) : cases SO, case terrain et comptes COP/CTX, sans perdre
    // les colonnes texte historiques project_manager / operations_manager.
    for (const column of [
      "so_csi_ca",
      "so_lli_approval",
      "terrain",
      "cop_user_id",
      "ctx_user_id",
    ]) {
      expect(sql).toContain(column);
    }
    expect(sql).toContain("operations_cop_user_idx");
    expect(sql).toContain("operations_ctx_user_idx");
    expect(sql).not.toMatch(
      /drop column\s+if exists\s+(project_manager|operations_manager)/i,
    );
  });

  it("journalise et contrôle les migrations de données", () => {
    expect(sql).toContain("platform_migration_journal");
    expect(sql).toContain("source_count");
    expect(sql).toContain("migrated_count");
    for (const migration of [
      "programme",
      "budget",
      "objectifs",
      "travaux significatifs",
      "subventions",
      "affectations",
    ]) {
      expect(sql).toMatch(new RegExp(`migration ${migration}[\\s\\S]*source`, "i"));
    }
  });

  it("suspend puis restaure les garde-fous pendant les normalisations historiques", () => {
    const operationDrop = sql.indexOf(
      "drop trigger if exists enforce_operation_field_permissions on public.operations",
    );
    const operationMigration = sql.indexOf("update public.operations");
    const operationRestore = sql.lastIndexOf(
      "create trigger enforce_operation_field_permissions",
    );
    const observationDrop = sql.indexOf(
      "drop trigger if exists enforce_observation_field_permissions on public.observations",
    );
    const observationMigration = sql.indexOf("update public.observations");
    const observationRestore = sql.lastIndexOf(
      "create trigger enforce_observation_field_permissions",
    );
    expect(operationDrop).toBeGreaterThan(-1);
    expect(operationDrop).toBeLessThan(operationMigration);
    expect(operationRestore).toBeGreaterThan(operationMigration);
    expect(observationDrop).toBeLessThan(observationMigration);
    expect(observationRestore).toBeGreaterThan(observationMigration);
  });

  it("prépare les nouveaux jalons prévisionnels demandés", () => {
    for (const column of [
      "approvals_expected_date",
      "permit_expected_date",
      "tender_expected_date",
      "cpr_expected_date",
      "vefa_deed_expected_date",
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

  it("applique le droit métier exact à chaque sous-table", () => {
    for (const [table, permission] of [
      ["operation_program_sections", "operations.edit_program"],
      ["operation_program_lines", "operations.edit_program"],
      ["operation_budget_lines", "operations.edit_budget"],
      ["operation_objectives", "objectives.manage"],
      ["operation_significant_works", "operations.edit_synthesis"],
    ]) {
      expect(sql).toContain(`('${table}', '${permission}')`);
    }
  });

  it("indexe les clés étrangères utilisées par les suppressions et les politiques", () => {
    for (const index of [
      "observations_assignee_idx",
      "operations_commune_id_idx",
      "operation_program_lines_section_idx",
      "operation_objectives_created_by_idx",
    ]) {
      expect(sql).toContain(`index if not exists ${index}`);
    }
  });

  it("enregistre budget et subventions dans une seule transaction SQL", () => {
    expect(sql).toContain("function public.save_operation_finance");
    expect(sql).toContain("Permission budget insuffisante");
    expect(sql).toMatch(/delete from public\.operation_budget_lines[\s\S]*insert into public\.operation_budget_lines/);
    expect(sql).toMatch(/delete from public\.operation_subsidies[\s\S]*insert into public\.operation_subsidies/);
  });

  it("fige les objectifs initiaux et protège leur suppression", () => {
    expect(sql).toContain("function public.freeze_objective_record");
    expect(sql).toContain("new.snapshot_date := old.snapshot_date");
    expect(sql).toContain("new.snapshot_housing_units := old.snapshot_housing_units");
    expect(sql).toContain("objectives.delete_initial");
    expect(sql).toContain("function public.protect_initial_objective_deletion");
  });

  it("déclare les clés SO et Terrain dans les deux CTE des permissions de champ", () => {
    const occurrences = (needle: string) => sql.split(needle).length - 1;
    // CTE permission_definitions + CTE de dotation des rôles : planning puis programme.
    expect(occurrences("'h2_actual_date','so_csi_ca','so_lli_approval'")).toBe(2);
    expect(occurrences("'category','terrain'")).toBe(2);
  });

  it("déclare la date prévisionnelle de l'acte VEFA dans les deux CTE des permissions de champ", () => {
    const occurrences = (needle: string) => sql.split(needle).length - 1;
    // CTE permission_definitions + CTE de dotation des rôles : planning.
    expect(occurrences("'vefa_deed_or_land_purchase_date','vefa_deed_expected_date'")).toBe(2);
  });

  it("déclare les comptes COP/CTX dans les deux CTE des permissions de champ", () => {
    const occurrences = (needle: string) => sql.split(needle).length - 1;
    // CTE permission_definitions + CTE de dotation des rôles : équipe.
    expect(occurrences("'project_manager','operations_manager','cop_user_id','ctx_user_id'")).toBe(2);
  });
  it("déclare calendar.view_all pour admin et responsable uniquement", () => {
    expect(sql).toContain("('calendar.view_all','calendar'");
    expect(sql).toContain("'10000000-0000-0000-0000-000000000001'::uuid, 'calendar.view_all'");
    expect(sql).toContain("'10000000-0000-0000-0000-000000000002'::uuid, 'calendar.view_all'");
    expect(sql).not.toMatch(/'10000000-0000-0000-0000-000000000003'::uuid, 'calendar.view_all'/);
    expect(sql).not.toMatch(/'10000000-0000-0000-0000-000000000004'::uuid, 'calendar.view_all'/);
  });

  it("déclare operations.import et le réserve à l'administrateur (import admin)", () => {
    expect(sql).toContain("('operations.import','operations'");
    expect(sql).toContain("'10000000-0000-0000-0000-000000000001'::uuid, 'operations.import'");
    expect(sql).not.toMatch(/'10000000-0000-0000-0000-00000000000(2|3|4)'::uuid, 'operations.import'/);
  });

  it("liste les profils actifs sans e-mail pour les sélecteurs COP/CTX", () => {
    expect(sql).toContain("function public.list_active_profiles");
    expect(sql).toMatch(/select p\.id, p\.display_name, p\.initials\s+from public\.profiles p/i);
    expect(sql).toContain("operations.edit_team");
    expect(sql).toContain("operations.field.project_manager.edit");
    expect(sql).toContain("operations.field.operations_manager.edit");
    expect(sql).toContain("grant execute on function public.list_active_profiles() to authenticated");
  });

  it("crée la vue calendrier scopée et ses policies RLS (A6b)", () => {
    expect(sql).toContain("create or replace view public.calendar_operations");
    expect(sql).toMatch(/calendar_operations[\s\S]*security_invoker\s*=\s*on/i);
    expect(sql).toContain("alter view public.calendar_operations enable row level security");
    expect(sql).toContain("policy calendar_operations_view_all on public.calendar_operations");
    expect(sql).toContain("using (public.has_permission('calendar.view_all'))");
    expect(sql).toContain("policy calendar_operations_own on public.calendar_operations");
    expect(sql).toContain("cop_user_id = (select auth.uid()) or ctx_user_id = (select auth.uid())");
    expect(sql).toContain("revoke all on public.calendar_operations from public, anon");
    expect(sql).toContain("grant select on public.calendar_operations to authenticated");
  });
});
