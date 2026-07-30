import { visibleMilestones } from './planningMilestones';

export type AlertStatus = 'overdue' | 'within15' | 'within30';

export interface AlertOperation {
  id: string;
  name: string;
  operation_type?: string | null;
  [key: string]: unknown;
}

export interface OperationAlert {
  id: string;
  operationId: string;
  operationName: string;
  milestoneKey: string;
  label: string;
  date: string;
  days: number;
  status: AlertStatus;
}

function utcTimestamp(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const result = Date.UTC(year, month - 1, day);
  const date = new Date(result);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? result
    : null;
}

export function buildAlerts(
  operations: readonly AlertOperation[],
  today: string,
): OperationAlert[] {
  const todayTime = utcTimestamp(today);
  if (todayTime == null) return [];
  return operations.flatMap((operation) => {
    const mode = operation.operation_type === 'VEFA' ? 'VEFA' : 'MOD';
    return visibleMilestones(mode).flatMap((milestone): OperationAlert[] => {
      if (!milestone.alertEligible || !milestone.expectedField) return [];
      const expected = operation[milestone.expectedField];
      const actual = milestone.actualField ? operation[milestone.actualField] : null;
      if (typeof expected !== 'string' || !expected || (typeof actual === 'string' && actual)) return [];
      const expectedTime = utcTimestamp(expected);
      if (expectedTime == null) return [];
      const days = Math.round((expectedTime - todayTime) / 86_400_000);
      if (days > 30) return [];
      const status: AlertStatus = days < 0 ? 'overdue' : days <= 15 ? 'within15' : 'within30';
      return [{
        id: `${operation.id}-${milestone.key}-${expected}`,
        operationId: operation.id,
        operationName: operation.name,
        milestoneKey: milestone.key,
        label: milestone.label,
        date: expected,
        days,
        status,
      }];
    });
  }).sort((left, right) => left.date.localeCompare(right.date));
}

