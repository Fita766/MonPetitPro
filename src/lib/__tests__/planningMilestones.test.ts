import { describe, expect, it } from 'vitest';
import {
  MILESTONE_GROUPS,
  calculateDateVariance,
  milestoneVisibility,
  proposedPermitOrderDate,
  visibleMilestones,
} from '../planningMilestones';

describe('planning milestones', () => {
  it('calculates delays in whole UTC days', () => {
    expect(calculateDateVariance('2026-05-01', '2026-05-16')).toBe(15);
    expect(calculateDateVariance('2026-05-01', '2026-04-21')).toBe(-10);
    expect(calculateDateVariance(null, '2026-04-21')).toBeNull();
    expect(calculateDateVariance('invalide', '2026-04-21')).toBeNull();
  });

  it('organizes the complete planning in eight business groups', () => {
    expect(MILESTONE_GROUPS).toHaveLength(8);
    expect(MILESTONE_GROUPS.flatMap((group) => group.milestones).length).toBeGreaterThanOrEqual(20);
  });

  it('hides manual works orders for VEFA while keeping the deed', () => {
    const vefa = visibleMilestones('VEFA');
    expect(vefa.some((milestone) => milestone.key === 'works_order')).toBe(false);
    expect(vefa.some((milestone) => milestone.key === 'vefa_deed')).toBe(true);
    expect(visibleMilestones('MOD').some((milestone) => milestone.key === 'works_order')).toBe(true);
  });

  it('propose l’arrêté 4 mois après le dépôt en préservant la fin de mois', () => {
    expect(proposedPermitOrderDate('2026-01-31')).toBe('2026-05-31');
    expect(proposedPermitOrderDate('2026-08-31')).toBe('2026-12-31');
    expect(proposedPermitOrderDate('2025-11-30')).toBe('2026-03-30');
    expect(proposedPermitOrderDate(null)).toBeNull();
    expect(proposedPermitOrderDate('2026-04-20')).toBe('2026-08-20');
    expect(proposedPermitOrderDate('2026-02-31')).toBeNull();
    expect(proposedPermitOrderDate('pas une date')).toBeNull();
  });

  it('affiche l’acte VEFA / acquisition terrain seulement avec terrain ou date renseignée', () => {
    const byKey = (key: string) => MILESTONE_GROUPS.flatMap((group) => group.milestones).find((milestone) => milestone.key === key)!;
    const vefaDeed = byKey('vefa_deed');
    const csi = byKey('csi_ca');
    const worksOrder = byKey('works_order');

    expect(milestoneVisibility(vefaDeed, { mode: 'MOD', terrain: false, vefaDeedOrLandPurchaseDate: null }))
      .toEqual({ shown: false, emphasized: false });
    expect(milestoneVisibility(vefaDeed, { mode: 'MOD', terrain: true }))
      .toEqual({ shown: true, emphasized: true });
    expect(milestoneVisibility(vefaDeed, { mode: 'MOD', terrain: false, vefaDeedOrLandPurchaseDate: '2026-04-20' }))
      .toEqual({ shown: true, emphasized: false });
    expect(milestoneVisibility(csi, { mode: 'MOD', terrain: false, vefaDeedOrLandPurchaseDate: null }))
      .toEqual({ shown: true, emphasized: false });
    expect(milestoneVisibility(worksOrder, { mode: 'VEFA', terrain: true }))
      .toEqual({ shown: false, emphasized: false });
  });
});
