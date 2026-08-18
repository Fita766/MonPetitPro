import { describe, expect, it } from 'vitest';
import { filterCurrentUserEvents, osBoundaryDate } from '../calendarScoping';
import type { BusinessCalendarEvent } from '../calendarEvents';

type ScopedEvent = Pick<
  BusinessCalendarEvent,
  'id' | 'operationId' | 'copUserId' | 'ctxUserId' | 'date'
>;

function event(overrides: Partial<ScopedEvent> & { id: string; date: string }): ScopedEvent {
  return {
    operationId: 'op-1',
    copUserId: null,
    ctxUserId: null,
    ...overrides,
  };
}

const opsById = {
  // OS réel le 1er juin 2026 (prévu le 1er mai).
  'op-a': { works_order_actual_date: '2026-06-01', works_order_expected_date: '2026-05-01' },
  // Aucun jalon OS renseigné.
  'op-b': {},
};

describe('osBoundaryDate', () => {
  it('privilégie la date réelle puis la prévisionnelle, sinon null', () => {
    expect(osBoundaryDate({})).toBeNull();
    expect(osBoundaryDate({ works_order_actual_date: null, works_order_expected_date: null })).toBeNull();
    expect(osBoundaryDate({ works_order_expected_date: '2026-06-01' })).toBe('2026-06-01');
    expect(osBoundaryDate({
      works_order_actual_date: '2026-09-15',
      works_order_expected_date: '2026-06-01',
    })).toBe('2026-09-15');
  });
});

describe('filterCurrentUserEvents', () => {
  it('laisse tout passer inchangé avec calendar.view_all', () => {
    const events = [
      event({ id: 'e1', date: '2026-01-01', operationId: 'op-a', copUserId: 'u1' }),
      event({ id: 'e2', date: '2026-09-01', operationId: 'op-a', ctxUserId: 'u2' }),
    ];
    expect(filterCurrentUserEvents(events, opsById, { id: 'u1', hasViewAll: true })).toEqual(events);
  });

  it('rejette les événements des opérations sans lien avec l’utilisateur', () => {
    const events = [
      event({ id: 'e-other', date: '2026-01-01', operationId: 'op-a', copUserId: 'u2' }),
      event({ id: 'e-mine', date: '2026-02-01', operationId: 'op-a', copUserId: 'u1' }),
    ];
    expect(filterCurrentUserEvents(events, opsById, { id: 'u1', hasViewAll: false })).toEqual([events[1]]);
  });

  it('COP : garde les jalons avant et à l’OS, rejette l’après', () => {
    const events = [
      event({ id: 'pre', date: '2026-05-15', operationId: 'op-a', copUserId: 'u1' }),
      event({ id: 'os', date: '2026-06-01', operationId: 'op-a', copUserId: 'u1' }),
      event({ id: 'post', date: '2026-06-20', operationId: 'op-a', copUserId: 'u1' }),
    ];
    expect(filterCurrentUserEvents(events, opsById, { id: 'u1', hasViewAll: false })).toEqual([events[0], events[1]]);
  });

  it('CTX : garde les jalons à partir de l’OS', () => {
    const events = [
      event({ id: 'pre', date: '2026-05-15', operationId: 'op-a', ctxUserId: 'u1' }),
      event({ id: 'os', date: '2026-06-01', operationId: 'op-a', ctxUserId: 'u1' }),
      event({ id: 'post', date: '2026-06-20', operationId: 'op-a', ctxUserId: 'u1' }),
    ];
    expect(filterCurrentUserEvents(events, opsById, { id: 'u1', hasViewAll: false })).toEqual([events[1], events[2]]);
  });

  it('COP et CTX sur la même opération : garde tous ses jalons', () => {
    const events = [
      event({ id: 'pre', date: '2026-05-15', operationId: 'op-a', copUserId: 'u1', ctxUserId: 'u1' }),
      event({ id: 'post', date: '2026-06-20', operationId: 'op-a', copUserId: 'u1', ctxUserId: 'u1' }),
    ];
    expect(filterCurrentUserEvents(events, opsById, { id: 'u1', hasViewAll: false })).toEqual(events);
  });

  it('sans date d’OS renseignée : garde tous ses jalons', () => {
    const events = [
      event({ id: 'e1', date: '2025-01-01', operationId: 'op-b', copUserId: 'u1' }),
      event({ id: 'e2', date: '2027-12-31', operationId: 'op-b', copUserId: 'u1' }),
    ];
    expect(filterCurrentUserEvents(events, opsById, { id: 'u1', hasViewAll: false })).toEqual(events);
  });

  it('isole chaque opération sans fuite entre elles', () => {
    const events = [
      event({ id: 'a', date: '2026-01-01', operationId: 'op-a', copUserId: 'u2' }),
      event({ id: 'b', date: '2026-02-01', operationId: 'op-b', copUserId: 'u1' }),
      event({ id: 'c', date: '2026-03-01', operationId: 'op-a', ctxUserId: 'u1' }),
      event({ id: 'd', date: '2026-03-01', operationId: 'op-a', copUserId: 'u1' }),
    ];
    expect(filterCurrentUserEvents(events, opsById, { id: 'u1', hasViewAll: false }).map((item) => item.id)).toEqual(['b', 'd']);
  });

  it('conserve l’ordre stable de la liste d’entrée', () => {
    const events = [
      event({ id: 'e2', date: '2026-09-01', operationId: 'op-b', copUserId: 'u1' }),
      event({ id: 'e1', date: '2026-01-01', operationId: 'op-b', copUserId: 'u1' }),
    ];
    expect(filterCurrentUserEvents(events, opsById, { id: 'u1', hasViewAll: false }).map((item) => item.id)).toEqual(['e2', 'e1']);
  });
});
