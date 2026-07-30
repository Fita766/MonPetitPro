import { describe, expect, it } from 'vitest';
import {
  aggregateBudget,
  aggregateCtxStats,
  aggregatePromoters,
  buildDeliveryStats,
  buildWorksOrderStats,
} from '../statistics';
import { buildStatisticsDetails } from '../statisticsDrilldown';

const operations = [
  {
    id: 'a', name: 'A', promoter_name: 'P', project_manager: 'C',
    total_housing_units: 10, actual_delivery_date: '2026-02-10', expected_delivery_date: '2026-01-10',
    works_order_expected_date: '2026-03-01', works_order_actual_date: '2026-04-01',
    initial_budget: 100, final_budget: 120,
  },
  {
    id: 'b', name: 'B', promoter_name: 'P', project_manager: 'C',
    total_housing_units: 20, actual_delivery_date: null, expected_delivery_date: '2026-05-10',
    works_order_expected_date: '2026-06-01', works_order_actual_date: null,
    initial_budget: 200, final_budget: null,
  },
];

describe('provenance statistique', () => {
  it('conserve les opérations exactes pour promoteurs et CTX', () => {
    expect(aggregatePromoters(operations, [2026])[0].operationIds).toEqual(['a']);
    expect(aggregateCtxStats(operations, 2026)[0].operationIds).toEqual(['a']);
  });

  it('conserve les opérations exactes dans chaque mois livraison et OS', () => {
    expect(buildDeliveryStats(operations, 2026)[0].operationIds).toEqual(['a']);
    expect(buildDeliveryStats(operations, 2026)[4].operationIds).toEqual(['b']);
    expect(buildWorksOrderStats(operations, 2026)[2].operationIds).toEqual(['a']);
    expect(buildWorksOrderStats(operations, 2026)[5].operationIds).toEqual(['b']);
  });

  it('rattache le budget à la base sélectionnée sans doublons', () => {
    expect(aggregateBudget(operations, [2026], 'delivery').operationIds).toEqual(['a', 'b']);
    expect(aggregateBudget(operations, [2026], 'works_order').operationIds).toEqual(['a', 'b']);
  });

  it('construit le détail uniquement depuis les identifiants autorisés', () => {
    expect(buildStatisticsDetails(['b', 'a', 'b', 'missing'], operations, 'delivery')
      .map((row) => row.operationId)).toEqual(['b', 'a']);
  });
});
