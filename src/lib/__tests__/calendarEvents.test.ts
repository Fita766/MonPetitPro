import { describe, expect, it } from 'vitest';
import { buildCalendarEvents } from '../calendarEvents';

const baseOperation = {
  id: 'op-1', name: 'Clairoix', project_manager: 'CTX-A', operations_manager: 'COP-A', department: '60', promoter_name: 'Promoteur A',
  contractual_delivery_date: '2026-06-30', expected_delivery_date: '2026-07-31', actual_delivery_date: null,
  management_expected_date: '2026-08-31', management_actual_date: null,
  m8_expected_date: '2025-10-30', m8_actual_date: '2025-11-02', authorized_deadline_date: '2026-07-15',
  approvals_expected_date: '2025-04-01', approvals_submission_date: '2025-04-03',
};

describe('buildCalendarEvents', () => {
  it('transforme les conditions suspensives en événements par opération', () => {
    const events = buildCalendarEvents([baseOperation], [{ id: 'c-1', operation_id: 'op-1', subject: 'Sondage pollution', deadline_date: '2025-09-30', completion_date: null }], 'conditions');
    expect(events).toEqual([expect.objectContaining({ id: 'condition-c-1', date: '2025-09-30', title: 'Sondage pollution', actual: false, operationName: 'Clairoix' })]);
  });

  it('privilégie livraison réelle puis révisée puis contractuelle', () => {
    expect(buildCalendarEvents([{ ...baseOperation, actual_delivery_date: '2026-08-05' }], [], 'deliveries')[0]).toMatchObject({ date: '2026-08-05', actual: true, code: 'BN' });
    expect(buildCalendarEvents([baseOperation], [], 'deliveries')[0]).toMatchObject({ date: '2026-07-31', actual: false, code: 'BL' });
    expect(buildCalendarEvents([{ ...baseOperation, expected_delivery_date: null }], [], 'deliveries')[0]).toMatchObject({ date: '2026-06-30', actual: false, code: 'AZ' });
  });

  it('privilégie la MEG réelle sur la MEG prévisionnelle', () => {
    expect(buildCalendarEvents([{ ...baseOperation, management_actual_date: '2026-09-03' }], [], 'management')[0]).toMatchObject({ date: '2026-09-03', actual: true, code: 'CA' });
    expect(buildCalendarEvents([baseOperation], [], 'management')[0]).toMatchObject({ date: '2026-08-31', actual: false, code: 'BZ' });
  });

  it('génère les jalons BA à CG renseignés', () => {
    const events = buildCalendarEvents([baseOperation], [], 'key-dates');
    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'BA', date: '2025-10-30', actual: false }),
      expect.objectContaining({ code: 'BB', date: '2025-11-02', actual: true }),
      expect.objectContaining({ code: 'BT', date: '2026-07-15' }),
    ]));
  });

  it('inclut les jalons programme antérieurs à BA', () => {
    const events = buildCalendarEvents([baseOperation], [], 'program');
    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'AN', date: '2025-04-01', actual: false }),
      expect.objectContaining({ code: 'AN', date: '2025-04-03', actual: true }),
    ]));
  });
});
