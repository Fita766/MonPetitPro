import { describe, expect, it } from 'vitest';
import { observationCtxId, observationCtxLabel, resolveCtxForOperation } from '../observationCtx';

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

describe('observationCtxLabel', () => {
  const profiles: ReadonlyMap<string, string> = new Map([
    ['p-1', 'Émilie Bernard'],
    ['p-2', 'Karim Dupont'],
  ]);

  it('donne le label du profil lié à l’observation (l’observation prime sur l’opération)', () => {
    const obs = { ctx_user_id: 'p-1' };
    const op = { ctx_user_id: 'p-2', project_manager: 'Ancien Texte' };
    expect(observationCtxLabel(obs, op, profiles)).toBe('Émilie Bernard');
  });

  it('retombe sur le profil de l’opération quand l’observation n’a pas de lien', () => {
    const obs = { ctx_user_id: null };
    const op = { ctx_user_id: 'p-2', project_manager: 'Ancien Texte' };
    expect(observationCtxLabel(obs, op, profiles)).toBe('Karim Dupont');
  });

  it('retombe sur project_manager quand l’id n’est pas dans la map (profil désactivé)', () => {
    const obs = { ctx_user_id: 'p-x' };
    const op = { ctx_user_id: 'p-y', project_manager: 'Inconnu' };
    expect(observationCtxLabel(obs, op, profiles)).toBe('Inconnu');
  });

  it('renvoie une chaîne vide quand aucun lien ni texte n’est disponible', () => {
    expect(observationCtxLabel({ ctx_user_id: null }, null, profiles)).toBe('');
  });
});
