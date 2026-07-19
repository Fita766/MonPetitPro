import { describe, expect, it } from 'vitest';
import { buildObjectiveRows, calculateHousingGainLoss, mergeActualOutsideObjectives } from '../objectives';

const objectiveOperation = {
  id: 'op-1', name: 'Clairoix', department: '60', commune: 'Clairoix', address: 'Rue du Général de Gaulle', total_housing_units: 30,
  is_objective: true, objective_year: 2026, objective_housing_units: 30, objective_management_date: '2026-06-30',
  contractual_delivery_date: '2026-05-30', management_expected_date: '2026-06-30', management_actual_date: '2026-08-31',
};

describe('calculateHousingGainLoss', () => {
  it('perd 60 logements-mois pour 30 logements livrés deux mois en retard', () => {
    expect(calculateHousingGainLoss('2026-06-30', '2026-08-31', 30)).toBe(-60);
  });

  it('gagne 30 logements-mois pour un mois d’avance', () => {
    expect(calculateHousingGainLoss('2026-06-30', '2026-05-31', 30)).toBe(30);
  });
});

describe('buildObjectiveRows', () => {
  it('sélectionne uniquement les objectifs de l’année et conserve le snapshot initial', () => {
    const rows = buildObjectiveRows([
      objectiveOperation,
      { ...objectiveOperation, id: 'op-2', objective_year: 2027 },
      { ...objectiveOperation, id: 'op-3', is_objective: false },
    ], 2026);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 'op-1', objectiveHousingUnits: 30, objectiveDate: '2026-06-30', gainLoss: -60 });
  });

  it('marque comme réalisés le mois de MEG réelle et les mois suivants', () => {
    const [row] = buildObjectiveRows([objectiveOperation], 2026);
    expect(row.months[6].realized).toBe(false);
    expect(row.months[7].realized).toBe(true);
    expect(row.months[11].realized).toBe(true);
  });
});

describe('mergeActualOutsideObjectives', () => {
  it('ajoute les MEG réelles hors objectif sans dupliquer les objectifs', () => {
    const objectiveRows = buildObjectiveRows([objectiveOperation], 2026);
    const merged = mergeActualOutsideObjectives(objectiveRows, [
      objectiveOperation,
      { ...objectiveOperation, id: 'op-2', name: 'Amiens', is_objective: false, management_actual_date: '2026-09-15' },
      { ...objectiveOperation, id: 'op-3', name: 'Hors année', is_objective: false, management_actual_date: '2027-01-15' },
    ], 2026);
    expect(merged.map((row) => row.id)).toEqual(['op-1', 'op-2']);
  });
});
