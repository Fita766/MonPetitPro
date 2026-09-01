import { describe, expect, it } from 'vitest';
import { observationAuthorLabel, observationResponsableLabel, observationResponsableValue, resolveResponsableForOperation } from '../observationCtx';

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
  it('préfère le responsable de l’observation sur l’opération', () => {
    expect(observationResponsableValue({ responsable: 'AC' }, { project_manager: 'EB' })).toBe('AC');
    expect(observationResponsableValue({ responsable: null }, { project_manager: 'EB' })).toBe('EB');
    expect(observationResponsableValue({ responsable: null }, null)).toBe('');
  });

  it('retombe sur l’ancien responsible_person (hérité) si le champ responsable est vide', () => {
    expect(observationResponsableValue({ responsable: null, responsible_person: 'ML' }, { project_manager: 'EB' })).toBe('ML');
    expect(observationResponsableValue({ responsable: 'SD', responsible_person: 'ML' }, { project_manager: 'EB' })).toBe('SD');
  });
});

describe('observationResponsableLabel', () => {
  it('retourne le responsable effectif (obs prime → repli legacy → repli opération)', () => {
    expect(observationResponsableLabel({ responsable: 'AC' }, { project_manager: 'EB' })).toBe('AC');
    expect(observationResponsableLabel({ responsable: null, responsible_person: 'ML' }, { project_manager: 'EB' })).toBe('ML');
    expect(observationResponsableLabel({ responsable: null, responsible_person: null }, { project_manager: 'EB' })).toBe('EB');
    expect(observationResponsableLabel({ responsable: null, responsible_person: null }, { project_manager: null })).toBe('');
  });
});

describe('observationAuthorLabel', () => {
  const profileById = new Map<string, string>([['u-sd', 'Stéphane Ducastel']]);

  it('résout l’auteur via le profil (user_id)', () => {
    expect(observationAuthorLabel({ user_id: 'u-sd', author_initials: 'SD' }, profileById)).toBe('Stéphane Ducastel');
  });

  it('retombe sur les initiales si le profil est introuvable', () => {
    expect(observationAuthorLabel({ user_id: 'u-inconnu', author_initials: 'SD' }, profileById)).toBe('SD');
    expect(observationAuthorLabel({ user_id: null, author_initials: 'SD' }, profileById)).toBe('SD');
  });

  it('ignore responsible_person pour l’auteur (l’auteur est fixe)', () => {
    expect(observationAuthorLabel({ user_id: 'u-sd', author_initials: 'SD', responsible_person: 'ML' }, profileById)).toBe('Stéphane Ducastel');
  });
});
