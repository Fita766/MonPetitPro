import type { ObjectiveCategory, ObjectiveKind, OperationObjective } from '../types/domain';
import { calculateHousingGainLoss } from './objectives';

export interface ObjectiveReportOperation {
  id: string;
  name: string;
  of_number?: string | null;
  department?: string | null;
  commune?: string | null;
  address?: string | null;
  total_housing_units?: number | null;
  works_order_expected_date?: string | null;
  works_order_actual_date?: string | null;
  management_expected_date?: string | null;
  management_actual_date?: string | null;
}

export interface ObjectiveReportRow {
  recordId: string | null;
  operationId: string;
  operationName: string;
  department: string | null;
  commune: string | null;
  source: ObjectiveCategory | 'actual-outside';
  objectiveDate: string | null;
  actualDate: string | null;
  housingUnits: number;
  realizedUnits: number;
  gainLoss: number | null;
}

export interface ObjectiveReport {
  year: number;
  kind: ObjectiveKind;
  initialRows: ObjectiveReportRow[];
  supplementaryRows: ObjectiveReportRow[];
  outsideRows: ObjectiveReportRow[];
  rows: ObjectiveReportRow[];
  summary: {
    initialUnits: number;
    supplementaryUnits: number;
    realizedInitialUnits: number;
    realizedSupplementaryUnits: number;
    realizedOutsideUnits: number;
    landingUnits: number;
    gainLoss: number;
  };
}

function actualDate(operation: ObjectiveReportOperation, kind: ObjectiveKind) {
  return kind === 'works_order'
    ? operation.works_order_actual_date ?? null
    : operation.management_actual_date ?? null;
}

function objectiveRow(
  record: OperationObjective,
  operation: ObjectiveReportOperation,
): ObjectiveReportRow {
  const actual = actualDate(operation, record.kind);
  const units = record.snapshot_housing_units ?? 0;
  return {
    recordId: record.id ?? null,
    operationId: operation.id,
    operationName: operation.name,
    department: operation.department ?? null,
    commune: operation.commune ?? null,
    source: record.category,
    objectiveDate: record.snapshot_date,
    actualDate: actual,
    housingUnits: units,
    realizedUnits: actual ? units : 0,
    gainLoss: record.kind === 'management'
      ? calculateHousingGainLoss(record.snapshot_date, actual, units)
      : null,
  };
}

function sum(rows: ObjectiveReportRow[], key: 'housingUnits' | 'realizedUnits') {
  return rows.reduce((total, row) => total + row[key], 0);
}

export function buildObjectiveReport(
  records: OperationObjective[],
  operations: ObjectiveReportOperation[],
  year: number,
  kind: ObjectiveKind,
): ObjectiveReport {
  const operationById = new Map(operations.map((operation) => [operation.id, operation]));
  const selected = records
    .filter((record) => record.objective_year === year && record.kind === kind)
    .sort((left, right) => left.category === right.category ? 0 : left.category === 'initial' ? -1 : 1);

  // Un rattachement initial prime sur un éventuel doublon complémentaire.
  const usedOperationIds = new Set<string>();
  const objectiveRows = selected.flatMap((record) => {
    const operationId = record.operation_id;
    if (!operationId || usedOperationIds.has(operationId)) return [];
    const operation = operationById.get(operationId);
    if (!operation) return [];
    usedOperationIds.add(operationId);
    return [objectiveRow(record, operation)];
  });
  const initialRows = objectiveRows.filter((row) => row.source === 'initial');
  const supplementaryRows = objectiveRows.filter((row) => row.source === 'supplementary');
  const outsideRows = operations.flatMap((operation): ObjectiveReportRow[] => {
    const actual = actualDate(operation, kind);
    if (usedOperationIds.has(operation.id) || !actual || Number(actual.slice(0, 4)) !== year) return [];
    const units = operation.total_housing_units ?? 0;
    return [{
      recordId: null,
      operationId: operation.id,
      operationName: operation.name,
      department: operation.department ?? null,
      commune: operation.commune ?? null,
      source: 'actual-outside',
      objectiveDate: null,
      actualDate: actual,
      housingUnits: 0,
      realizedUnits: units,
      gainLoss: null,
    }];
  });
  const realizedInitialUnits = sum(initialRows, 'realizedUnits');
  const realizedSupplementaryUnits = sum(supplementaryRows, 'realizedUnits');
  const realizedOutsideUnits = sum(outsideRows, 'realizedUnits');
  return {
    year,
    kind,
    initialRows,
    supplementaryRows,
    outsideRows,
    rows: [...initialRows, ...supplementaryRows, ...outsideRows],
    summary: {
      initialUnits: sum(initialRows, 'housingUnits'),
      supplementaryUnits: sum(supplementaryRows, 'housingUnits'),
      realizedInitialUnits,
      realizedSupplementaryUnits,
      realizedOutsideUnits,
      landingUnits: realizedInitialUnits + realizedSupplementaryUnits + realizedOutsideUnits,
      gainLoss: objectiveRows.reduce((total, row) => total + (row.gainLoss ?? 0), 0),
    },
  };
}
