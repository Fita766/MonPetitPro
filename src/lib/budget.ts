import type {
  BudgetFamily,
  OperationBudgetLine,
  RealizationMode,
} from '../types/domain';

export type BudgetPhase = 'forecast' | 'final';
export type BudgetMetric = 'ht' | 'ttc' | 'equity';

export interface BudgetAmounts {
  ht: number | null;
  ttc: number | null;
  equity: number | null;
}

export interface BudgetPhaseTotals {
  forecast: BudgetAmounts;
  final: BudgetAmounts;
}

export interface BudgetTotals {
  global: BudgetPhaseTotals;
  byFamily: Record<Exclude<BudgetFamily, 'general'>, BudgetPhaseTotals>;
  byMode: Record<RealizationMode, BudgetPhaseTotals>;
  warnings: string[];
}

const families: Exclude<BudgetFamily, 'general'>[] = ['LLS', 'LLI', 'managed'];
const modes: RealizationMode[] = ['MOD', 'VEFA'];
const metrics: BudgetMetric[] = ['ht', 'ttc', 'equity'];

function total(rows: OperationBudgetLine[], phase: BudgetPhase, metric: BudgetMetric): number | null {
  const values = rows
    .map((line) => line[`${phase}_${metric}`])
    .filter((value): value is number => value != null && Number.isFinite(value));
  return values.length ? values.reduce((sum, value) => sum + value, 0) : null;
}

function phaseTotals(rows: OperationBudgetLine[]): BudgetPhaseTotals {
  return {
    forecast: {
      ht: total(rows, 'forecast', 'ht'),
      ttc: total(rows, 'forecast', 'ttc'),
      equity: total(rows, 'forecast', 'equity'),
    },
    final: {
      ht: total(rows, 'final', 'ht'),
      ttc: total(rows, 'final', 'ttc'),
      equity: total(rows, 'final', 'equity'),
    },
  };
}

function lineWarnings(line: OperationBudgetLine): string[] {
  const label = `${line.family === 'managed' ? 'Logements gérés' : line.family} / ${line.realization_mode}`;
  const forecastValues = metrics.map((metric) => line[`forecast_${metric}`]);
  const finalValues = metrics.map((metric) => line[`final_${metric}`]);
  const warnings: string[] = [];
  if (forecastValues.some((value) => value != null)) {
    if (line.forecast_ht == null) warnings.push(`${label} : HT prévisionnel manquant`);
    if (line.forecast_ttc == null) warnings.push(`${label} : TTC prévisionnel manquant`);
    if (line.forecast_equity == null) warnings.push(`${label} : fonds propres prévisionnels manquants`);
  }
  if (forecastValues.some((value) => value != null) && finalValues.every((value) => value == null)) {
    warnings.push(`${label} : phase finale vide`);
  } else if (finalValues.some((value) => value != null)) {
    if (line.final_ht == null) warnings.push(`${label} : HT final manquant`);
    if (line.final_ttc == null) warnings.push(`${label} : TTC final manquant`);
    if (line.final_equity == null) warnings.push(`${label} : fonds propres finaux manquants`);
  }
  return warnings;
}

export function aggregateOperationBudget(lines: OperationBudgetLine[]): BudgetTotals {
  return {
    global: phaseTotals(lines),
    byFamily: Object.fromEntries(
      families.map((family) => [family, phaseTotals(lines.filter((line) => line.family === family))]),
    ) as BudgetTotals['byFamily'],
    byMode: Object.fromEntries(
      modes.map((mode) => [mode, phaseTotals(lines.filter((line) => line.realization_mode === mode))]),
    ) as BudgetTotals['byMode'],
    warnings: lines.flatMap(lineWarnings),
  };
}
