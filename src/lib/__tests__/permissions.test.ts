import { describe, expect, it } from 'vitest';
import { can, isSchemaMigrationError, permissionsForRole } from '../permissions';

describe('permissionsForRole', () => {
  it('autorise toutes les actions à un administrateur', () => {
    expect(permissionsForRole('admin')).toEqual({
      read: true,
      contribute: true,
      validateResolution: true,
      deleteObservation: true,
      deleteOperation: true,
      administerUsers: true,
      readAudit: true,
    });
  });

  it('permet au responsable de valider et supprimer sans administrer les comptes', () => {
    expect(can('responsable', 'validateResolution')).toBe(true);
    expect(can('responsable', 'deleteObservation')).toBe(true);
    expect(can('responsable', 'deleteOperation')).toBe(true);
    expect(can('responsable', 'administerUsers')).toBe(false);
  });

  it('limite le contributeur à la lecture et la contribution', () => {
    expect(can('contributeur', 'read')).toBe(true);
    expect(can('contributeur', 'contribute')).toBe(true);
    expect(can('contributeur', 'validateResolution')).toBe(false);
    expect(can('contributeur', 'deleteObservation')).toBe(false);
  });

  it('limite le lecteur à la consultation', () => {
    expect(can('lecteur', 'read')).toBe(true);
    expect(can('lecteur', 'contribute')).toBe(false);
  });

  it('traite un profil absent comme un lecteur', () => {
    expect(can(null, 'read')).toBe(true);
    expect(can(null, 'contribute')).toBe(false);
  });
});

describe('isSchemaMigrationError', () => {
  it('reconnaît une table ou une colonne manquante', () => {
    expect(isSchemaMigrationError({ code: '42P01' })).toBe(true);
    expect(isSchemaMigrationError({ code: '42703' })).toBe(true);
    expect(isSchemaMigrationError({ code: 'PGRST204' })).toBe(true);
  });

  it('ne masque pas les autres erreurs Supabase', () => {
    expect(isSchemaMigrationError({ code: '42501' })).toBe(false);
    expect(isSchemaMigrationError(null)).toBe(false);
  });
});
