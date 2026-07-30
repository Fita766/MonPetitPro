import type {
  Operation,
  OperationBudgetLine,
  OperationProgramLine,
  OperationProgramSection,
  OperationSignificantWork,
  OperationSubsidy,
} from '../types/domain';
import { aggregateOperationBudget } from './budget';
import { calculateProgramTotals } from './program';
import type { SynthesisImage } from './synthesisPdf';

export interface SynthesisModel {
  operation: Partial<Operation> & Pick<Operation, 'name'>;
  program: ReturnType<typeof calculateProgramTotals>;
  typologySummary: Array<{ label: string; units: number }>;
  productSummary: Array<{ label: string; units: number }>;
  budget: ReturnType<typeof aggregateOperationBudget>;
  subsidyRows: OperationSubsidy[];
  subsidyTotal: number;
  significantWorks: OperationSignificantWork[];
  significantWorksTotal: number;
  totalSurface: number;
  pricePerSquareMeter: number | null;
  images: SynthesisImage[];
  warnings: string[];
}

export function totalSignificantWorks(rows: OperationSignificantWork[]): number {
  return Math.round(rows.reduce((total, row) => total + (row.amount_ht ?? 0), 0) * 100) / 100;
}

function summarize(
  lines: OperationProgramLine[],
  selector: (line: OperationProgramLine) => string | null,
) {
  const totals = new Map<string, number>();
  lines.forEach((line) => {
    const label = selector(line);
    if (label) totals.set(label, (totals.get(label) ?? 0) + (line.units ?? 0));
  });
  return [...totals].map(([label, units]) => ({ label, units }));
}

export function buildSynthesisModel(input: {
  operation: Partial<Operation> & Pick<Operation, 'name'>;
  sections: OperationProgramSection[];
  lines: OperationProgramLine[];
  budgetLines: OperationBudgetLine[];
  subsidies: OperationSubsidy[];
  significantWorks: OperationSignificantWork[];
  images: SynthesisImage[];
}): SynthesisModel {
  const budget = aggregateOperationBudget(input.budgetLines);
  const subsidyTotal = input.subsidies.reduce(
    (total, row) => total + (row.final_amount ?? row.forecast_amount ?? row.amount ?? 0),
    0,
  );
  const totalSurface = input.lines.reduce(
    (total, line) => total + (line.units ?? 0) * (line.average_surface ?? 0),
    0,
  );
  const referenceCost = budget.global.final.ht ?? budget.global.forecast.ht
    ?? input.operation.final_budget ?? input.operation.initial_budget ?? null;
  const warnings: string[] = [];
  if (!input.operation.synthesis_description) warnings.push('Description du projet manquante');
  if (!input.images.length) warnings.push('Aucune illustration');
  if (budget.global.final.ht == null && budget.global.forecast.ht == null && input.operation.final_budget == null && input.operation.initial_budget == null) {
    warnings.push('Budget HT non renseigné');
  }
  if (!input.operation.permit_order_date) warnings.push('Date de permis obtenu manquante');
  if (!input.operation.works_order_actual_date && !input.operation.works_order_expected_date) warnings.push('Date d’OS travaux manquante');
  return {
    operation: input.operation,
    program: calculateProgramTotals(input.sections, input.lines),
    typologySummary: summarize(input.lines, (line) => line.label),
    productSummary: summarize(input.lines, (line) => line.product),
    budget,
    subsidyRows: input.subsidies,
    subsidyTotal,
    significantWorks: input.significantWorks,
    significantWorksTotal: totalSignificantWorks(input.significantWorks),
    totalSurface,
    pricePerSquareMeter: referenceCost != null && totalSurface > 0 ? referenceCost / totalSurface : null,
    images: input.images,
    warnings,
  };
}
