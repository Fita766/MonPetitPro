import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { FilterableOperation } from './operationFilters';
import { getStageConfig } from './stage';
import type { OperationStage } from '../types/domain';

export interface OperationColumn {
  key: string;
  label: string;
  type?: 'text' | 'date' | 'number' | 'currency' | 'stage';
}

export const OPERATION_COLUMNS: OperationColumn[] = [
  { key: 'stage', label: 'Stade', type: 'stage' }, { key: 'name', label: 'Nom opération' }, { key: 'of_number', label: 'N° OF' },
  { key: 'gesprojet_number', label: 'N° Gesprojet' }, { key: 'department', label: 'Département' }, { key: 'commune', label: 'Commune' },
  { key: 'address', label: 'Adresse' }, { key: 'total_housing_units', label: 'Logements', type: 'number' }, { key: 'operation_type', label: 'Type' },
  { key: 'promoter_name', label: 'Promoteur' }, { key: 'operations_manager', label: 'COP' }, { key: 'project_manager', label: 'CTX' },
  { key: 'manager_name', label: 'Gestionnaire' }, { key: 'certification', label: 'Certification' }, { key: 'thermal_regulation', label: 'Thermique' },
  { key: 'contractual_delivery_date', label: 'Livraison contractuelle', type: 'date' }, { key: 'expected_delivery_date', label: 'Livraison prévisionnelle', type: 'date' },
  { key: 'actual_delivery_date', label: 'Livraison réelle', type: 'date' }, { key: 'management_expected_date', label: 'MEG prévisionnelle', type: 'date' },
  { key: 'management_actual_date', label: 'MEG réelle', type: 'date' }, { key: 'initial_budget', label: 'Budget initial', type: 'currency' },
  { key: 'final_budget', label: 'Budget final', type: 'currency' }, { key: 'objective_year', label: 'Année objectif', type: 'number' },
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

function selectedColumns(keys: string[]): OperationColumn[] {
  return keys.flatMap((key) => {
    const column = OPERATION_COLUMNS.find((candidate) => candidate.key === key);
    return column ? [column] : [];
  });
}

export async function exportOperationsExcel(operations: FilterableOperation[], columnKeys: string[]): Promise<void> {
  const columns = selectedColumns(columnKeys);
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Opérations');
  sheet.addRow(['MONPETITPRO — EXTRACTION OPÉRATIONS']);
  sheet.mergeCells(1, 1, 1, Math.max(columns.length, 1));
  sheet.getRow(1).height = 28;
  sheet.getCell(1, 1).font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  sheet.getCell(1, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  sheet.addRow(columns.map((column) => column.label));
  const header = sheet.getRow(2);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
  operations.forEach((operation) => sheet.addRow(columns.map((column) => formatOperationValue(operation, column))));
  columns.forEach((column, index) => { sheet.getColumn(index + 1).width = Math.min(38, Math.max(14, column.label.length + 4)); });
  sheet.views = [{ state: 'frozen', ySplit: 2 }];
  const buffer = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = `operations-${new Date().toISOString().slice(0, 10)}.xlsx`; anchor.click(); URL.revokeObjectURL(url);
}

export function exportOperationsPdf(operations: FilterableOperation[], columnKeys: string[]): void {
  const columns = selectedColumns(columnKeys);
  const document = new jsPDF({ orientation: columns.length > 5 ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
  document.setFontSize(16); document.setTextColor(15, 23, 42); document.text('MonPetitPro — Extraction opérations', 14, 16);
  document.setFontSize(8); document.setTextColor(100); document.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} · ${operations.length} opération(s)`, 14, 22);
  autoTable(document, { startY: 27, head: [columns.map((column) => column.label)], body: operations.map((operation) => columns.map((column) => formatOperationValue(operation, column))), styles: { fontSize: 6, cellPadding: 1.5, overflow: 'linebreak' }, headStyles: { fillColor: [15, 118, 110], textColor: 255 }, alternateRowStyles: { fillColor: [248, 250, 252] }, margin: { left: 8, right: 8 } });
  document.save(`operations-${new Date().toISOString().slice(0, 10)}.pdf`);
}
