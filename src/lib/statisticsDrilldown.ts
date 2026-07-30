import type { StatisticsBasis, StatisticsOperation } from './statistics';

export interface StatisticsDetailRow {
  operationId: string;
  name: string;
  date: string | null;
  housing: number;
  promoter: string | null;
  projectManager: string | null;
  initialBudget: number | null;
  finalBudget: number | null;
}

export function buildStatisticsDetails(
  operationIds: string[],
  operations: StatisticsOperation[],
  basis: StatisticsBasis,
): StatisticsDetailRow[] {
  const operationById = new Map(operations.map((operation) => [operation.id, operation]));
  return [...new Set(operationIds)].flatMap((operationId) => {
    const operation = operationById.get(operationId);
    if (!operation) return [];
    const date = basis === 'works_order'
      ? operation.works_order_actual_date || operation.works_order_expected_date || null
      : operation.actual_delivery_date || operation.expected_delivery_date || null;
    const lines = operation.operation_budget_lines ?? [];
    const forecast = lines.map((line) => line.forecast_ht).filter((value): value is number => value != null);
    const final = lines.map((line) => line.final_ht).filter((value): value is number => value != null);
    return [{
      operationId,
      name: operation.name,
      date,
      housing: operation.total_housing_units ?? 0,
      promoter: operation.promoter_name ?? null,
      projectManager: operation.project_manager ?? null,
      initialBudget: forecast.length ? forecast.reduce((sum, value) => sum + value, 0) : operation.initial_budget ?? null,
      finalBudget: final.length ? final.reduce((sum, value) => sum + value, 0) : operation.final_budget ?? null,
    }];
  });
}
