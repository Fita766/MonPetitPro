import { describe, expect, it } from 'vitest';
import { observationResponsableLabel, observationResponsableValue, resolveResponsableForOperation } from '../observationCtx';

describe('resolveResponsableForOperation', () => {
  it('utilise le CTX de l’opération (project_manager) comme responsable par défaut', () => {
    expect(resolveResponsableForOperation({ project_manager: 'EB' })).toBe('EB');
  });

  it('retourne vide si aucun project_manager', () => {
    expect(resolveResponsableForOperation({ project_manager: null })).toBe('');
    expect(resolveResponsableForOperation(null)).toBe('');
  });

  it('ignore les espaces superflus', () => {
    expect(resolveResponsableForOperation({ project_manager: '  EB  ' })).toBe('EB');
  });
});

describe('observationResponsableValue', () => {
  it('préfère le responsable de l’observation sur celui de l’opération', () => {
    expect(observationResponsableValue({ responsable: 'AC' }, { project_manager: 'EB' })).toBe('AC');
    expect(observationResponsableValue({ responsable: null }, { project_manager: 'EB' })).toBe('EB');
    expect(observationResponsableValue({ responsable: null }, null)).toBe('');
  });
});

describe('observationResponsableLabel', () => {
  it('retourne le responsable effectif (obs prime → repli opération)', () => {
    expect(observationResponsableLabel({ responsable: 'AC' }, { project_manager: 'EB' })).toBe('AC');
    expect(observationResponsableLabel({ responsable: null }, { project_manager: 'EB' })).toBe('EB');
    expect(observationResponsableLabel({ responsable: null }, { project_manager: null })).toBe('');
  });
});
