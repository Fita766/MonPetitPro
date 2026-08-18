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
    const alerts = buildAlerts([operation], [], '2026-07-30');
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
    }], [], '2026-07-30');
    expect(alerts.some((alert) => alert.milestoneKey === 'approvals_submission')).toBe(false);
    expect(alerts.some((alert) => alert.milestoneKey === 'cpr')).toBe(false);
  });
});

describe('PC périmé (permit_expired)', () => {
  it('alerte quand l’arrêté a plus de 3 ans sans ordre de service travaux', () => {
    const alerts = buildAlerts([{ ...operation, permit_order_date: '2022-01-15' }], [], '2026-08-18');
    expect(alerts).toEqual(expect.arrayContaining([
      expect.objectContaining({ milestoneKey: 'permit_expired', status: 'overdue', operationId: 'op-1', operationName: 'Clairoix' }),
    ]));
  });

  it('n’alerte pas dans les 3 ans suivant l’arrêté', () => {
    const alerts = buildAlerts([{ ...operation, permit_order_date: '2024-01-15' }], [], '2026-08-18');
    expect(alerts.some((alert) => alert.milestoneKey === 'permit_expired')).toBe(false);
  });

  it('n’alerte pas quand un ordre de service travaux est engagé', () => {
    const alerts = buildAlerts([
      { ...operation, permit_order_date: '2022-01-15', works_order_actual_date: '2026-03-10' },
    ], [], '2026-08-18');
    expect(alerts.some((alert) => alert.milestoneKey === 'permit_expired')).toBe(false);
  });

  it('n’alerte pas quand la date d’arrêté est absente', () => {
    const alerts = buildAlerts([operation], [], '2026-08-18');
    expect(alerts.some((alert) => alert.milestoneKey === 'permit_expired')).toBe(false);
  });

  it('n’alerte pas pour une VEFA dont l’acte est signé (l’acte remplace l’OS)', () => {
    const alerts = buildAlerts([
      { ...operation, operation_type: 'VEFA', permit_order_date: '2022-01-15', vefa_deed_or_land_purchase_date: '2025-03-20' },
    ], [], '2026-08-18');
    expect(alerts.some((alert) => alert.milestoneKey === 'permit_expired')).toBe(false);
  });

  it('alerte pour une VEFA sans acte signé avec un arrêté de plus de 3 ans', () => {
    const alerts = buildAlerts([
      { ...operation, operation_type: 'VEFA', permit_order_date: '2022-01-15', vefa_deed_or_land_purchase_date: null },
    ], [], '2026-08-18');
    expect(alerts.some((alert) => alert.milestoneKey === 'permit_expired')).toBe(true);
  });

  it('borne à 3 ans exacts : périmé seulement après la date de péremption', () => {
    // péremption le 2026-08-18 == aujourd’hui → pas périmé
    const onLapse = buildAlerts([
      { ...operation, permit_order_date: '2023-08-18' },
    ], [], '2026-08-18');
    expect(onLapse.some((alert) => alert.milestoneKey === 'permit_expired')).toBe(false);
    // péremption le 2026-08-17 → périmé depuis 1 jour
    const afterLapse = buildAlerts([
      { ...operation, permit_order_date: '2023-08-17' },
    ], [], '2026-08-18');
    expect(afterLapse.some((alert) => alert.milestoneKey === 'permit_expired')).toBe(true);
  });
});

describe('butoirs CS dépassés (condition_overdue)', () => {
  const condition = {
    id: 'c-1',
    operation_id: 'op-1',
    subject: 'Sondage pollution',
    deadline_date: '2025-09-30',
    completion_date: null,
  };

  it('alerte quand le butoir est dépassé sans réalisation', () => {
    const alerts = buildAlerts([operation], [condition], '2026-08-18');
    expect(alerts).toEqual(expect.arrayContaining([
      expect.objectContaining({
        milestoneKey: 'condition_overdue',
        status: 'overdue',
        operationId: 'op-1',
        operationName: 'Clairoix',
        label: 'Sondage pollution',
        date: '2025-09-30',
      }),
    ]));
  });

  it('n’alerte pas quand la condition est réalisée', () => {
    const alerts = buildAlerts([operation], [{ ...condition, completion_date: '2025-08-01' }], '2026-08-18');
    expect(alerts.some((alert) => alert.milestoneKey === 'condition_overdue')).toBe(false);
  });

  it('n’alerte pas quand le butoir est dans le futur', () => {
    const alerts = buildAlerts([operation], [{ ...condition, deadline_date: '2027-09-30' }], '2026-08-18');
    expect(alerts.some((alert) => alert.milestoneKey === 'condition_overdue')).toBe(false);
  });
});

describe('signature de l’acte VEFA (Item #5)', () => {
  it('alerte J-30 quand la date prévisionnelle est dans 20 jours', () => {
    const alerts = buildAlerts([{
      ...operation,
      operation_type: 'VEFA',
      vefa_deed_expected_date: '2026-08-19',
      vefa_deed_or_land_purchase_date: null,
    }], [], '2026-07-30');
    expect(alerts).toEqual(expect.arrayContaining([
      expect.objectContaining({ milestoneKey: 'vefa_deed', status: 'within30', days: 20 }),
    ]));
  });

  it('alerte J-15 quand la date prévisionnelle est dans 10 jours', () => {
    const alerts = buildAlerts([{
      ...operation,
      operation_type: 'VEFA',
      vefa_deed_expected_date: '2026-08-09',
      vefa_deed_or_land_purchase_date: null,
    }], [], '2026-07-30');
    expect(alerts).toEqual(expect.arrayContaining([
      expect.objectContaining({ milestoneKey: 'vefa_deed', status: 'within15', days: 10 }),
    ]));
  });

  it('alerte dépassement tant que l’acte n’est pas signé', () => {
    const alerts = buildAlerts([{
      ...operation,
      operation_type: 'VEFA',
      vefa_deed_expected_date: '2026-07-29',
      vefa_deed_or_land_purchase_date: null,
    }], [], '2026-07-30');
    expect(alerts).toEqual(expect.arrayContaining([
      expect.objectContaining({ milestoneKey: 'vefa_deed', status: 'overdue', days: -1 }),
    ]));
  });

  it('n’alerte plus une fois l’acte signé', () => {
    const alerts = buildAlerts([{
      ...operation,
      operation_type: 'VEFA',
      vefa_deed_expected_date: '2026-08-19',
      vefa_deed_or_land_purchase_date: '2026-06-10',
    }], [], '2026-07-30');
    expect(alerts.some((alert) => alert.milestoneKey === 'vefa_deed')).toBe(false);
  });

  it('reste silencieuse hors fenêtre des 30 jours', () => {
    const alerts = buildAlerts([{
      ...operation,
      operation_type: 'VEFA',
      vefa_deed_expected_date: '2026-09-15',
      vefa_deed_or_land_purchase_date: null,
    }], [], '2026-07-30');
    expect(alerts.some((alert) => alert.milestoneKey === 'vefa_deed')).toBe(false);
  });
});
