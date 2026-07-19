import { describe, expect, it } from 'vitest';
import { getStageConfig, STAGE_CONFIG } from '../stage';

describe('STAGE_CONFIG', () => {
  it('reprend les neuf couleurs fournies dans la note métier', () => {
    expect(Object.fromEntries(
      Object.entries(STAGE_CONFIG).map(([stage, config]) => [stage, config.color]),
    )).toEqual({
      '0': '#FFF2CC',
      '0bis': '#F2DAF1',
      '1': '#F2F2F2',
      '1bis': '#BDD7EE',
      '2': '#FBE4D5',
      '3': '#E2EFDA',
      '4': '#9BC2E6',
      '5': '#EC9288',
      '6': '#A5A5A5',
    });
  });

  it('associe chaque code au libellé métier attendu', () => {
    expect(Object.fromEntries(
      Object.entries(STAGE_CONFIG).map(([stage, config]) => [stage, config.label]),
    )).toEqual({
      '0': 'Développement',
      '0bis': 'Développement / Montage',
      '1': 'Montage',
      '1bis': 'Montage / Travaux',
      '2': 'Travaux',
      '3': 'GPA',
      '4': 'DO',
      '5': 'Gestion',
      '6': 'Abandon',
    });
  });

  it('retourne une configuration neutre pour un stade absent', () => {
    expect(getStageConfig(null)).toEqual({
      code: null,
      label: 'Stade non renseigné',
      color: '#E2E8F0',
      textColor: '#334155',
    });
  });
});
