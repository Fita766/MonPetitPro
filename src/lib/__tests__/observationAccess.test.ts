import { describe, expect, it } from 'vitest';
import { buildObservationDraft, editableObservationFields } from '../observationAccess';

describe('observation access', () => {
  it('self assigns a standard creator (rédacteur fixe, responsible_person laissé vide)', () => {
    expect(buildObservationDraft({
      id: 'u1',
      display_name: 'Alice Martin',
      initials: 'AM',
      email: 'alice@example.fr',
    }, false)).toMatchObject({
      assignee_user_id: 'u1',
      responsible_person: '',
    });
  });

  it('keeps assignment empty for a privileged dispatcher', () => {
    expect(buildObservationDraft({ id: 'u1', display_name: 'Alice' }, true))
      .toMatchObject({ assignee_user_id: '', responsible_person: '' });
  });

  it('hides privileged fields from an assigned conductor', () => {
    const fields = editableObservationFields(['observations.create', 'observations.edit_assigned']);
    expect(fields.has('description')).toBe(true);
    expect(fields.has('resolution_date')).toBe(true);
    expect(fields.has('completion_date')).toBe(false);
    expect(fields.has('status')).toBe(false);
    expect(fields.has('is_dg')).toBe(false);
  });

  it('exposes each sensitive field only through its exact permission', () => {
    expect(editableObservationFields(['observations.set_completion']).has('completion_date')).toBe(true);
    expect(editableObservationFields(['observations.set_status']).has('status')).toBe(true);
    expect(editableObservationFields(['observations.set_dg']).has('is_dg')).toBe(true);
  });
});
