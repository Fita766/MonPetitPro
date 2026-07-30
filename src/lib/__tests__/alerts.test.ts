import { describe, expect, it } from 'vitest';
import { buildAlerts } from '../alerts';

const operation = {
  id: 'op-1',
  name: 'Clairoix',
  operation_type: 'MOD',
  approvals_expected_date: '2026-08-29',
  approvals_submission_date: null,
  permit_expected_date: '2026-08-14',
  permit_submission_date: null,
  tender_expected_date: '2026-07-29',
  tender_date: null,
  cpr_expected_date: '2026-10-01',
  vefa_cpr_or_sale_agreement_date: null,
};

describe('planning alerts', () => {
  it('classifies J-30, J-15 and overdue milestones', () => {
    const alerts = buildAlerts([operation], '2026-07-30');
    expect(alerts).toEqual(expect.arrayContaining([
      expect.objectContaining({ milestoneKey: 'approvals_submission', status: 'within30', days: 30 }),
      expect.objectContaining({ milestoneKey: 'permit_submission', status: 'within15', days: 15 }),
      expect.objectContaining({ milestoneKey: 'tender', status: 'overdue', days: -1 }),
    ]));
  });

  it('excludes completed milestones and dates outside the 30 day window', () => {
    const alerts = buildAlerts([{
      ...operation,
      approvals_submission_date: '2026-07-28',
    }], '2026-07-30');
    expect(alerts.some((alert) => alert.milestoneKey === 'approvals_submission')).toBe(false);
    expect(alerts.some((alert) => alert.milestoneKey === 'cpr')).toBe(false);
  });
});
