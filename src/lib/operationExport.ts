import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { FilterableOperation } from './operationFilters';
import { getStageConfig } from './stage';
import type { OperationStage, PermissionKey } from '../types/domain';
import { projectExportRows, selectedExportColumns, type ExportColumn } from './exportRegistry';

export interface OperationColumn {
  key: string;
  label: string;
  type?: 'text' | 'date' | 'number' | 'currency' | 'stage';
  group?: string;
  requiredPermission?: PermissionKey;
}

export const OPERATION_COLUMNS: OperationColumn[] = [
  { key: 'stage', label: 'Stade', type: 'stage' }, { key: 'name', label: 'Nom opération' }, { key: 'of_number', label: 'N° OF' },
  { key: 'gesprojet_number', label: 'N° Gesprojet' }, { key: 'department', label: 'Département' }, { key: 'commune', label: 'Commune' },
  { key: 'address', label: 'Adresse' }, { key: 'total_housing_units', label: 'Logements', type: 'number' }, { key: 'operation_type', label: 'Type' },
  { key: 'promoter_name', label: 'Promoteur', group: 'Équipe' }, { key: 'operations_manager', label: 'COP', group: 'Équipe' }, { key: 'project_manager', label: 'CTX', group: 'Équipe' },
  { key: 'manager_name', label: 'Gestionnaire', group: 'Équipe' }, { key: 'certification', label: 'Certification' }, { key: 'thermal_regulation', label: 'Thermique' },
  { key: 'contractual_delivery_date', label: 'Livraison contractuelle', type: 'date', group: 'Planning' },
  { key: 'expected_delivery_date', label: 'Livraison prévisionnelle', type: 'date', group: 'Planning' },
  { key: 'actual_delivery_date', label: 'Livraison réelle', type: 'date', group: 'Planning' },
  { key: 'management_expected_date', label: 'MEG prévisionnelle', type: 'date', group: 'Planning' },
  { key: 'management_actual_date', label: 'MEG réelle', type: 'date', group: 'Planning' },
  { key: 'initial_budget', label: 'Budget initial', type: 'currency', group: 'Budget', requiredPermission: 'operations.edit_budget' },
  { key: 'final_budget', label: 'Budget final', type: 'currency', group: 'Budget', requiredPermission: 'operations.edit_budget' },
  { key: 'objective_year', label: 'Année objectif', type: 'number' },
];

export function formatOperationValue(operation: FilterableOperation, column: OperationColumn): string {
  const value = operation[column.key];
  if (value == null || value === '') return '';
  if (column.type === 'stage') return `Stade ${String(value)} — ${getStageConfig(value as OperationStage).label}`;
  if (column.type === 'date') return new Date(`${String(value)}T12:00:00`).toLocaleDateString('fr-FR');
  if (column.type === 'currency') return Number(value).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
  if (column.type === 'number') return Number(value).toLocaleString('fr-FR');
  return String(value);
}

export const OPERATION_EXPORT_REGISTRY: ExportColumn<FilterableOperation>[] = OPERATION_COLUMNS.map((column) => ({
  key: column.key,
  label: column.label,
  group: column.group ?? 'Général',
  requiredPermission: column.requiredPermission,
  formatter: (operation) => formatOperationValue(operation, column),
}));

export async function exportOperationsExcel(operations: FilterableOperation[], columnKeys: string[]): Promise<void> {
  const columns = selectedExportColumns(columnKeys, OPERATION_EXPORT_REGISTRY);
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Opérations');
  sheet.addRow(['MONPETITPRO — EXTRACTION OPÉRATIONS']);
  sheet.mergeCells(1, 1, 1, Math.max(columns.length, 1));
  sheet.getRow(1).height = 28;
  sheet.getCell(1, 1).font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  sheet.getCell(1, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
  sheet.addRow(columns.map((column) => column.label));
  const header = sheet.getRow(2);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
  projectExportRows(operations, columnKeys, OPERATION_EXPORT_REGISTRY).forEach((row) => sheet.addRow(row));
  columns.forEach((column, index) => { sheet.getColumn(index + 1).width = Math.min(38, Math.max(14, column.label.length + 4)); });
  sheet.views = [{ state: 'frozen', ySplit: 2 }];
  const buffer = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `operations-${new Date().toISOString().slice(0, 10)}.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function exportOperationsPdf(operations: FilterableOperation[], columnKeys: string[]): void {
  const columns = selectedExportColumns(columnKeys, OPERATION_EXPORT_REGISTRY);
  const document = new jsPDF({ orientation: columns.length > 5 ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
  document.setFontSize(16);
  document.text('MonPetitPro — Extraction opérations', 14, 16);
  document.setFontSize(8);
  document.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} · ${operations.length} opération(s)`, 14, 22);
  autoTable(document, {
    startY: 27,
    head: [columns.map((column) => column.label)],
    body: projectExportRows(operations, columnKeys, OPERATION_EXPORT_REGISTRY),
    styles: { fontSize: 6, cellPadding: 1.5, overflow: 'linebreak' },
    headStyles: { fillColor: [15, 118, 110], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 8, right: 8 },
  });
  document.save(`operations-${new Date().toISOString().slice(0, 10)}.pdf`);
}
