export type BusinessCalendarView = 'conditions' | 'deliveries' | 'management' | 'key-dates';

export interface CalendarOperation {
  id: string;
  name: string;
  project_manager?: string | null;
  operations_manager?: string | null;
  department?: string | null;
  promoter_name?: string | null;
  contractual_delivery_date?: string | null;
  expected_delivery_date?: string | null;
  actual_delivery_date?: string | null;
  management_expected_date?: string | null;
  management_actual_date?: string | null;
  [key: string]: unknown;
}

export interface CalendarCondition {
  id: string;
  operation_id: string;
  subject: string;
  deadline_date: string | null;
  completion_date: string | null;
}

export interface BusinessCalendarEvent {
  id: string;
  date: string;
  title: string;
  code: string;
  kind: BusinessCalendarView;
  actual: boolean;
  operationId: string;
  operationName: string;
  ctx: string | null;
  cop: string | null;
  department: string | null;
  promoter: string | null;
}

const KEY_DATES = [
  ['BA', 'm8_expected_date', 'M-8 prévisionnel', false], ['BB', 'm8_actual_date', 'M-8 réalisé', true],
  ['BC', 'assembly_to_works_date', 'Passation Montage → Travaux', true], ['BD', 'm7_expected_date', 'M-7 prévisionnel', false],
  ['BE', 'm7_actual_date', 'M-7 réalisé', true], ['BF', 'm4_expected_date', 'M-4 prévisionnel', false],
  ['BG', 'm4_actual_date', 'M-4 réalisé', true], ['BH', 'show_home_expected_date', 'Logement témoin prévisionnel', false],
  ['BI', 'show_home_actual_date', 'Logement témoin réel', true], ['BJ', 'opl_actual_date', 'OPL réelle', true],
  ['BL', 'expected_delivery_date', 'Livraison prévisionnelle', false], ['BN', 'actual_delivery_date', 'Livraison réelle', true],
  ['BT', 'authorized_deadline_date', 'Date limite autorisée', false], ['BW', 'reservations_clearance_date', 'Levée des réserves', true],
  ['BX', 'daact_date', 'Dépôt DAACT', true], ['BZ', 'management_expected_date', 'MEG prévisionnelle', false],
  ['CA', 'management_actual_date', 'MEG réelle', true], ['CB', 'm3_reservations_meeting_date', 'Réunion M+3', false],
  ['CC', 'm10_date', 'Jalon M+10', false], ['CD', 'gpa_end_date', 'Fin GPA', false],
  ['CF', 'h2_deadline_date', 'H2 butoir', false], ['CG', 'h2_actual_date', 'H2 réelle', true],
] as const;

function metadata(operation: CalendarOperation) {
  return {
    operationId: operation.id,
    operationName: operation.name,
    ctx: operation.project_manager ?? null,
    cop: operation.operations_manager ?? null,
    department: operation.department ?? null,
    promoter: operation.promoter_name ?? null,
  };
}

export function buildCalendarEvents(
  operations: CalendarOperation[],
  conditions: CalendarCondition[],
  view: BusinessCalendarView,
): BusinessCalendarEvent[] {
  if (view === 'conditions') {
    const byId = new Map(operations.map((operation) => [operation.id, operation]));
    return conditions.flatMap((condition) => {
      const operation = byId.get(condition.operation_id);
      if (!operation) return [];
      const events: BusinessCalendarEvent[] = [];
      if (condition.deadline_date) events.push({ id: `condition-${condition.id}`, date: condition.deadline_date, title: condition.subject, code: 'CS', kind: view, actual: false, ...metadata(operation) });
      if (condition.completion_date) events.push({ id: `condition-${condition.id}-realisee`, date: condition.completion_date, title: `${condition.subject} — réalisée`, code: 'CS-R', kind: view, actual: true, ...metadata(operation) });
      return events;
    }).sort((left, right) => left.date.localeCompare(right.date));
  }

  return operations.flatMap((operation): BusinessCalendarEvent[] => {
    if (view === 'deliveries') {
      const date = operation.actual_delivery_date || operation.expected_delivery_date || operation.contractual_delivery_date;
      if (!date) return [];
      const actual = Boolean(operation.actual_delivery_date);
      const code = operation.actual_delivery_date ? 'BN' : operation.expected_delivery_date ? 'BL' : 'AZ';
      return [{ id: `delivery-${operation.id}`, date, title: actual ? 'Livraison réelle' : 'Livraison prévisionnelle', code, kind: view, actual, ...metadata(operation) }];
    }
    if (view === 'management') {
      const date = operation.management_actual_date || operation.management_expected_date;
      if (!date) return [];
      const actual = Boolean(operation.management_actual_date);
      return [{ id: `management-${operation.id}`, date, title: actual ? 'Mise en gestion réelle' : 'Mise en gestion prévisionnelle', code: actual ? 'CA' : 'BZ', kind: view, actual, ...metadata(operation) }];
    }
    return KEY_DATES.flatMap(([code, key, title, actual]) => {
      const date = operation[key];
      return typeof date === 'string' && date ? [{ id: `key-${code}-${operation.id}`, date, title, code, kind: view, actual, ...metadata(operation) }] : [];
    });
  }).sort((left, right) => left.date.localeCompare(right.date));
}
