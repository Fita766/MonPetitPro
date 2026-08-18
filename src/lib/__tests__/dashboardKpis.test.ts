import { describe, expect, it } from 'vitest';
import { buildKpis, countActiveFilters, type OperationFilters } from '../dashboardKpis';

describe('buildKpis', () => {
  it('renvoie des zéros / null pour des listes vides', () => {
    expect(buildKpis([], [])).toEqual({
      operations: 0,
      housingUnits: null,
      finalBudget: null,
      activeAlerts: 0,
    });
  });

  it('compte les alertes actives', () => {
    expect(buildKpis([], [{ id: 'a' }, { id: 'b' }])).toMatchObject({
      activeAlerts: 2,
      operations: 0,
    });
  });

  it('agrège opérations, logements et budget final', () => {
    const kpis = buildKpis(
      [
        { total_housing_units: 20, final_budget: 2_100_000 },
        { total_housing_units: 30, final_budget: 2_900_000 },
        { total_housing_units: 10, final_budget: 900_000 },
        { total_housing_units: 12, final_budget: null },
      ],
      [],
    );
    expect(kpis).toEqual({
      operations: 4,
      housingUnits: 72,
      finalBudget: 5_900_000,
      activeAlerts: 0,
    });
  });

  it('exclut les final_budget null de la somme', () => {
    const kpis = buildKpis(
      [{ final_budget: 1_000_000 }, { final_budget: null }],
      [],
    );
    expect(kpis.finalBudget).toBe(1_000_000);
  });

  it('renvoie un budget null quand aucune opération n’a de final_budget', () => {
    const kpis = buildKpis([{ final_budget: null }, {}], []);
    expect(kpis.finalBudget).toBeNull();
  });

  it('gère les total_housing_units null : exclus de la somme, null si aucune valeur', () => {
    const withValue = buildKpis(
      [{ total_housing_units: null }, { total_housing_units: 5 }],
      [],
    );
    expect(withValue.housingUnits).toBe(5);

    const none = buildKpis([{ total_housing_units: null }, {}], []);
    expect(none.housingUnits).toBeNull();
  });
});

describe('countActiveFilters', () => {
  const empty: OperationFilters = {
    stages: [],
    departments: [],
    communes: [],
    cops: [],
    ctxs: [],
    promoters: [],
    operationTypes: [],
    labels: [],
    deliveryFrom: '',
    deliveryTo: '',
    query: '',
  };

  it('compte 0 sur des filtres par défaut', () => {
    expect(countActiveFilters(empty)).toBe(0);
  });

  it('compte chaque dimension sélectionnée une seule fois', () => {
    const filters: OperationFilters = {
      ...empty,
      stages: ['A', 'B'],
      cops: ['C1'],
      deliveryFrom: '2026-01-01',
    };
    expect(countActiveFilters(filters)).toBe(3);
  });

  it('prend en compte la recherche et les deux dates', () => {
    const filters: OperationFilters = {
      ...empty,
      query: '  Lyon ',
      deliveryTo: '2026-12-31',
    };
    expect(countActiveFilters(filters)).toBe(2);
  });

  it('ignore une recherche vide ou composée d’espaces', () => {
    expect(countActiveFilters({ ...empty, query: '   ' })).toBe(0);
  });
});
