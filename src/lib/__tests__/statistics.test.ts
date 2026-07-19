import { describe, expect, it } from 'vitest';
import { aggregateBudget, aggregateCtxStats, aggregatePromoters, buildDeliveryStats } from '../statistics';

const operations = [
  { id: '1', name: 'A', promoter_name: 'Promo A', project_manager: 'CTX 1', actual_delivery_date: '2026-03-10', expected_delivery_date: '2026-02-28', total_housing_units: 20, collective_housing_units: 15, individual_housing_units: 5, delivery_reservations_count: 40, reservations_clearance_date: '2026-04-09', gpa_count: 6, initial_budget: 2_000_000, final_budget: 2_100_000 },
  { id: '2', name: 'B', promoter_name: 'Promo A', project_manager: 'CTX 1', actual_delivery_date: '2026-05-20', expected_delivery_date: '2026-05-10', total_housing_units: 30, collective_housing_units: 30, individual_housing_units: 0, delivery_reservations_count: 30, reservations_clearance_date: null, gpa_count: null, initial_budget: 3_000_000, final_budget: 2_900_000 },
  { id: '3', name: 'C', promoter_name: 'Promo B', project_manager: 'CTX 2', actual_delivery_date: '2025-06-15', expected_delivery_date: '2025-06-30', total_housing_units: 10, collective_housing_units: 0, individual_housing_units: 10, delivery_reservations_count: 5, reservations_clearance_date: '2025-07-15', gpa_count: 4, initial_budget: null, final_budget: 900_000 },
  { id: '4', name: 'Non livré', promoter_name: 'Promo B', project_manager: 'CTX 2', actual_delivery_date: null, expected_delivery_date: '2026-10-15', total_housing_units: 12, collective_housing_units: 12, individual_housing_units: 0, delivery_reservations_count: null, reservations_clearance_date: null, gpa_count: null, initial_budget: 1_000_000, final_budget: null },
];

describe('aggregatePromoters', () => {
  it('agrège les années sélectionnées et exclut les valeurs absentes des moyennes', () => {
    const [promo] = aggregatePromoters(operations, [2026]).filter((row) => row.name === 'Promo A');
    expect(promo).toMatchObject({ operations: 2, housing: 50, collectiveHousing: 45, individualHousing: 5, reservations: 70, reservationsPerHousing: 1.4, reservationsPerOperation: 35, averageClearanceDays: 30 });
  });

  it('accepte plusieurs années', () => {
    expect(aggregatePromoters(operations, [2025, 2026]).map((row) => row.name)).toEqual(['Promo A', 'Promo B']);
  });
});

describe('aggregateCtxStats', () => {
  it('calcule les livraisons de l’année et la GPA depuis les opérations livrées l’année précédente', () => {
    const rows = aggregateCtxStats(operations, 2026);
    expect(rows.find((row) => row.name === 'CTX 1')).toMatchObject({ deliveredOperations: 2, deliveredHousing: 50, reservations: 70 });
    expect(rows.find((row) => row.name === 'CTX 2')).toMatchObject({ deliveredOperations: 0, previousYearAverageGpa: 4 });
  });
});

describe('buildDeliveryStats', () => {
  it('calcule prévisionnel, réel et cumuls mensuels', () => {
    const stats = buildDeliveryStats(operations, 2026);
    expect(stats[1]).toMatchObject({ expected: 20, actual: 0, expectedCumulative: 20, actualCumulative: 0 });
    expect(stats[2]).toMatchObject({ actual: 20, actualCumulative: 20 });
    expect(stats[9]).toMatchObject({ expected: 12, expectedCumulative: 62 });
  });
});

describe('aggregateBudget', () => {
  it('somme les budgets des opérations rattachées aux années choisies sans transformer null en valeur individuelle', () => {
    expect(aggregateBudget(operations, [2026])).toEqual({ operations: 3, initialBudget: 6_000_000, finalBudget: 5_000_000, variance: -1_000_000, operationsWithInitialBudget: 3, operationsWithFinalBudget: 2 });
  });
});
