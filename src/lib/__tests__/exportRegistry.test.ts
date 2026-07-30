import { describe, expect, it } from 'vitest';
import { authorizedColumns, projectExportRows, type ExportColumn } from '../exportRegistry';

const registry: ExportColumn<Record<string, unknown>>[] = [
  { key: 'name', label: 'Nom', group: 'Général', formatter: (row) => String(row.name ?? '') },
  { key: 'date', label: 'Date', group: 'Général', formatter: (row) => row.date ? new Date(`${row.date}T12:00:00`).toLocaleDateString('fr-FR') : '' },
  { key: 'budget', label: 'Budget', group: 'Finance', requiredPermission: 'operations.edit_budget', formatter: (row) => Number(row.budget).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }) },
  { key: 'dg', label: 'DG', group: 'Confidentiel', requiredPermission: 'observations.view_dg', formatter: (row) => row.dg ? 'Oui' : 'Non' },
];

describe('registre d’export', () => {
  it('conserve exactement l’ordre des colonnes sélectionnées', () => {
    expect(projectExportRows([{ name: 'A', date: '2026-07-29' }], ['date', 'name'], registry)[0])
      .toEqual(['29/07/2026', 'A']);
  });

  it('omet les colonnes inconnues au lieu de revenir à une liste par défaut', () => {
    expect(projectExportRows([{ name: 'A' }], ['unknown'], registry)).toEqual([[]]);
  });

  it('retire budget et DG sans les permissions exactes', () => {
    expect(authorizedColumns(registry, []).map((column) => column.key)).toEqual(['name', 'date']);
    expect(authorizedColumns(registry, ['operations.edit_budget']).map((column) => column.key))
      .toEqual(['name', 'date', 'budget']);
  });
});
