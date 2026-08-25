import { describe, expect, it } from 'vitest';
import { observationCtxLabel, observationCtxValue, resolveCtxForOperation } from '../observationCtx';

describe('resolveCtxForOperation', () => {
  it('utilise le code CTX de l’opération (project_manager)', () => {
    expect(resolveCtxForOperation({ project_manager: 'EB' })).toBe('EB');
  });

  it('retourne vide si aucun project_manager', () => {
    expect(resolveCtxForOperation({ project_manager: null })).toBe('');
    expect(resolveCtxForOperation(null)).toBe('');
  });

  it('ignore les espaces superflus', () => {
    expect(resolveCtxForOperation({ project_manager: '  EB  ' })).toBe('EB');
  });
});

describe('observationCtxValue', () => {
  it('préfère le CTX de l’observation sur celui de l’opération', () => {
    expect(observationCtxValue({ ctx: 'AC' }, { project_manager: 'EB' })).toBe('AC');
    expect(observationCtxValue({ ctx: null }, { project_manager: 'EB' })).toBe('EB');
    expect(observationCtxValue({ ctx: null }, null)).toBe('');
  });
});

describe('observationCtxLabel', () => {
  it('retourne le code CTX effectif (obs prime → repli opération)', () => {
    expect(observationCtxLabel({ ctx: 'AC' }, { project_manager: 'EB' })).toBe('AC');
    expect(observationCtxLabel({ ctx: null }, { project_manager: 'EB' })).toBe('EB');
    expect(observationCtxLabel({ ctx: null }, { project_manager: null })).toBe('');
  });
});
