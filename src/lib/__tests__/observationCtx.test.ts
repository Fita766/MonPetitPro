import { describe, expect, it } from 'vitest';
import { observationCtxId, resolveCtxForOperation } from '../observationCtx';

describe('resolveCtxForOperation', () => {
  const profiles = [
    { id: 'p-1', label: 'Émilie Bernard', initials: 'EB' },
    { id: 'p-2', label: 'Karim Dupont', initials: 'KD' },
  ];

  it('privilégie ctx_user_id de l’opération quand présent', () => {
    const op = { ctx_user_id: 'p-2', project_manager: 'EB' };
    expect(resolveCtxForOperation(op, profiles)).toBe('p-2');
  });

  it('retombe sur le nom texte project_manager en repli', () => {
    const op = { ctx_user_id: null, project_manager: 'EB' };
    expect(resolveCtxForOperation(op, profiles)).toBe('p-1');
  });

  it('renvoie vide si aucune correspondance', () => {
    const op = { ctx_user_id: null, project_manager: 'Inconnu XYZ' };
    expect(resolveCtxForOperation(op, profiles)).toBe('');
  });
});

describe('observationCtxId', () => {
  it('préfère le lien observation sur le lien opération', () => {
    expect(observationCtxId({ ctx_user_id: 'obs-ctx' }, { ctx_user_id: 'op-ctx' })).toBe('obs-ctx');
    expect(observationCtxId({ ctx_user_id: null }, { ctx_user_id: 'op-ctx' })).toBe('op-ctx');
    expect(observationCtxId({ ctx_user_id: null }, null)).toBe('');
  });
});
