import { describe, expect, it } from 'vitest';
import { EMPTY_OPERATION_FORM, fromOperationRow, toOperationPayload } from '../operationPayload';

describe('toOperationPayload', () => {
  it('convertit les nombres et les dates vides sans altérer les noms historiques', () => {
    const payload = toOperationPayload({
      ...EMPTY_OPERATION_FORM,
      name: 'Clairoix',
      project_manager: 'EB',
      operation_type: 'MOD',
      total_housing_units: '31',
      initial_budget: '5236289.48',
      actual_delivery_date: '',
    }, 'user-1');

    expect(payload).toMatchObject({
      name: 'Clairoix',
      project_manager: 'EB',
      total_housing_units: 31,
      initial_budget: 5236289.48,
      actual_delivery_date: null,
      user_id: 'user-1',
    });
  });

  it('neutralise AX et AY pour une VEFA et calcule AZ depuis AW', () => {
    const payload = toOperationPayload({
      ...EMPTY_OPERATION_FORM,
      operation_type: 'VEFA',
      vefa_deed_or_land_purchase_date: '2026-04-20',
      works_order_expected_date: '2026-05-01',
      works_order_actual_date: '2026-05-20',
    }, 'user-1');

    expect(payload.works_order_expected_date).toBeNull();
    expect(payload.works_order_actual_date).toBeNull();
    expect(payload.contractual_delivery_date).toBe('2028-04-20');
  });

  it('calcule les jalons dérivés et conserve les dates réelles saisies', () => {
    const payload = toOperationPayload({
      ...EMPTY_OPERATION_FORM,
      operation_type: 'MOD',
      works_order_actual_date: '2026-02-20',
      expected_delivery_date: '2028-03-01',
      actual_delivery_date: '2028-03-10',
      justified_delay_days: '4',
    }, 'user-1');

    expect(payload).toMatchObject({
      contractual_delivery_date: '2028-02-20',
      m8_expected_date: '2027-06-20',
      management_expected_date: '2028-04-01',
      delivery_delay_days: 19,
      authorized_deadline_date: '2028-02-24',
    });
  });

  it('sépare le mode de réalisation de la nature et conserve la commune officielle', () => {
    const payload = toOperationPayload({
      ...EMPTY_OPERATION_FORM,
      operation_type: 'VEFA',
      program_nature: 'Résidence intergénérationnelle',
      commune_id: '11111111-1111-1111-1111-111111111111',
      commune: 'CLAIROIX',
      department: '60',
      zoning: 'B1',
    });

    expect(payload).toMatchObject({
      operation_type: 'VEFA',
      program_nature: 'Résidence intergénérationnelle',
      commune_id: '11111111-1111-1111-1111-111111111111',
      commune: 'CLAIROIX',
      department: '60',
      zoning: 'B1',
    });
  });

  it('refuse une ancienne nature utilisée à la place du mode MOD ou VEFA', () => {
    expect(() => toOperationPayload({
      ...EMPTY_OPERATION_FORM,
      operation_type: 'Réhabilitation',
    })).toThrow(/mode de réalisation/i);
  });
});

describe('fromOperationRow', () => {
  it('rend les null compatibles avec les champs contrôlés du formulaire', () => {
    const form = fromOperationRow({
      name: 'Ancienne opération',
      project_manager: 'CTX',
      operation_type: 'MOD',
      promoter_name: null,
      total_housing_units: 20,
      is_objective: null,
    });

    expect(form.name).toBe('Ancienne opération');
    expect(form.promoter_name).toBe('');
    expect(form.total_housing_units).toBe('20');
    expect(form.is_objective).toBe(false);
  });
});

describe('drapeaux SO et terrain', () => {
  it('sérialise so_csi_ca, so_lli_approval et terrain dans le payload', () => {
    const payload = toOperationPayload({
      ...EMPTY_OPERATION_FORM,
      operation_type: 'MOD',
      so_csi_ca: true,
      so_lli_approval: true,
      terrain: true,
    });
    expect(payload).toMatchObject({ so_csi_ca: true, so_lli_approval: true, terrain: true });
  });

  it('relit les drapeaux depuis une ligne de base', () => {
    const form = fromOperationRow({ so_csi_ca: true, so_lli_approval: false, terrain: true });
    expect(form.so_csi_ca).toBe(true);
    expect(form.so_lli_approval).toBe(false);
    expect(form.terrain).toBe(true);
  });
});
