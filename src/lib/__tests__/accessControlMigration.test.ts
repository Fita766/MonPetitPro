import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(process.cwd(), 'supabase/migrations/202607210001_custom_access_control.sql');

describe('migration du contrôle d’accès personnalisé', () => {
  it('crée le modèle persistant et ses index de clés étrangères', () => {
    const sql = readFileSync(migrationPath, 'utf8').toLowerCase();
    for (const table of ['permission_definitions', 'custom_roles', 'custom_role_permissions', 'account_data_transfers']) {
      expect(sql).toContain(`create table if not exists public.${table}`);
      expect(sql).toContain(`alter table public.${table} enable row level security`);
    }
    expect(sql).toContain('profiles_custom_role_id_idx');
    expect(sql).toContain('custom_role_permissions_role_id_idx');
    expect(sql).toContain('custom_role_permissions_permission_key_idx');
  });

  it('protège les comptes et expose uniquement les permissions effectives', () => {
    const sql = readFileSync(migrationPath, 'utf8').toLowerCase();
    expect(sql).toContain('create or replace function public.has_permission');
    expect(sql).toContain('create or replace function public.has_any_permission');
    expect(sql).toContain('create or replace function public.my_permissions');
    expect(sql).toContain("status = 'active'");
    expect(sql).toContain('security definer');
    expect(sql).toContain('prevent_last_owner_change');
    expect(sql).toContain('protect_profile_security_fields');
    expect(sql).toContain('grant execute on function public.bootstrap_owner(text) to service_role');
  });

  it('remplace les politiques globales par des contrôles de permissions', () => {
    const sql = readFileSync(migrationPath, 'utf8').toLowerCase();
    expect(sql).toContain("has_permission('operations.view')");
    expect(sql).toContain("has_permission('observations.view')");
    expect(sql).toContain("has_permission('admin.roles.manage')");
    expect(sql).toContain("has_permission('documents.upload')");
    expect(sql).toContain('enforce_operation_field_permissions');
    expect(sql).toContain("has_permission('operations.edit_identity')");
    expect(sql).toContain("has_permission('operations.edit_budget')");
    expect(sql).not.toContain('using (true)');
  });
});
