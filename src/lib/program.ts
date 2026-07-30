import type {
  HousingProduct,
  OperationProgramLine,
  OperationProgramSection,
} from '../types/domain';

const PRODUCTS: HousingProduct[] = ['PLUS', 'PLAI', 'PLS', 'LLI', 'BRS', 'PSLA'];

export interface ProgramTotals {
  total: number;
  collective: number;
  individual: number;
  commercial: number;
  other: number;
  byProduct: Record<HousingProduct, number>;
}

export interface OperationProgramDraft {
  sections: OperationProgramSection[];
  lines: OperationProgramLine[];
}

export function calculateProgramTotals(
  sections: readonly OperationProgramSection[],
  lines: readonly OperationProgramLine[],
): ProgramTotals {
  const totals: ProgramTotals = {
    total: 0,
    collective: 0,
    individual: 0,
    commercial: 0,
    other: 0,
    byProduct: { PLUS: 0, PLAI: 0, PLS: 0, LLI: 0, BRS: 0, PSLA: 0 },
  };
  const activeSections = new Map(
    sections.filter((section) => section.enabled && section.id)
      .map((section) => [section.id as string, section.kind]),
  );

  for (const line of lines) {
    const kind = activeSections.get(line.section_id);
    const units = line.units;
    if (!kind || units == null || !Number.isFinite(units) || units < 0) continue;
    totals.total += units;
    if (kind === 'collective') totals.collective += units;
    else if (kind === 'individual') totals.individual += units;
    else if (kind === 'commercial') totals.commercial += units;
    else totals.other += units;
    if (line.product && PRODUCTS.includes(line.product)) totals.byProduct[line.product] += units;
  }
  return totals;
}

export function createDefaultProgram(
  idFactory: () => string = () => crypto.randomUUID(),
): OperationProgramDraft {
  return {
    sections: [
      { id: idFactory(), kind: 'collective', label: 'Logements collectifs', enabled: true, sort_order: 0 },
      { id: idFactory(), kind: 'individual', label: 'Logements individuels', enabled: false, sort_order: 10 },
      { id: idFactory(), kind: 'commercial', label: 'Commerces et locaux', enabled: false, sort_order: 20 },
    ],
    lines: [],
  };
}

export function normalizeProgramLine(
  line: OperationProgramLine,
): OperationProgramLine {
  return {
    ...line,
    label: line.label.trim(),
    units: line.units != null && Number.isFinite(line.units) && line.units >= 0 ? line.units : null,
    average_surface: line.average_surface != null
      && Number.isFinite(line.average_surface)
      && line.average_surface >= 0
      ? line.average_surface
      : null,
  };
}

