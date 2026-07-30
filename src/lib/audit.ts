export interface AuditChange {
  key: string;
  label: string;
  before: string;
  after: string;
}

const hiddenKeys = new Set([
  'id', 'created_at', 'updated_at', 'user_id', 'created_by',
  'resolution_validated_by', 'source_typology_id',
]);

function display(value: unknown): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  if (typeof value === 'number') return value.toLocaleString('fr-FR');
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T12:00:00`).toLocaleDateString('fr-FR');
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function formatAuditChanges(
  oldValues: Record<string, unknown> | null,
  newValues: Record<string, unknown> | null,
  labels: Record<string, string> = {},
): AuditChange[] {
  const keys = [...new Set([...Object.keys(oldValues ?? {}), ...Object.keys(newValues ?? {})])];
  return keys.flatMap((key) => {
    if (hiddenKeys.has(key)) return [];
    const beforeValue = oldValues?.[key];
    const afterValue = newValues?.[key];
    if (JSON.stringify(beforeValue) === JSON.stringify(afterValue)) return [];
    return [{
      key,
      label: labels[key] ?? key.replaceAll('_', ' '),
      before: display(beforeValue),
      after: display(afterValue),
    }];
  });
}
