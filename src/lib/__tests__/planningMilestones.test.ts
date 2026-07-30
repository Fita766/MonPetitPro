import { describe, expect, it } from 'vitest';
import {
  MILESTONE_GROUPS,
  calculateDateVariance,
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
});
