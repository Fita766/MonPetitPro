import type { PermissionKey } from '../types/domain';
import { EMPTY_OPERATION_FORM, type OperationFormData } from './operationPayload';

export type OperationField = keyof OperationFormData;
export type OperationFieldPermissionKey = `operations.field.${OperationField}.edit`;

export interface OperationFieldPermissionDefinition {
  field: OperationField;
  key: OperationFieldPermissionKey;
  label: string;
  description: string;
  groupKey: string;
  groupLabel: string;
}

const TEAM_FIELDS = new Set<OperationField>([
  'project_manager', 'operations_manager', 'cop_user_id', 'ctx_user_id', 'assistant_name', 'gpa_assistant_name',
  'manager_name', 'animation_provider',
]);
const PROGRAM_FIELDS = new Set<OperationField>([
  'total_housing_units', 'individual_housing_units', 'collective_housing_units',
  'plus_units', 'plai_units', 'pls_units', 'lli_units', 'lls_units', 'brs_units',
  'psla_units', 'student_units', 'specific_units', 'anru_units', 'acv_units',
  'commercial_units', 'other_units', 'thermal_regulation', 'certification',
  'clesence_bbca', 'clesence_reversible', 'clesence_land_sobriety',
  'clesence_green_space', 'zoning', 'category', 'terrain',
]);
const BUDGET_FIELDS = new Set<OperationField>(['initial_budget', 'final_budget']);
const OBJECTIVE_FIELDS = new Set<OperationField>(['is_objective', 'objective_year']);
const SYNTHESIS_FIELDS = new Set<OperationField>(['synthesis_description', 'significant_works']);
const PLANNING_FIELDS = new Set<OperationField>([
  'co_cpi_date', 'cei_cef_date', 'csi_ca_date', 'development_to_assembly_date',
  'approvals_expected_date', 'approvals_submission_date', 'lls_approval_date', 'lli_approval_date',
  'anru_approval_date', 'permit_number', 'permit_expected_date', 'permit_submission_date',
  'permit_order_date', 'tender_expected_date', 'tender_date', 'cpr_expected_date', 'vefa_cpr_or_sale_agreement_date',
  'vefa_deed_or_land_purchase_date', 'vefa_deed_expected_date', 'works_order_expected_date',
  'works_order_actual_date', 'contractual_delivery_date', 'm8_actual_date',
  'assembly_to_works_date', 'm7_actual_date', 'm4_actual_date',
  'show_home_actual_date', 'opl_actual_date', 'progress_status',
  'expected_delivery_date', 'risk_assessment', 'actual_delivery_date',
  'delivery_reservations_count', 'justified_delay_days', 'penalty_amount',
  'reservations_clearance_date', 'daact_date', 'dpe', 'management_actual_date',
  'gpa_count', 'h2_actual_date', 'so_csi_ca', 'so_lli_approval',
]);

const LABELS: Partial<Record<OperationField, string>> = {
  name: 'Nom de l’opération',
  stage: 'Stade',
  of_number: 'Numéro OF',
  gesprojet_number: 'Numéro Gesprojet',
  department: 'Département',
  commune: 'Commune',
  commune_id: 'Commune officielle',
  address: 'Adresse',
  operation_type: 'Type d’opération',
  program_nature: 'Nature du programme',
  promoter_name: 'Promoteur',
  project_manager: 'CTX / conducteur de travaux',
  operations_manager: 'COP / conducteur d’opération',
  assistant_name: 'Assistante',
  gpa_assistant_name: 'Assistante GPA',
  manager_name: 'Gestionnaire',
  animation_provider: 'Prestataire animation',
  total_housing_units: 'Nombre total de logements',
  individual_housing_units: 'Logements individuels',
  collective_housing_units: 'Logements collectifs',
  plus_units: 'Logements PLUS',
  plai_units: 'Logements PLAI',
  pls_units: 'Logements PLS',
  lli_units: 'Logements LLI',
  lls_units: 'Logements LLS',
  brs_units: 'Logements BRS',
  psla_units: 'Logements PSLA',
  thermal_regulation: 'Réglementation thermique',
  certification: 'Certification',
  zoning: 'Zonage',
  category: 'Catégorie',
  permit_number: 'Numéro de permis',
  approvals_expected_date: 'Dépôt des agréments prévisionnel',
  permit_expected_date: 'Dépôt du permis prévisionnel',
  tender_expected_date: 'Appel d’offres prévisionnel',
  cpr_expected_date: 'Signature CPR prévisionnelle',
  vefa_deed_expected_date: 'Signature de l’acte prévisionnelle',
  progress_status: 'Avancement',
  risk_assessment: 'Évaluation des risques',
  delivery_reservations_count: 'Réserves de livraison',
  justified_delay_days: 'Retard justifié',
  penalty_amount: 'Pénalités',
  dpe: 'DPE',
  gpa_count: 'Nombre de GPA',
  initial_budget: 'Budget prévisionnel',
  final_budget: 'Budget définitif',
  is_objective: 'Inscription aux objectifs',
  objective_year: 'Année d’objectif',
  synthesis_description: 'Enjeux et description',
  significant_works: 'Travaux significatifs',
};

const GROUPS = {
  identity: 'Identité et localisation',
  team: 'Équipe opération',
  program: 'Programme et performances',
  planning: 'Planning et jalons',
  budget: 'Budget',
  objectives: 'Objectifs',
  synthesis: 'Synthèse',
} as const;

function groupFor(field: OperationField): { key: keyof typeof GROUPS; label: string } {
  const key = TEAM_FIELDS.has(field) ? 'team'
    : PROGRAM_FIELDS.has(field) ? 'program'
      : PLANNING_FIELDS.has(field) ? 'planning'
        : BUDGET_FIELDS.has(field) ? 'budget'
          : OBJECTIVE_FIELDS.has(field) ? 'objectives'
            : SYNTHESIS_FIELDS.has(field) ? 'synthesis'
              : 'identity';
  return { key, label: GROUPS[key] };
}

function fallbackLabel(field: OperationField): string {
  const text = field
    .replaceAll('_', ' ')
    .replace(/\bdate\b/g, 'date')
    .replace(/\bactual\b/g, 'réelle')
    .replace(/\bexpected\b/g, 'prévisionnelle')
    .replace(/\bunits\b/g, 'logements');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function operationFieldPermission(field: OperationField): OperationFieldPermissionKey {
  return `operations.field.${field}.edit`;
}

export const OPERATION_FIELD_PERMISSION_DEFINITIONS: OperationFieldPermissionDefinition[] =
  (Object.keys(EMPTY_OPERATION_FORM) as OperationField[]).map((field) => {
    const fieldGroup = groupFor(field);
    const label = LABELS[field] ?? fallbackLabel(field);
    return {
      field,
      key: operationFieldPermission(field),
      label: `Modifier « ${label} »`,
      description: `Autorise uniquement la modification du champ « ${label} ».`,
      groupKey: `operation_fields_${fieldGroup.key}`,
      groupLabel: fieldGroup.label,
    };
  });

export function canEditOperationField(
  permissions: readonly PermissionKey[],
  field: OperationField,
  isCreating = false,
): boolean {
  if (isCreating && permissions.includes('operations.create')) return true;
  return permissions.includes(operationFieldPermission(field));
}
