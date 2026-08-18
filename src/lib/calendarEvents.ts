import { MILESTONE_GROUPS } from './planningMilestones';

export type BusinessCalendarView =
  | 'conditions'
  | 'program'
  | 'works'
  | 'deliveries'
  | 'management'
  | 'key-dates';

export interface CalendarOperation {
  id: string;
  name: string;
  project_manager?: string | null;
  operations_manager?: string | null;
  department?: string | null;
  promoter_name?: string | null;
  stage?: string | null;
  operation_type?: string | null;
  program_nature?: string | null;
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
  milestoneType: string;
  operationId: string;
  operationName: string;
  ctx: string | null;
  cop: string | null;
  department: string | null;
  promoter: string | null;
  stage: string | null;
  mode: string | null;
  nature: string | null;
}

function metadata(operation: CalendarOperation) {
  return {
    operationId: operation.id,
    operationName: operation.name,
    ctx: operation.project_manager ?? null,
    cop: operation.operations_manager ?? null,
    department: operation.department ?? null,
    promoter: operation.promoter_name ?? null,
    stage: operation.stage ?? null,
    mode: operation.operation_type ?? null,
    nature: operation.program_nature ?? null,
  };
}

function milestoneCodes(code: string | undefined) {
  const codes = code?.split('/').map((part) => part.trim()) ?? ['—'];
  return { expected: codes[0] ?? '—', actual: codes[1] ?? codes[0] ?? '—' };
}

const VIEW_GROUPS: Record<'program' | 'works' | 'key-dates', string[]> = {
  program: ['committees', 'approvals', 'permits', 'land'],
  works: ['works', 'delivery_preparation'],
  'key-dates': MILESTONE_GROUPS.map((group) => group.key),
};

// jalons « permis » représentés par des lignes fixes dédiées dans la vue programme
const PROGRAM_FIXED_PERMIT_KEYS = new Set(['permit_submission', 'permit_order']);

function fixedPermitEvents(operation: CalendarOperation, view: 'program'): BusinessCalendarEvent[] {
  const events: BusinessCalendarEvent[] = [];
  if (typeof operation.permit_submission_date === 'string' && operation.permit_submission_date) {
    events.push({
      id: `program-permit_submission-fixed-${operation.id}`,
      date: operation.permit_submission_date,
      title: 'Dépôt PC',
      code: 'AR',
      kind: view,
      actual: true,
      milestoneType: 'permit_submission',
      ...metadata(operation),
    });
  }
  if (typeof operation.permit_order_date === 'string' && operation.permit_order_date) {
    events.push({
      id: `program-permit_order-fixed-${operation.id}`,
      date: operation.permit_order_date,
      title: 'Arrêté PC',
      code: 'AS',
      kind: view,
      actual: true,
      milestoneType: 'permit_order',
      ...metadata(operation),
    });
  }
  return events;
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
      if (condition.deadline_date) events.push({
        id: `condition-${condition.id}`,
        date: condition.deadline_date,
        title: condition.subject,
        code: 'CS',
        kind: view,
        actual: false,
        milestoneType: 'condition_deadline',
        ...metadata(operation),
      });
      if (condition.completion_date) events.push({
        id: `condition-${condition.id}-realisee`,
        date: condition.completion_date,
        title: `${condition.subject} — réalisée`,
        code: 'CS-R',
        kind: view,
        actual: true,
        milestoneType: 'condition_completion',
        ...metadata(operation),
      });
      return events;
    }).sort((left, right) => left.date.localeCompare(right.date));
  }

  return operations.flatMap((operation): BusinessCalendarEvent[] => {
    if (view === 'deliveries') {
      const date = operation.actual_delivery_date || operation.expected_delivery_date || operation.contractual_delivery_date;
      if (!date) return [];
      const actual = Boolean(operation.actual_delivery_date);
      const code = operation.actual_delivery_date ? 'BN' : operation.expected_delivery_date ? 'BL' : 'AZ';
      return [{
        id: `delivery-${operation.id}`,
        date,
        title: actual ? 'Livraison réelle' : 'Livraison prévisionnelle',
        code,
        kind: view,
        actual,
        milestoneType: 'delivery',
        ...metadata(operation),
      }];
    }
    if (view === 'management') {
      const date = operation.management_actual_date || operation.management_expected_date;
      if (!date) return [];
      const actual = Boolean(operation.management_actual_date);
      return [{
        id: `management-${operation.id}`,
        date,
        title: actual ? 'Mise en gestion réelle' : 'Mise en gestion prévisionnelle',
        code: actual ? 'CA' : 'BZ',
        kind: view,
        actual,
        milestoneType: 'management',
        ...metadata(operation),
      }];
    }

    const groups = MILESTONE_GROUPS.filter((group) => VIEW_GROUPS[view].includes(group.key));
    const milestoneEvents = groups.flatMap((group) => group.milestones.flatMap((milestone) => {
      if (milestone.appliesTo && !milestone.appliesTo.includes(operation.operation_type === 'VEFA' ? 'VEFA' : 'MOD')) return [];
      const codes = milestoneCodes(milestone.code);
      const events: BusinessCalendarEvent[] = [];
      const expected = milestone.expectedField ? operation[milestone.expectedField] : null;
      const actual = milestone.actualField ? operation[milestone.actualField] : null;
      if (typeof expected === 'string' && expected) events.push({
        id: `${view}-${milestone.key}-expected-${operation.id}`,
        date: expected,
        title: `${milestone.label} — prévisionnel`,
        code: codes.expected,
        kind: view,
        actual: false,
        milestoneType: milestone.key,
        ...metadata(operation),
      });
      if (typeof actual === 'string' && actual && !(view === 'program' && PROGRAM_FIXED_PERMIT_KEYS.has(milestone.key))) events.push({
        id: `${view}-${milestone.key}-actual-${operation.id}`,
        date: actual,
        title: `${milestone.label} — réel`,
        code: codes.actual,
        kind: view,
        actual: true,
        milestoneType: milestone.key,
        ...metadata(operation),
      });
      return events;
    }));
    const fixedEvents = view === 'program' ? fixedPermitEvents(operation, 'program') : [];
    return [...fixedEvents, ...milestoneEvents];
  }).sort((left, right) => left.date.localeCompare(right.date));
}
