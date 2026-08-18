import { visibleMilestones } from './planningMilestones';

export type AlertStatus = 'overdue' | 'within15' | 'within30';

export interface AlertOperation {
  id: string;
  name: string;
  operation_type?: string | null;
  [key: string]: unknown;
}

export interface AlertCondition {
  id: string;
  operation_id: string;
  subject: string;
  deadline_date: string | null;
  completion_date: string | null;
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

const PERMIT_VALIDITY_YEARS = 3;

function utcTimestamp(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const result = Date.UTC(year, month - 1, day);
  const date = new Date(result);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? result
    : null;
}

function isoFromUtcTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

/** Date (ISO) de péremption d'un permis délivré le jour de l'arrêté (validité 3 ans). */
export function permitLapseDate(permitOrderDate: string | null | undefined): string | null {
  if (!permitOrderDate) return null;
  const timestamp = utcTimestamp(permitOrderDate);
  if (timestamp == null) return null;
  const [year, month, day] = permitOrderDate.split('-').map(Number);
  return isoFromUtcTimestamp(Date.UTC(year + PERMIT_VALIDITY_YEARS, month - 1, day));
}

/** Vrai si l'arrêté date de plus de 3 ans et qu'aucun ordre de service travaux n'est engagé. */
export function isPermitLapsed(
  permitOrderDate: unknown,
  worksOrderActualDate: unknown,
  today: string,
): boolean {
  const lapse = permitLapseDate(typeof permitOrderDate === 'string' ? permitOrderDate : null);
  if (!lapse) return false;
  const todayTime = utcTimestamp(today);
  if (todayTime == null) return false;
  if (utcTimestamp(lapse)! >= todayTime) return false;
  if (typeof worksOrderActualDate === 'string' && worksOrderActualDate) return false;
  return true;
}

export function buildAlerts(
  operations: readonly AlertOperation[],
  conditions: readonly AlertCondition[],
  today: string,
): OperationAlert[] {
  const todayTime = utcTimestamp(today);
  if (todayTime == null) return [];
  const milestoneAlerts = operations.flatMap((operation) => {
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
  });

  const permitAlerts = operations.flatMap((operation): OperationAlert[] => {
    if (!isPermitLapsed(operation.permit_order_date, operation.works_order_actual_date, today)) return [];
    const lapse = permitLapseDate(typeof operation.permit_order_date === 'string' ? operation.permit_order_date : null)!;
    const lapseTime = utcTimestamp(lapse)!;
    return [{
      id: `${operation.id}-permit_expired-${lapse}`,
      operationId: operation.id,
      operationName: operation.name,
      milestoneKey: 'permit_expired',
      label: 'PC périmé',
      date: lapse,
      days: Math.round((lapseTime - todayTime) / 86_400_000),
      status: 'overdue',
    }];
  });

  const operationById = new Map(operations.map((operation) => [operation.id, operation]));
  const conditionAlerts = conditions.flatMap((condition): OperationAlert[] => {
    const operation = operationById.get(condition.operation_id);
    if (!operation) return [];
    const deadlineTime = utcTimestamp(condition.deadline_date ?? '');
    if (deadlineTime == null || deadlineTime >= todayTime) return [];
    if (typeof condition.completion_date === 'string' && condition.completion_date) return [];
    const deadline = condition.deadline_date!;
    return [{
      id: `${operation.id}-condition-${condition.id}-${deadline}`,
      operationId: operation.id,
      operationName: operation.name,
      milestoneKey: 'condition_overdue',
      label: condition.subject,
      date: deadline,
      days: Math.round((deadlineTime - todayTime) / 86_400_000),
      status: 'overdue',
    }];
  });

  return [...milestoneAlerts, ...permitAlerts, ...conditionAlerts]
    .sort((left, right) => left.date.localeCompare(right.date));
}

