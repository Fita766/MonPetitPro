export interface ObjectiveOperation {
  id: string;
  name: string;
  department?: string | null;
  commune?: string | null;
  address?: string | null;
  total_housing_units?: number | null;
  is_objective?: boolean | null;
  objective_year?: number | null;
  objective_housing_units?: number | null;
  objective_management_date?: string | null;
  contractual_delivery_date?: string | null;
  management_expected_date?: string | null;
  management_actual_date?: string | null;
}

export interface ObjectiveMonth {
  month: number;
  label: string;
  value: string | null;
  realized: boolean;
}

export interface ObjectiveRow {
  id: string;
  name: string;
  department: string | null;
  commune: string | null;
  address: string | null;
  contractualDeliveryDate: string | null;
  expectedManagementDate: string | null;
  actualManagementDate: string | null;
  objectiveDate: string | null;
  objectiveHousingUnits: number;
  actualHousingUnits: number;
  gainLoss: number | null;
  source: 'objective' | 'actual-outside';
  months: ObjectiveMonth[];
}

const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

function monthIndex(date: string): number {
  const [year, month] = date.split('-').map(Number);
  return year * 12 + month - 1;
}

export function calculateHousingGainLoss(objectiveDate: string | null | undefined, actualDate: string | null | undefined, housingUnits: number | null | undefined): number | null {
  if (!objectiveDate || !actualDate || housingUnits == null) return null;
  return (monthIndex(objectiveDate) - monthIndex(actualDate)) * housingUnits;
}

function buildMonths(year: number, objectiveDate: string | null, actualDate: string | null): ObjectiveMonth[] {
  const actualIndex = actualDate && Number(actualDate.slice(0, 4)) === year ? Number(actualDate.slice(5, 7)) - 1 : null;
  return MONTH_LABELS.map((label, month) => ({
    month,
    label,
    value: actualDate || objectiveDate,
    realized: actualIndex != null && month >= actualIndex,
  }));
}

export function buildObjectiveRows(operations: ObjectiveOperation[], year: number): ObjectiveRow[] {
  return operations.filter((operation) => operation.is_objective && operation.objective_year === year).map((operation) => {
    const objectiveDate = operation.objective_management_date || operation.management_expected_date || null;
    const objectiveHousingUnits = operation.objective_housing_units ?? operation.total_housing_units ?? 0;
    return {
      id: operation.id,
      name: operation.name,
      department: operation.department ?? null,
      commune: operation.commune ?? null,
      address: operation.address ?? null,
      contractualDeliveryDate: operation.contractual_delivery_date ?? null,
      expectedManagementDate: operation.management_expected_date ?? null,
      actualManagementDate: operation.management_actual_date ?? null,
      objectiveDate,
      objectiveHousingUnits,
      actualHousingUnits: operation.management_actual_date ? operation.total_housing_units ?? objectiveHousingUnits : 0,
      gainLoss: calculateHousingGainLoss(objectiveDate, operation.management_actual_date, objectiveHousingUnits),
      source: 'objective' as const,
      months: buildMonths(year, objectiveDate, operation.management_actual_date ?? null),
    };
  });
}

export function mergeActualOutsideObjectives(objectiveRows: ObjectiveRow[], operations: ObjectiveOperation[], year: number): ObjectiveRow[] {
  const existingIds = new Set(objectiveRows.map((row) => row.id));
  const outside = operations.filter((operation) => {
    return !existingIds.has(operation.id)
      && Boolean(operation.management_actual_date)
      && Number(operation.management_actual_date?.slice(0, 4)) === year;
  }).map((operation): ObjectiveRow => ({
    id: operation.id,
    name: operation.name,
    department: operation.department ?? null,
    commune: operation.commune ?? null,
    address: operation.address ?? null,
    contractualDeliveryDate: operation.contractual_delivery_date ?? null,
    expectedManagementDate: operation.management_expected_date ?? null,
    actualManagementDate: operation.management_actual_date ?? null,
    objectiveDate: null,
    objectiveHousingUnits: 0,
    actualHousingUnits: operation.total_housing_units ?? 0,
    gainLoss: null,
    source: 'actual-outside',
    months: buildMonths(year, null, operation.management_actual_date ?? null),
  }));
  return [...objectiveRows, ...outside];
}
