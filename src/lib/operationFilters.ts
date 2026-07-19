export interface FilterableOperation {
  id: string;
  name: string;
  stage?: string | null;
  department?: string | null;
  commune?: string | null;
  operations_manager?: string | null;
  project_manager?: string | null;
  promoter_name?: string | null;
  operation_type?: string | null;
  certification?: string | null;
  thermal_regulation?: string | null;
  contractual_delivery_date?: string | null;
  expected_delivery_date?: string | null;
  actual_delivery_date?: string | null;
  [key: string]: unknown;
}

export interface OperationFilters {
  stages: string[];
  departments: string[];
  communes: string[];
  cops: string[];
  ctxs: string[];
  promoters: string[];
  operationTypes: string[];
  labels: string[];
  deliveryFrom: string;
  deliveryTo: string;
  query: string;
}

function inSelection(value: string | null | undefined, selection: string[]): boolean {
  return selection.length === 0 || (value != null && selection.includes(value));
}

function normalized(value: unknown): string {
  return value == null ? '' : String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr');
}

function deliveryDate(operation: FilterableOperation): string | null {
  return operation.actual_delivery_date || operation.expected_delivery_date || operation.contractual_delivery_date || null;
}

export function filterOperations<T extends FilterableOperation>(operations: T[], filters: OperationFilters): T[] {
  const query = normalized(filters.query.trim());
  return operations.filter((operation) => {
    if (!inSelection(operation.stage, filters.stages)) return false;
    if (!inSelection(operation.department, filters.departments)) return false;
    if (!inSelection(operation.commune, filters.communes)) return false;
    if (!inSelection(operation.operations_manager, filters.cops)) return false;
    if (!inSelection(operation.project_manager, filters.ctxs)) return false;
    if (!inSelection(operation.promoter_name, filters.promoters)) return false;
    if (!inSelection(operation.operation_type, filters.operationTypes)) return false;
    if (filters.labels.length && !filters.labels.some((label) => label === operation.certification || label === operation.thermal_regulation)) return false;

    const date = deliveryDate(operation);
    if (filters.deliveryFrom && (!date || date < filters.deliveryFrom)) return false;
    if (filters.deliveryTo && (!date || date > filters.deliveryTo)) return false;

    if (query) {
      const haystack = [operation.name, operation.commune, operation.department, operation.operations_manager, operation.project_manager, operation.promoter_name, operation.operation_type]
        .map(normalized)
        .join(' ');
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

export function sortOperations<T extends FilterableOperation>(operations: T[], key: keyof T, direction: 'asc' | 'desc'): T[] {
  return [...operations].sort((left, right) => {
    const leftValue = left[key];
    const rightValue = right[key];
    const leftEmpty = leftValue == null || leftValue === '';
    const rightEmpty = rightValue == null || rightValue === '';
    if (leftEmpty && rightEmpty) return 0;
    if (leftEmpty) return 1;
    if (rightEmpty) return -1;
    const comparison = String(leftValue).localeCompare(String(rightValue), 'fr', { numeric: true, sensitivity: 'base' });
    return direction === 'asc' ? comparison : -comparison;
  });
}

export function uniqueFilterValues(operations: FilterableOperation[], key: keyof FilterableOperation): string[] {
  return [...new Set(operations.flatMap((operation) => {
    const value = operation[key];
    return typeof value === 'string' && value.trim() ? [value] : [];
  }))].sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }));
}
