import type { OperationFilters } from './operationFilters';
export type { OperationFilters };

/**
 * Agrégats KPI de l'écran d'accueil (amende A7).
 *
 * Choix `housingUnits` : le dashboard charge les opérations via
 * `supabase.from("operations").select(...)`, qui expose directement
 * `total_housing_units` (le total logements de l'opération, déjà affiché dans
 * le tableau et utilisé par la page Statistiques). Les lignes de programme
 * (sections/lignes) permettant de RECALCULER un total programme ne sont pas
 * chargées par cet écran : on somme donc `total_housing_units` plutôt que de
 * re-dériver un total programme.
 */
export interface KpiOperation {
  total_housing_units?: number | null;
  final_budget?: number | null;
}

export interface DashboardKpis {
  operations: number;
  housingUnits: number | null;
  finalBudget: number | null;
  activeAlerts: number;
}

/**
 * Vrai pour toute valeur finie (y compris négative) : le nom ne promet pas une
 * positivité, il garantit seulement que `value` est un nombre fini.
 */
const isFiniteNumber = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export function buildKpis(
  operations: readonly KpiOperation[],
  alerts: readonly unknown[],
): DashboardKpis {
  let housingUnits = 0;
  let hasHousingUnits = false;
  let finalBudget = 0;
  let hasFinalBudget = false;

  for (const operation of operations) {
    if (isFiniteNumber(operation.total_housing_units)) {
      housingUnits += operation.total_housing_units;
      hasHousingUnits = true;
    }
    if (isFiniteNumber(operation.final_budget)) {
      finalBudget += operation.final_budget;
      hasFinalBudget = true;
    }
  }

  return {
    operations: operations.length,
    housingUnits: hasHousingUnits ? housingUnits : null,
    finalBudget: hasFinalBudget ? finalBudget : null,
    activeAlerts: alerts.length,
  };
}

/** Compte les dimensions de filtre actives (sélections non vides hors défaut). */
export function countActiveFilters(filters: OperationFilters): number {
  return [
    filters.stages,
    filters.departments,
    filters.communes,
    filters.cops,
    filters.ctxs,
    filters.promoters,
    filters.operationTypes,
    filters.labels,
  ].filter((selection) => selection.length > 0).length
    + (filters.deliveryFrom ? 1 : 0)
    + (filters.deliveryTo ? 1 : 0)
    + (filters.query.trim() ? 1 : 0);
}
