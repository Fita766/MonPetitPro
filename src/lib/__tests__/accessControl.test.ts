import { describe, expect, it } from 'vitest';
import {
  PERMISSION_DEFINITIONS,
  PERMISSION_GROUPS,
  ROLE_COLORS,
  accountAccessState,
  broadActionGranted,
  normalizePermissionKeys,
  permissionGranted,
} from '../accessControl';

describe('catalogue des permissions', () => {
  it('expose un catalogue détaillé, unique et organisé par groupe', () => {
    const keys = PERMISSION_DEFINITIONS.map((permission) => permission.key);
    expect(keys.length).toBeGreaterThanOrEqual(35);
    expect(new Set(keys).size).toBe(keys.length);
    expect(PERMISSION_GROUPS.flatMap((group) => group.permissions)).toEqual(PERMISSION_DEFINITIONS);
    expect(keys).toContain('operations.edit_budget');
    expect(keys).toContain('observations.validate');
    expect(keys).toContain('references.view');
    expect(keys).toContain('references.manage');
    expect(keys).toContain('admin.roles.manage');
    expect(keys).not.toContain('admin.demo_transfer');
  });

  it('fournit une palette fermée compréhensible sans saisie hexadécimale', () => {
    expect(ROLE_COLORS.length).toBeGreaterThanOrEqual(12);
    expect(new Set(ROLE_COLORS.map((color) => color.key)).size).toBe(ROLE_COLORS.length);
    expect(ROLE_COLORS.every((color) => color.label && color.swatchClass && color.badgeClass)).toBe(true);
  });

  it('normalise les permissions inconnues et dupliquées', () => {
    expect(normalizePermissionKeys(['operations.view', 'inconnue', 'operations.view'])).toEqual(['operations.view']);
  });

  it('traduit les anciennes actions larges depuis les permissions détaillées', () => {
    expect(broadActionGranted(['observations.create'], 'contribute')).toBe(true);
    expect(broadActionGranted(['observations.validate'], 'validateResolution')).toBe(true);
    expect(broadActionGranted(['admin.users.manage'], 'administerUsers')).toBe(true);
    expect(broadActionGranted([], 'read')).toBe(false);
  });

  it('bloque les comptes non actifs et vérifie une permission précise', () => {
    expect(accountAccessState(null)).toBe('missing');
    expect(accountAccessState({ status: 'pending' })).toBe('pending');
    expect(accountAccessState({ status: 'suspended' })).toBe('suspended');
    expect(accountAccessState({ status: 'active' })).toBe('active');
    expect(permissionGranted(['operations.view'], 'operations.view')).toBe(true);
    expect(permissionGranted(['operations.view'], 'operations.create')).toBe(false);
  });
});
