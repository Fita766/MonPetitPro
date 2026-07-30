import type { PermissionKey } from '../types/domain';

export interface ExportColumn<T> {
  key: string;
  label: string;
  group: string;
  formatter: (row: T) => string | number;
  requiredPermission?: PermissionKey;
}

export function authorizedColumns<T>(
  registry: ExportColumn<T>[],
  permissions: readonly PermissionKey[],
): ExportColumn<T>[] {
  return registry.filter((column) =>
    !column.requiredPermission || permissions.includes(column.requiredPermission));
}

export function selectedExportColumns<T>(
  selectedKeys: string[],
  registry: ExportColumn<T>[],
): ExportColumn<T>[] {
  return selectedKeys.flatMap((key) => {
    const column = registry.find((candidate) => candidate.key === key);
    return column ? [column] : [];
  });
}

export function projectExportRows<T>(
  rows: T[],
  selectedKeys: string[],
  registry: ExportColumn<T>[],
): Array<Array<string | number>> {
  const columns = selectedExportColumns(selectedKeys, registry);
  return rows.map((row) => columns.map((column) => column.formatter(row)));
}

export const exportFormatters = {
  text: (value: unknown) => value == null ? '' : String(value),
  number: (value: unknown) => value == null || value === '' ? '' : Number(value).toLocaleString('fr-FR'),
  date: (value: unknown) => typeof value === 'string' && value
    ? new Date(`${value}T12:00:00`).toLocaleDateString('fr-FR')
    : '',
  currency: (value: unknown) => value == null || value === ''
    ? ''
    : Number(value).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }),
};
