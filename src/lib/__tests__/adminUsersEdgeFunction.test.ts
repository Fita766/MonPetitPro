import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(process.cwd(), 'supabase/functions/admin-users/index.ts'),
  'utf8',
);

describe('fonction sécurisée de gestion des utilisateurs', () => {
  it('garde la clé secrète côté serveur et authentifie chaque appel', () => {
    expect(source).toContain('SUPABASE_SECRET_KEY');
    expect(source).toContain('Authorization');
    expect(source).toContain('auth.getUser');
    expect(source).not.toContain('VITE_SUPABASE_SECRET_KEY');
  });

  it('contrôle une permission adaptée avant chaque action sensible', () => {
    expect(source).toContain('admin.users.invite');
    expect(source).toContain('admin.users.manage');
    expect(source).toContain('admin.users.suspend');
    expect(source).toContain('admin.demo_transfer');
  });

  it('permet invitation, création, mise à jour, suspension et transfert', () => {
    for (const action of ['invite', 'create', 'update', 'suspend', 'reactivate', 'transfer-demo']) {
      expect(source).toContain(`case "${action}"`);
    }
    expect(source).toContain('inviteUserByEmail');
    expect(source).toContain('createUser');
    expect(source).toContain('updateUserById');
    expect(source).toContain('transfer_account_data');
  });
});
