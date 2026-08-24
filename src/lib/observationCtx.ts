export interface OperationCtxSource {
  ctx_user_id?: string | null;
  project_manager?: string | null;
}

export interface ProfileCtxOption {
  id: string;
  label: string;
  initials?: string | null;
}

function normalized(value: string | null | undefined): string {
  return (value ?? '').trim().toLocaleLowerCase('fr').replace(/\s+/g, ' ');
}

/** Choisit le profil CTX pour une observation selon l'opération liée.
 *  1. operation.ctx_user_id si renseigné (fait autorité).
 *  2. Sinon, recherche du profil actif dont le nom affiché OU les initiales
 *     correspondent au texte historique project_manager (repli hérité). */
export function resolveCtxForOperation(
  operation: OperationCtxSource,
  profiles: readonly ProfileCtxOption[],
): string {
  if (operation.ctx_user_id) return operation.ctx_user_id;
  const target = normalized(operation.project_manager);
  if (!target) return '';
  const match = profiles.find((profile) =>
    normalized(profile.label) === target || normalized(profile.initials) === target);
  return match?.id ?? '';
}

/** Id du profil CTX à considérer pour une observation : l'observation prime, sinon l'opération. */
export function observationCtxId(
  observation: { ctx_user_id?: string | null },
  operation: { ctx_user_id?: string | null } | null | undefined,
): string {
  return observation.ctx_user_id ?? operation?.ctx_user_id ?? '';
}
