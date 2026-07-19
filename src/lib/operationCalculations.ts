import { addDays, addMonths, differenceInCalendarDays, format, isValid, parseISO } from 'date-fns';

type NullableDate = string | null | undefined;

export interface OperationScheduleInput {
  operationType: string;
  vefaDeedOrLandPurchaseDate?: NullableDate;
  worksOrderExpectedDate?: NullableDate;
  worksOrderActualDate?: NullableDate;
  contractualDeliveryDate?: NullableDate;
  expectedDeliveryDate?: NullableDate;
  actualDeliveryDate?: NullableDate;
  justifiedDelayDays?: number | null;
}

export interface OperationSchedule {
  contractualDeliveryDate: string | null;
  m8ExpectedDate: string | null;
  m7ExpectedDate: string | null;
  m4ExpectedDate: string | null;
  showHomeExpectedDate: string | null;
  managementExpectedDate: string | null;
  m3ReservationsMeetingDate: string | null;
  m10Date: string | null;
  gpaEndDate: string | null;
  h2DeadlineDate: string | null;
  deliveryGapDays: number | null;
  effectiveDelayDays: number | null;
  authorizedDeadlineDate: string | null;
  deadlineStatus: 'Retard' | 'Délai OK' | null;
}

function parseLocalDate(date: NullableDate): Date | null {
  if (!date) return null;
  const parsed = parseISO(date);
  return isValid(parsed) ? parsed : null;
}

function formatLocalDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function addMonthsSafe(date: NullableDate, months: number): string | null {
  const parsed = parseLocalDate(date);
  return parsed ? formatLocalDate(addMonths(parsed, months)) : null;
}

export function calculateBudgetPerHousing(
  reservationsCount: number | null | undefined,
  housingUnits: number | null | undefined,
): number | null {
  if (reservationsCount == null || housingUnits == null || housingUnits <= 0) return null;
  return reservationsCount / housingUnits;
}

export function calculateDeliveryGapDays(
  contractualDeliveryDate: NullableDate,
  actualDeliveryDate: NullableDate,
): number | null {
  const contractual = parseLocalDate(contractualDeliveryDate);
  const actual = parseLocalDate(actualDeliveryDate);
  return contractual && actual ? differenceInCalendarDays(actual, contractual) : null;
}

export function calculateAuthorizedDeadline(
  contractualDeliveryDate: NullableDate,
  justifiedDelayDays: number | null | undefined,
): string | null {
  const contractual = parseLocalDate(contractualDeliveryDate);
  if (!contractual) return null;
  return formatLocalDate(addDays(contractual, justifiedDelayDays ?? 0));
}

export function calculateDeadlineStatus(
  actualDeliveryDate: NullableDate,
  authorizedDeadlineDate: NullableDate,
): 'Retard' | 'Délai OK' | null {
  const actual = parseLocalDate(actualDeliveryDate);
  const authorized = parseLocalDate(authorizedDeadlineDate);
  if (!actual || !authorized) return null;
  return differenceInCalendarDays(actual, authorized) > 0 ? 'Retard' : 'Délai OK';
}

export function calculateOperationSchedule(input: OperationScheduleInput): OperationSchedule {
  const operationType = input.operationType.trim().toUpperCase();
  let contractualDeliveryDate = input.contractualDeliveryDate ?? null;

  if (!contractualDeliveryDate && operationType === 'VEFA') {
    contractualDeliveryDate = addMonthsSafe(input.vefaDeedOrLandPurchaseDate, 24);
  } else if (!contractualDeliveryDate && operationType === 'MOD') {
    contractualDeliveryDate = addMonthsSafe(
      input.worksOrderActualDate || input.worksOrderExpectedDate,
      24,
    );
  }

  const deliveryGapDays = calculateDeliveryGapDays(
    contractualDeliveryDate,
    input.actualDeliveryDate,
  );
  const justifiedDelayDays = input.justifiedDelayDays ?? 0;
  const authorizedDeadlineDate = calculateAuthorizedDeadline(
    contractualDeliveryDate,
    justifiedDelayDays,
  );

  return {
    contractualDeliveryDate,
    m8ExpectedDate: addMonthsSafe(contractualDeliveryDate, -8),
    m7ExpectedDate: addMonthsSafe(contractualDeliveryDate, -7),
    m4ExpectedDate: addMonthsSafe(contractualDeliveryDate, -4),
    showHomeExpectedDate: addMonthsSafe(contractualDeliveryDate, -6),
    managementExpectedDate: addMonthsSafe(input.expectedDeliveryDate, 1),
    m3ReservationsMeetingDate: addMonthsSafe(input.actualDeliveryDate, 3),
    m10Date: addMonthsSafe(input.actualDeliveryDate, 10),
    gpaEndDate: addMonthsSafe(input.actualDeliveryDate, 12),
    h2DeadlineDate: addMonthsSafe(input.actualDeliveryDate, 3),
    deliveryGapDays,
    effectiveDelayDays: deliveryGapDays == null ? null : deliveryGapDays - justifiedDelayDays,
    authorizedDeadlineDate,
    deadlineStatus: calculateDeadlineStatus(input.actualDeliveryDate, authorizedDeadlineDate),
  };
}
