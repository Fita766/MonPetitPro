import { describe, expect, it } from 'vitest';
import { formatOperationValue, OPERATION_COLUMNS } from '../operationExport';
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


describe('marqueurs SO dans l’export opérations', () => {
  it('expose les colonnes SO pour CSI/CA et LLI', () => {
    const keys = OPERATION_COLUMNS.filter((column) => column.type === 'boolean').map((column) => column.key);
    expect(keys).toContain('so_csi_ca');
    expect(keys).toContain('so_lli_approval');
  });

  it('affiche SO quand le drapeau est coché, sinon vide', () => {
    const soColumn = OPERATION_COLUMNS.find((column) => column.key === 'so_csi_ca');
    expect(soColumn).toBeDefined();
    expect(formatOperationValue({ id: '1', name: 'A', so_csi_ca: true }, soColumn!)).toBe('SO');
    expect(formatOperationValue({ id: '1', name: 'A', so_csi_ca: false }, soColumn!)).toBe('');
  });
});
