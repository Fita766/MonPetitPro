import { describe, expect, it } from 'vitest';
import { buildRolePermissionRows, validateNewUser } from '../roleAdministration';

describe('administration des rôles et utilisateurs', () => {
  it('déduplique et filtre les permissions avant enregistrement', () => {
    expect(buildRolePermissionRows('role-1', ['operations.view', 'bad.key', 'operations.view']))
      .toEqual([{ role_id: 'role-1', permission_key: 'operations.view' }]);
  });

  it('valide les comptes créés avec mot de passe temporaire robuste', () => {
    expect(validateNewUser({ email: '', mode: 'invite', password: '' })).toBeTruthy();
    expect(validateNewUser({ email: 'papa@example.fr', mode: 'invite', password: '' })).toBeNull();
    expect(validateNewUser({ email: 'papa@example.fr', mode: 'create', password: 'court' })).toBeTruthy();
    expect(validateNewUser({ email: 'papa@example.fr', mode: 'create', password: 'MotDePasse-2026' })).toBeNull();
  });
});
