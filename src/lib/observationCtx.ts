export interface OperationCtxSource {
  project_manager?: string | null;
}

/** Responsable par défaut d'une observation : le CTX de l'opération liée
 *  (colonne project_manager), pré-rempli mais modifiable. */
export function resolveResponsableForOperation(operation: OperationCtxSource | null | undefined): string {
  return operation?.project_manager?.trim() ?? '';
}

/** Responsable à considérer pour une observation : l'observation prime, sinon l'opération. */
export function observationResponsableValue(
  observation: { responsable?: string | null },
  operation: { project_manager?: string | null } | null | undefined,
): string {
  return observation.responsable?.trim() || operation?.project_manager?.trim() || '';
}

/** Responsable à afficher/exporter pour une observation (obs prime → repli opération). */
export function observationResponsableLabel(
  observation: { responsable?: string | null },
  operation: { project_manager?: string | null } | null | undefined,
): string {
  return observationResponsableValue(observation, operation);
}
