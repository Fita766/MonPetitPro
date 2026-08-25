export interface OperationCtxSource {
  project_manager?: string | null;
}

/** CTX d'une observation avant choix : le code CTX de l'opération liée (colonne project_manager),
 *  qui appartient au référentiel CTX (reference_values kind='ctx'). */
export function resolveCtxForOperation(operation: OperationCtxSource | null | undefined): string {
  return operation?.project_manager?.trim() ?? '';
}

/** Code CTX à considérer pour une observation : l'observation prime, sinon l'opération. */
export function observationCtxValue(
  observation: { ctx?: string | null },
  operation: { project_manager?: string | null } | null | undefined,
): string {
  const value = observation.ctx ?? operation?.project_manager ?? '';
  return value.trim() || '';
}

/** Code CTX à afficher/exporter pour une observation (obs prime → repli opération). */
export function observationCtxLabel(
  observation: { ctx?: string | null },
  operation: { project_manager?: string | null } | null | undefined,
): string {
  return observationCtxValue(observation, operation);
}
