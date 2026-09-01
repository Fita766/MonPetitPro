export interface OperationCtxSource {
  project_manager?: string | null;
}

export interface ObservationAuthor {
  user_id?: string | null;
  author_initials?: string | null;
  responsible_person?: string | null;
}

/** Responsable par défaut d'une observation : le CTX de l'opération liée
 *  (colonne project_manager), pré-rempli mais modifiable. */
export function resolveResponsableForOperation(operation: OperationCtxSource | null | undefined): string {
  return operation?.project_manager?.trim() ?? '';
}

/** Responsable à considérer pour une observation : le champ `responsable` prime,
 *  puis l'ancien champ `responsible_person` (hérité des observations historiques,
 *  qui désignait celui qui devait faire la tâche), puis le CTX de l'opération. */
export function observationResponsableValue(
  observation: { responsable?: string | null; responsible_person?: string | null },
  operation: { project_manager?: string | null } | null | undefined,
): string {
  return observation.responsable?.trim()
    || observation.responsible_person?.trim()
    || operation?.project_manager?.trim()
    || '';
}

/** Responsable à afficher/exporter pour une observation (obs prime → repli opération). */
export function observationResponsableLabel(
  observation: { responsable?: string | null; responsible_person?: string | null },
  operation: { project_manager?: string | null } | null | undefined,
): string {
  return observationResponsableValue(observation, operation);
}

/** Rédacteur (auteur) d'une observation : la personne qui l'a rédigée, jamais modifiable.
 *  Résout le nom via le profil (user_id), en repli sur les initiales d'auteur historiques. */
export function observationAuthorLabel(
  observation: ObservationAuthor,
  profileById: ReadonlyMap<string, string>,
): string {
  if (observation.user_id) {
    const label = profileById.get(observation.user_id);
    if (label) return label;
  }
  return observation.author_initials?.trim() || '—';
}
