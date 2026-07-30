import { describe, expect, it } from 'vitest';
import { buildObjectiveReport } from '../objectiveRecords';
import type { OperationObjective } from '../../types/domain';

const operations = [
  {
    id: 'op-1', name: 'Clairoix', total_housing_units: 30,
    works_order_expected_date: '2026-02-01', works_order_actual_date: '2026-03-01',
    management_expected_date: '2026-06-30', management_actual_date: '2026-08-31',
  },
  {
    id: 'op-2', name: 'Amiens', total_housing_units: 12,
    works_order_actual_date: '2026-05-01', management_actual_date: '2026-09-01',
  },
];
const records: OperationObjective[] = [
  {
    id: 'obj-1', operation_id: 'op-1', kind: 'management', objective_year: 2026,
    category: 'initial', snapshot_date: '2026-06-30', snapshot_housing_units: 30,
  },
  {
    id: 'obj-2', operation_id: 'op-1', kind: 'works_order', objective_year: 2026,
    category: 'supplementary', snapshot_date: '2026-02-01', snapshot_housing_units: 28,
  },
];

describe('buildObjectiveReport', () => {
  it('sépare les appartenances OS et mise en gestion', () => {
    const management = buildObjectiveReport(records, operations, 2026, 'management');
    const works = buildObjectiveReport(records, operations, 2026, 'works_order');
    expect(management.initialRows.map((row) => row.operationId)).toEqual(['op-1']);
    expect(management.supplementaryRows).toHaveLength(0);
    expect(works.initialRows).toHaveLength(0);
    expect(works.supplementaryRows.map((row) => row.operationId)).toEqual(['op-1']);
  });

  it('utilise toujours les snapshots figés pour la date et les logements', () => {
    const report = buildObjectiveReport(records, [{ ...operations[0], total_housing_units: 99, management_expected_date: '2027-01-01' }], 2026, 'management');
    expect(report.initialRows[0]).toMatchObject({ objectiveDate: '2026-06-30', housingUnits: 30 });
  });

  it('sépare objectif initial, complément et réalisé hors objectif sans doublon', () => {
    const report = buildObjectiveReport(records, operations, 2026, 'management');
    expect(report.summary.initialUnits).toBe(30);
    expect(report.summary.supplementaryUnits).toBe(0);
    expect(report.summary.realizedInitialUnits).toBe(30);
    expect(report.outsideRows.map((row) => row.operationId)).toEqual(['op-2']);
    expect(report.summary.realizedOutsideUnits).toBe(12);
  });

  it('calcule les logements-mois uniquement pour la mise en gestion', () => {
    expect(buildObjectiveReport(records, operations, 2026, 'management').initialRows[0].gainLoss).toBe(-60);
    expect(buildObjectiveReport(records, operations, 2026, 'works_order').supplementaryRows[0].gainLoss).toBeNull();
  });
});
