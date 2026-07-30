import { describe, expect, it } from 'vitest';
import { aggregateOperationBudget } from '../budget';
import type { OperationBudgetLine } from '../../types/domain';

const rows: OperationBudgetLine[] = [
  {
    family: 'LLS', realization_mode: 'MOD', sort_order: 0,
    forecast_ht: 100, forecast_ttc: 120, forecast_equity: 0,
    final_ht: 110, final_ttc: 132, final_equity: 10,
  },
  {
    family: 'LLI', realization_mode: 'VEFA', sort_order: 1,
    forecast_ht: 200, forecast_ttc: null, forecast_equity: 20,
    final_ht: null, final_ttc: null, final_equity: null,
  },
];

describe('aggregateOperationBudget', () => {
  it('agrège par phase, famille, mode et globalement', () => {
    const result = aggregateOperationBudget(rows);
    expect(result.global.forecast).toEqual({ ht: 300, ttc: 120, equity: 20 });
    expect(result.global.final).toEqual({ ht: 110, ttc: 132, equity: 10 });
    expect(result.byFamily.LLS.forecast.ht).toBe(100);
    expect(result.byFamily.LLI.forecast.ht).toBe(200);
    expect(result.byMode.MOD.final.ht).toBe(110);
    expect(result.byMode.VEFA.final.ht).toBeNull();
  });

  it('distingue un zéro saisi d’une absence de montant', () => {
    const result = aggregateOperationBudget([rows[0]]);
    expect(result.global.forecast.equity).toBe(0);
    expect(result.byFamily.managed.forecast.equity).toBeNull();
    expect(result.byMode.VEFA.forecast.ht).toBeNull();
  });

  it('signale les lignes partiellement renseignées', () => {
    const result = aggregateOperationBudget(rows);
    expect(result.warnings).toContain('LLI / VEFA : TTC prévisionnel manquant');
    expect(result.warnings).toContain('LLI / VEFA : phase finale vide');
  });
});
