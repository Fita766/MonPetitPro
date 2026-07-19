import { differenceInCalendarDays, parseISO } from 'date-fns';

export interface StatisticsOperation {
  id: string;
  name: string;
  promoter_name?: string | null;
  project_manager?: string | null;
  actual_delivery_date?: string | null;
  expected_delivery_date?: string | null;
  total_housing_units?: number | null;
  collective_housing_units?: number | null;
  individual_housing_units?: number | null;
  delivery_reservations_count?: number | null;
  reservations_clearance_date?: string | null;
  gpa_count?: number | null;
  initial_budget?: number | null;
  final_budget?: number | null;
  effective_delay_days?: number | null;
  stage?: string | null;
}

export interface PromoterStat {
  name: string;
  operations: number;
  housing: number;
  collectiveHousing: number;
  individualHousing: number;
  reservations: number;
  reservationsPerHousing: number | null;
  reservationsPerOperation: number | null;
  averageClearanceDays: number | null;
  lateOperations: number;
  lateHousing: number;
  doOperations: number;
}

export interface CtxStat {
  name: string;
  deliveredOperations: number;
  deliveredHousing: number;
  reservations: number;
  reservationsPerHousing: number | null;
  averageClearanceDays: number | null;
  previousYearAverageGpa: number | null;
}

function yearOf(date: string | null | undefined): number | null {
  return date ? Number(date.slice(0, 4)) : null;
}

function sum(values: (number | null | undefined)[]): number {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0);
}

function average(values: (number | null | undefined)[]): number | null {
  const present = values.filter((value): value is number => value != null && Number.isFinite(value));
  return present.length ? present.reduce((total, value) => total + value, 0) / present.length : null;
}

function clearanceDays(operation: StatisticsOperation): number | null {
  if (!operation.actual_delivery_date || !operation.reservations_clearance_date) return null;
  return differenceInCalendarDays(parseISO(operation.reservations_clearance_date), parseISO(operation.actual_delivery_date));
}

function divide(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null;
}

export function aggregatePromoters(operations: StatisticsOperation[], years: number[]): PromoterStat[] {
  const selected = operations.filter((operation) => operation.promoter_name && operation.actual_delivery_date && years.includes(yearOf(operation.actual_delivery_date) ?? -1));
  const names = [...new Set(selected.map((operation) => operation.promoter_name as string))].sort((a, b) => a.localeCompare(b, 'fr'));
  return names.map((name) => {
    const rows = selected.filter((operation) => operation.promoter_name === name);
    const housing = sum(rows.map((operation) => operation.total_housing_units));
    const reservations = sum(rows.map((operation) => operation.delivery_reservations_count));
    const late = rows.filter((operation) => (operation.effective_delay_days ?? 0) > 0);
    return {
      name,
      operations: rows.length,
      housing,
      collectiveHousing: sum(rows.map((operation) => operation.collective_housing_units)),
      individualHousing: sum(rows.map((operation) => operation.individual_housing_units)),
      reservations,
      reservationsPerHousing: divide(reservations, housing),
      reservationsPerOperation: divide(reservations, rows.length),
      averageClearanceDays: average(rows.map(clearanceDays)),
      lateOperations: late.length,
      lateHousing: sum(late.map((operation) => operation.total_housing_units)),
      doOperations: rows.filter((operation) => operation.stage === '4').length,
    };
  });
}

export function aggregateCtxStats(operations: StatisticsOperation[], year: number): CtxStat[] {
  const names = [...new Set(operations.flatMap((operation) => operation.project_manager ? [operation.project_manager] : []))].sort((a, b) => a.localeCompare(b, 'fr'));
  return names.map((name) => {
    const delivered = operations.filter((operation) => operation.project_manager === name && yearOf(operation.actual_delivery_date) === year);
    const prior = operations.filter((operation) => operation.project_manager === name && yearOf(operation.actual_delivery_date) === year - 1);
    const housing = sum(delivered.map((operation) => operation.total_housing_units));
    const reservations = sum(delivered.map((operation) => operation.delivery_reservations_count));
    return {
      name,
      deliveredOperations: delivered.length,
      deliveredHousing: housing,
      reservations,
      reservationsPerHousing: divide(reservations, housing),
      averageClearanceDays: average(delivered.map(clearanceDays)),
      previousYearAverageGpa: average(prior.map((operation) => operation.gpa_count)),
    };
  });
}

export interface DeliveryMonthStat {
  month: number;
  label: string;
  expected: number;
  actual: number;
  expectedCumulative: number;
  actualCumulative: number;
}

export function buildDeliveryStats(operations: StatisticsOperation[], year: number): DeliveryMonthStat[] {
  const labels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  let expectedCumulative = 0;
  let actualCumulative = 0;
  return labels.map((label, month) => {
    const expected = sum(operations.filter((operation) => yearOf(operation.expected_delivery_date) === year && Number(operation.expected_delivery_date?.slice(5, 7)) === month + 1).map((operation) => operation.total_housing_units));
    const actual = sum(operations.filter((operation) => yearOf(operation.actual_delivery_date) === year && Number(operation.actual_delivery_date?.slice(5, 7)) === month + 1).map((operation) => operation.total_housing_units));
    expectedCumulative += expected; actualCumulative += actual;
    return { month, label, expected, actual, expectedCumulative, actualCumulative };
  });
}

export function aggregateBudget(operations: StatisticsOperation[], years: number[]) {
  const selected = operations.filter((operation) => years.includes(yearOf(operation.actual_delivery_date || operation.expected_delivery_date) ?? -1));
  const initialBudget = sum(selected.map((operation) => operation.initial_budget));
  const finalBudget = sum(selected.map((operation) => operation.final_budget));
  return {
    operations: selected.length,
    initialBudget,
    finalBudget,
    variance: finalBudget - initialBudget,
    operationsWithInitialBudget: selected.filter((operation) => operation.initial_budget != null).length,
    operationsWithFinalBudget: selected.filter((operation) => operation.final_budget != null).length,
  };
}
