import type { PermissionKey, Profile } from '../types/domain';
import { EMPTY_OBSERVATION_FORM, type ObservationFormData } from './observationStatus';

export function buildObservationDraft(
  profile: Pick<Profile, 'id'> & Partial<Pick<Profile, 'display_name' | 'initials' | 'email'>>,
  canAssign: boolean,
  operationId = '',
): ObservationFormData {
  const draft = EMPTY_OBSERVATION_FORM(operationId);
  // Le rédacteur est fixe : c'est toujours l'auteur (user_id + author_initials à la
  // création). On ne renseigne plus responsible_person (l'ancien champ « personne
  // responsable ») pour ne pas confondre avec le responsable de la tâche.
  if (!canAssign) draft.assignee_user_id = profile.id;
  return draft;
}

export function editableObservationFields(
  permissions: readonly PermissionKey[],
): Set<keyof ObservationFormData> {
  const result = new Set<keyof ObservationFormData>();
  const canEditContent = permissions.some((key) =>
    ['observations.create', 'observations.edit_assigned', 'observations.edit_all'].includes(key));
  if (canEditContent) {
    for (const key of ['operation_id', 'info_date', 'description', 'deadline_date', 'resolution_date', 'responsable'] as const) {
      result.add(key);
    }
  }
  if (permissions.includes('observations.assign') || permissions.includes('observations.reassign')) {
    result.add('assignee_user_id');
    result.add('responsible_person');
  }
  if (permissions.includes('observations.set_completion')) result.add('completion_date');
  if (permissions.includes('observations.set_status')) result.add('status');
  if (permissions.includes('observations.set_dg')) result.add('is_dg');
  return result;
}
