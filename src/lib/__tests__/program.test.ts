import { describe, expect, it } from 'vitest';
import { calculateProgramTotals, createDefaultProgram, reorderProgramLine } from '../program';

describe('operation program', () => {
  it('calculates totals once from active detailed lines', () => {
    const totals = calculateProgramTotals(
      [
        { id: 'collective', kind: 'collective', label: 'Collectif', enabled: true, sort_order: 0 },
        { id: 'individual', kind: 'individual', label: 'Individuel', enabled: true, sort_order: 1 },
        { id: 'commerce', kind: 'commercial', label: 'Commerces', enabled: true, sort_order: 2 },
      ],
      [
        { section_id: 'collective', label: 'T2', product: 'PLUS', units: 4, average_surface: 52, sort_order: 0 },
        { section_id: 'individual', label: 'T4', product: 'PLAI', units: 3, average_surface: 80, sort_order: 0 },
        { section_id: 'commerce', label: 'Local 1', product: null, units: 1, average_surface: 95, sort_order: 0 },
      ],
    );

    expect(totals).toEqual({
      total: 8,
      collective: 4,
      individual: 3,
      commercial: 1,
      other: 0,
      byProduct: { PLUS: 4, PLAI: 3, PLS: 0, LLI: 0, BRS: 0, PSLA: 0 },
    });
  });

  it('ignores disabled sections, nulls, negative and non-finite units', () => {
    const totals = calculateProgramTotals(
      [
        { id: 'on', kind: 'custom', label: 'Actif', enabled: true, sort_order: 0 },
        { id: 'off', kind: 'collective', label: 'Inactif', enabled: false, sort_order: 1 },
      ],
      [
        { section_id: 'on', label: 'A', product: 'PLUS', units: null, average_surface: null, sort_order: 0 },
        { section_id: 'on', label: 'B', product: 'PLUS', units: -2, average_surface: null, sort_order: 1 },
        { section_id: 'on', label: 'C', product: 'PLUS', units: Number.NaN, average_surface: null, sort_order: 2 },
        { section_id: 'off', label: 'D', product: 'PLAI', units: 20, average_surface: null, sort_order: 0 },
      ],
    );
    expect(totals.total).toBe(0);
    expect(totals.byProduct.PLUS).toBe(0);
    expect(totals.byProduct.PLAI).toBe(0);
  });

  it('creates stable default collective, individual and commercial sections', () => {
    const program = createDefaultProgram(() => 'fixed-id');
    expect(program.sections.map((section) => section.kind)).toEqual(['collective', 'individual', 'commercial']);
    expect(program.sections.map((section) => section.enabled)).toEqual([true, false, false]);
    expect(program.lines).toEqual([]);
  });

  it('reorders lines only inside their own section', () => {
    const lines = [
      { id: 'a', section_id: 'one', label: 'A', product: 'PLUS' as const, units: 1, average_surface: null, sort_order: 0 },
      { id: 'b', section_id: 'one', label: 'B', product: 'PLUS' as const, units: 1, average_surface: null, sort_order: 10 },
      { id: 'c', section_id: 'two', label: 'C', product: 'PLAI' as const, units: 1, average_surface: null, sort_order: 0 },
    ];

    const reordered = reorderProgramLine(lines, 'b', -1);
    expect(reordered.filter((line) => line.section_id === 'one')
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((line) => [line.id, line.sort_order]))
      .toEqual([['b', 0], ['a', 10]]);
    expect(reordered.find((line) => line.id === 'c')?.sort_order).toBe(0);
  });
});
