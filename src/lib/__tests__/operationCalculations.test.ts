import { describe, expect, it } from 'vitest';
import {
  addMonthsSafe,
  calculateAuthorizedDeadline,
  calculateBudgetPerHousing,
  calculateDeadlineStatus,
  calculateDeliveryGapDays,
  calculateOperationSchedule,
} from '../operationCalculations';

describe('addMonthsSafe', () => {
  it('préserve une date ISO locale et borne les fins de mois', () => {
    expect(addMonthsSafe('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonthsSafe('2024-01-31', 1)).toBe('2024-02-29');
  });

  it('retourne null sans date de départ', () => {
    expect(addMonthsSafe(null, 3)).toBeNull();
  });
});

describe('calculateOperationSchedule', () => {
  it('calcule AZ depuis AW + 24 mois pour une VEFA', () => {
    const schedule = calculateOperationSchedule({
      operationType: 'VEFA',
      vefaDeedOrLandPurchaseDate: '2026-03-15',
    });

    expect(schedule.contractualDeliveryDate).toBe('2028-03-15');
  });

  it('calcule AZ depuis AY + 24 mois pour une MOD lorsque AY existe', () => {
    const schedule = calculateOperationSchedule({
      operationType: 'MOD',
      worksOrderExpectedDate: '2026-01-10',
      worksOrderActualDate: '2026-02-20',
    });

    expect(schedule.contractualDeliveryDate).toBe('2028-02-20');
  });

  it('se replie sur AX pour une MOD sans AY', () => {
    const schedule = calculateOperationSchedule({
      operationType: 'MOD',
      worksOrderExpectedDate: '2026-01-10',
    });

    expect(schedule.contractualDeliveryDate).toBe('2028-01-10');
  });

  it('calcule BA, BD, BF et BH depuis AZ', () => {
    const schedule = calculateOperationSchedule({
      operationType: 'VEFA',
      vefaDeedOrLandPurchaseDate: '2026-03-15',
    });

    expect(schedule).toMatchObject({
      m8ExpectedDate: '2027-07-15',
      m7ExpectedDate: '2027-08-15',
      m4ExpectedDate: '2027-11-15',
      showHomeExpectedDate: '2027-09-15',
    });
  });

  it('calcule BZ depuis BL et CB/CC/CD/CF depuis BN', () => {
    const schedule = calculateOperationSchedule({
      operationType: 'MOD',
      expectedDeliveryDate: '2026-06-30',
      actualDeliveryDate: '2026-08-31',
    });

    expect(schedule).toMatchObject({
      managementExpectedDate: '2026-07-30',
      m3ReservationsMeetingDate: '2026-11-30',
      m10Date: '2027-06-30',
      gpaEndDate: '2027-08-31',
      h2DeadlineDate: '2026-11-30',
    });
  });
});

describe('indicateurs de livraison', () => {
  it('calcule BP en réserves par logement', () => {
    expect(calculateBudgetPerHousing(65, 26)).toBe(2.5);
    expect(calculateBudgetPerHousing(10, 0)).toBeNull();
  });

  it('calcule BQ en jours de retard positifs ou négatifs', () => {
    expect(calculateDeliveryGapDays('2026-06-30', '2026-08-15')).toBe(46);
    expect(calculateDeliveryGapDays('2026-06-30', '2026-06-20')).toBe(-10);
  });

  it('calcule BT en ajoutant les jours justifiés à AZ', () => {
    expect(calculateAuthorizedDeadline('2026-06-30', 15)).toBe('2026-07-15');
  });

  it('calcule BU en comparant BN à BT', () => {
    expect(calculateDeadlineStatus('2026-07-16', '2026-07-15')).toBe('Retard');
    expect(calculateDeadlineStatus('2026-07-15', '2026-07-15')).toBe('Délai OK');
    expect(calculateDeadlineStatus(null, '2026-07-15')).toBeNull();
  });
});
