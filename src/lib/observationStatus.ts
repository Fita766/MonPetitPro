export type ObservationExplicitStatus = 'En cours' | 'Réussi' | 'Échec' | 'Bloqué';
export type ObservationDisplayStatus = ObservationExplicitStatus | 'En retard' | 'Terminé';

export interface ObservationRow {
  id: string;
  operation_id: string;
  info_date: string;
  description: string;
  responsible_person: string;
  deadline_date: string;
  completion_date: string | null;
  status?: string | null;
  author_initials?: string | null;
  resolution_date?: string | null;
  resolution_validated_at?: string | null;
  resolution_validated_by?: string | null;
  is_dg?: boolean | null;
  user_id?: string | null;
}

export interface ObservationFormData {
  operation_id: string;
  info_date: string;
  description: string;
  responsible_person: string;
  deadline_date: string;
  completion_date: string;
  resolution_date: string;
  status: ObservationExplicitStatus;
  is_dg: boolean;
}

const LEGACY_STATUS = /\n\n\[STATUT:\s*(.*?)\]\s*$/;
const EXPLICIT_STATUSES: ObservationExplicitStatus[] = ['En cours', 'Réussi', 'Échec', 'Bloqué'];

function asExplicitStatus(value: string | null | undefined): ObservationExplicitStatus | null {
  return EXPLICIT_STATUSES.includes(value as ObservationExplicitStatus) ? value as ObservationExplicitStatus : null;
}

export function normalizeObservation<T extends ObservationRow>(row: T): Omit<T, 'status' | 'is_dg' | 'description'> & { description: string; status: ObservationExplicitStatus; is_dg: boolean } {
  const legacyMatch = row.description?.match(LEGACY_STATUS);
  const status = asExplicitStatus(row.status) ?? asExplicitStatus(legacyMatch?.[1]) ?? 'En cours';
  return {
    ...row,
    description: legacyMatch ? row.description.replace(LEGACY_STATUS, '') : row.description,
    status,
    is_dg: row.is_dg === true,
  };
}

export function getObservationStatus(
  observation: Pick<ObservationRow, 'status' | 'deadline_date' | 'completion_date'>,
  today = new Date().toISOString().slice(0, 10),
): ObservationDisplayStatus {
  const explicit = asExplicitStatus(observation.status);
  if (explicit && explicit !== 'En cours') return explicit;
  if (observation.completion_date) return 'Terminé';
  if (observation.deadline_date && observation.deadline_date < today) return 'En retard';
  return 'En cours';
}

export function buildObservationPayload(
  form: ObservationFormData,
  author: { userId: string; initials: string },
) {
  return {
    operation_id: form.operation_id,
    user_id: author.userId,
    author_initials: author.initials,
    info_date: form.info_date,
    description: form.description.trim(),
    responsible_person: form.responsible_person.trim(),
    deadline_date: form.deadline_date,
    completion_date: form.completion_date || null,
    resolution_date: form.resolution_date || null,
    status: form.status,
    is_dg: form.is_dg,
  };
}

export function buildResolutionValidationPayload(userId: string, validatedAt = new Date().toISOString()) {
  return {
    resolution_validated_by: userId,
    resolution_validated_at: validatedAt,
  };
}

export const EMPTY_OBSERVATION_FORM = (operationId = ''): ObservationFormData => ({
  operation_id: operationId,
  info_date: new Date().toISOString().slice(0, 10),
  description: '',
  responsible_person: '',
  deadline_date: '',
  completion_date: '',
  resolution_date: '',
  status: 'En cours',
  is_dg: false,
});
