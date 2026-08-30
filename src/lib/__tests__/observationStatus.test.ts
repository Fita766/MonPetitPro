import { describe, expect, it } from 'vitest';
import { buildObservationPayload, buildResolutionValidationPayload, getObservationStatus, normalizeObservation } from '../observationStatus';

describe('normalizeObservation', () => {
  it('lit et retire un ancien marqueur de statut dans la description', () => {
    const normalized = normalizeObservation({
      id: 'obs-1', operation_id: 'op-1', info_date: '2026-01-01', description: 'Point à traiter\n\n[STATUT: Bloqué]',
      responsible_person: 'CTX', deadline_date: '2026-02-01', completion_date: null, status: null,
    });
    expect(normalized.description).toBe('Point à traiter');
    expect(normalized.status).toBe('Bloqué');
  });

  it('privilégie le champ de statut dédié', () => {
    const normalized = normalizeObservation({
      id: 'obs-1', operation_id: 'op-1', info_date: '2026-01-01', description: 'Point\n\n[STATUT: Bloqué]',
      responsible_person: 'CTX', deadline_date: '2026-02-01', completion_date: null, status: 'Réussi',
    });
    expect(normalized.status).toBe('Réussi');
  });
});

describe('getObservationStatus', () => {
  it('calcule le retard uniquement pour un point encore ouvert', () => {
    expect(getObservationStatus({ status: 'En cours', deadline_date: '2026-01-10', completion_date: null }, '2026-01-11')).toBe('En retard');
    expect(getObservationStatus({ status: 'En cours', deadline_date: '2026-01-10', completion_date: '2026-01-09' }, '2026-01-11')).toBe('Terminé');
  });

  it('conserve les statuts explicites', () => {
    expect(getObservationStatus({ status: 'Bloqué', deadline_date: '2026-01-10', completion_date: null }, '2026-01-11')).toBe('Bloqué');
  });
});

describe('buildObservationPayload', () => {
  it('ajoute automatiquement auteur, initiales et marqueur DG', () => {
    expect(buildObservationPayload({
      operation_id: 'op-1', info_date: '2026-01-01', description: 'Point', responsible_person: 'CTX', deadline_date: '2026-02-01',
      assignee_user_id: 'user-2', responsable: '', completion_date: '', resolution_date: '2026-01-20', status: 'En cours', is_dg: true,
    }, { userId: 'user-1', initials: 'AB' })).toMatchObject({
      user_id: 'user-1', assignee_user_id: 'user-2', author_initials: 'AB', is_dg: true, completion_date: null, resolution_date: '2026-01-20', status: 'En cours',
    });
  });

  it('sérialise responsable dans le payload (null si vide)', () => {
    const payload = buildObservationPayload({
      operation_id: 'op-1', info_date: '2026-01-01', description: 'Point', responsible_person: 'CTX', deadline_date: '2026-02-01',
      assignee_user_id: 'user-2', completion_date: '', resolution_date: '', status: 'En cours', is_dg: false, responsable: 'EB',
    }, { userId: 'user-1', initials: 'AB' });
    expect(payload.responsable).toBe('EB');

    const emptyPayload = buildObservationPayload({
      operation_id: 'op-1', info_date: '2026-01-01', description: 'Point', responsible_person: 'CTX', deadline_date: '2026-02-01',
      assignee_user_id: '', completion_date: '', resolution_date: '', status: 'En cours', is_dg: false, responsable: '',
    }, { userId: 'user-1', initials: 'AB' });
    expect(emptyPayload.responsable).toBeNull();
  });
});

describe('buildResolutionValidationPayload', () => {
  it('enregistre le responsable et la date de validation', () => {
    expect(buildResolutionValidationPayload('user-1', '2026-04-05T10:00:00.000Z')).toEqual({
      resolution_validated_by: 'user-1', resolution_validated_at: '2026-04-05T10:00:00.000Z',
    });
  });
});
