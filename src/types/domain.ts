export type OperationStage = '0' | '0bis' | '1' | '1bis' | '2' | '3' | '4' | '5' | '6';

export type UserRole = 'admin' | 'responsable' | 'contributeur' | 'lecteur';

export type ProfileStatus = 'pending' | 'active' | 'suspended';

export type ReferenceKind =
  | 'ctx'
  | 'cop'
  | 'assistant'
  | 'gpa_assistant'
  | 'manager'
  | 'animation_provider'
  | 'promoter'
  | 'certification'
  | 'thermal_regulation'
  | 'program_nature';

export interface ReferenceValue {
  id: string;
  kind: ReferenceKind;
  label: string;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface CommuneReference {
  id: string;
  name: string;
  insee_code: string;
  postal_code: string | null;
  department_code: string;
  department_name: string;
  region_name: string | null;
  housing_zone: string | null;
  is_active: boolean;
}

export type PermissionKey =
  | 'operations.view' | 'operations.create' | 'operations.edit_identity' | 'operations.edit_team'
  | 'operations.edit_program' | 'operations.edit_planning' | 'operations.edit_budget'
  | 'operations.edit_conditions' | 'operations.edit_objectives' | 'operations.edit_synthesis'
  | 'operations.delete' | 'operations.export'
  | 'observations.view' | 'observations.view_dg' | 'observations.create' | 'observations.edit_own'
  | 'observations.edit_all' | 'observations.validate' | 'observations.delete' | 'observations.export'
  | 'observations.view_assigned' | 'observations.view_all' | 'observations.edit_assigned'
  | 'observations.assign' | 'observations.reassign' | 'observations.set_completion'
  | 'observations.set_status' | 'observations.set_dg'
  | 'documents.view' | 'documents.upload' | 'documents.review' | 'documents.delete'
  | 'references.view' | 'references.manage'
  | 'calendar.view' | 'calendar.manage' | 'calendar.export'
  | 'objectives.view' | 'objectives.manage' | 'objectives.delete_initial' | 'objectives.export'
  | 'statistics.view' | 'statistics.export'
  | 'admin.users.view' | 'admin.users.manage' | 'admin.users.invite' | 'admin.users.suspend'
  | 'admin.roles.view' | 'admin.roles.manage' | 'admin.audit.view' | 'admin.demo_transfer'
  | `operations.field.${string}.edit`;

export interface CustomRole {
  id: string;
  name: string;
  description: string | null;
  color_key: string;
  is_active: boolean;
  is_system: boolean;
  permissions?: PermissionKey[];
  user_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  initials: string | null;
  role: UserRole;
  custom_role_id?: string | null;
  status?: ProfileStatus;
  is_owner?: boolean;
  must_change_password?: boolean;
  last_seen_at?: string | null;
  custom_role?: CustomRole | null;
  created_at?: string;
  updated_at?: string;
}

export interface Operation {
  id: string;
  name: string;
  stage: OperationStage | null;
  of_number: string | null;
  gesprojet_number: string | null;
  department: string | null;
  commune: string | null;
  commune_id?: string | null;
  address: string | null;
  project_manager: string;
  operations_manager: string | null;
  assistant_name: string | null;
  manager_name: string | null;
  operation_type: string;
  program_nature?: string | null;
  promoter_name: string | null;
  contractual_delivery_date: string | null;
  expected_delivery_date: string | null;
  actual_delivery_date: string | null;
  management_expected_date: string | null;
  management_actual_date: string | null;
  daact_date: string | null;
  initial_budget: number | null;
  final_budget: number | null;
  total_housing_units: number;
  lli_units: number;
  lls_units: number;
  plai_units: number;
  plus_units: number;
  pls_units: number;
  brs_units: number;
  psla_units: number;
  student_units: number;
  specific_units: number;
  individual_housing_units: number;
  collective_housing_units: number;
  certification: string | null;
  thermal_regulation: string | null;
  objective_year: number | null;
  is_objective: boolean;
  synthesis_description: string | null;
  significant_works: string | null;
  created_at?: string;
  user_id?: string | null;
  [key: string]: unknown;
}

export interface Observation {
  id: string;
  operation_id: string;
  info_date: string;
  description: string;
  responsible_person: string;
  deadline_date: string;
  completion_date: string | null;
  author_initials: string | null;
  resolution_date: string | null;
  resolution_validated_at: string | null;
  resolution_validated_by: string | null;
  is_dg: boolean;
  status: string | null;
  user_id?: string | null;
  assignee_user_id: string | null;
}

export type HousingProduct = 'PLUS' | 'PLAI' | 'PLS' | 'LLI' | 'BRS' | 'PSLA';
export type HousingTypology = 'T1' | 'T2' | 'T3' | 'T4' | 'Global';

export interface OperationTypology {
  id?: string;
  operation_id?: string;
  typology: HousingTypology;
  product: HousingProduct;
  units: number | null;
  average_surface: number | null;
}

export type ProgramSectionKind =
  | 'collective'
  | 'individual'
  | 'commercial'
  | 'custom';

export interface OperationProgramSection {
  id?: string;
  operation_id?: string;
  kind: ProgramSectionKind;
  label: string;
  enabled: boolean;
  sort_order: number;
}

export interface OperationProgramLine {
  id?: string;
  operation_id?: string;
  section_id: string;
  label: string;
  product: HousingProduct | null;
  units: number | null;
  average_surface: number | null;
  sort_order: number;
  source_typology_id?: string | null;
}

export type BudgetFamily = 'general' | 'LLS' | 'LLI' | 'managed';
export type RealizationMode = 'MOD' | 'VEFA';

export interface OperationBudgetLine {
  id?: string;
  operation_id?: string;
  family: BudgetFamily;
  realization_mode: RealizationMode;
  forecast_ht: number | null;
  forecast_ttc: number | null;
  forecast_equity: number | null;
  final_ht: number | null;
  final_ttc: number | null;
  final_equity: number | null;
  sort_order: number;
}

export type ObjectiveKind = 'works_order' | 'management';
export type ObjectiveCategory = 'initial' | 'supplementary';

export interface OperationObjective {
  id?: string;
  operation_id?: string;
  kind: ObjectiveKind;
  objective_year: number;
  category: ObjectiveCategory;
  snapshot_date: string | null;
  snapshot_housing_units: number | null;
  created_by?: string | null;
}

export interface OperationSignificantWork {
  id?: string;
  operation_id?: string;
  label: string;
  amount_ht: number | null;
  comment: string | null;
  sort_order: number;
}

export interface OperationSubsidy {
  id?: string;
  operation_id?: string;
  provider: string;
  purpose: string;
  amount: number | null;
  forecast_amount?: number | null;
  final_amount?: number | null;
  comment?: string | null;
}

export interface SuspensiveCondition {
  id?: string;
  operation_id?: string;
  subject: string;
  deadline_date: string | null;
  completion_date: string | null;
}

export interface OperationDocument {
  id?: string;
  operation_id?: string;
  kind: 'plan' | 'photo';
  storage_path: string;
  caption: string | null;
  sort_order: number;
}

export interface DocumentReviewItem {
  id?: string;
  operation_id?: string;
  category: string;
  label: string;
  offset_months: number | null;
  expected_date: string | null;
  received_date: string | null;
  sort_order: number;
}
