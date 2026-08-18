import type { BusinessCalendarEvent } from './calendarEvents';

export interface CalendarOpWithOsDate {
  works_order_actual_date?: string | null;
  works_order_expected_date?: string | null;
}

// Coupure entre la partie COP (avant/à l'OS) et la partie CTX (à partir de l'OS).
// L'OS réel (travaux engagés) prime sur l'OS prévisionnel.
export function osBoundaryDate(op: CalendarOpWithOsDate): string | null {
  return op.works_order_actual_date || op.works_order_expected_date || null;
}

type ScopedEvent = Pick<
  BusinessCalendarEvent,
  'id' | 'operationId' | 'copUserId' | 'ctxUserId' | 'date'
>;

// Restreint une liste d'événements calendrier à ce que l'utilisateur connecté
// doit voir : uniquement les opérations dont il est COP ou CTX, coupées à l'OS
// (COP : jalon ≤ OS ; CTX : jalon ≥ OS ; l'OS est partagé). Les lecteurs avec
// `calendar.view_all` reçoivent tout inchangé. L'ordre d'entrée est préservé.
export function filterCurrentUserEvents<E extends ScopedEvent>(
  events: E[],
  opsById: Record<string, CalendarOpWithOsDate | undefined>,
  user: { id: string; hasViewAll: boolean },
): E[] {
  if (user.hasViewAll) return events;
  return events.filter((event) => {
    const isCop = event.copUserId === user.id;
    const isCtx = event.ctxUserId === user.id;
    if (!isCop && !isCtx) return false;
    const op = opsById[event.operationId];
    const osDate = op ? osBoundaryDate(op) : null;
    if (osDate == null) return true;
    if (isCop && isCtx) return true;
    if (isCop) return event.date <= osDate;
    // Ici isCop est faux ; le garde d'appartenance garantit isCtx.
    return event.date >= osDate;
  });
}
