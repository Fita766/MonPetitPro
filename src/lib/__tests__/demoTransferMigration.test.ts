import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/202607210001_custom_access_control.sql'),
  'utf8',
).toLowerCase();

describe('transfert des données du compte démo', () => {
  it('est réservé au propriétaire et sérialisé dans une transaction', () => {
    expect(sql).toContain('transfer_account_data');
    expect(sql).toContain("has_permission('admin.demo_transfer')");
    expect(sql).toContain('pg_advisory_xact_lock');
    expect(sql).toContain('compte source introuvable');
    expect(sql).toContain('compte cible introuvable');
  });

  it('réaffecte toutes les données liées sans recréer de lignes', () => {
    expect(sql).toMatch(/update public\.operations[\s\S]*set user_id = target_id/);
    expect(sql).toMatch(/update public\.observations[\s\S]*set user_id = target_id/);
    expect(sql).toMatch(/update public\.events[\s\S]*set user_id = target_id/);
    expect(sql).not.toMatch(/insert into public\.(operations|observations|events)/);
  });

  it('préserve les initiales existantes et journalise les volumes', () => {
    expect(sql).toContain("nullif(btrim(author_initials), '')");
    expect(sql).toContain('operations_count');
    expect(sql).toContain('observations_count');
    expect(sql).toContain('events_count');
    expect(sql).toContain('insert into public.account_data_transfers');
  });
});
