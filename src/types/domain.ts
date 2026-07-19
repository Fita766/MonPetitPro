export type OperationStage = '0' | '0bis' | '1' | '1bis' | '2' | '3' | '4' | '5' | '6';

export type UserRole = 'admin' | 'responsable' | 'contributeur' | 'lecteur';

export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  initials: string | null;
  role: UserRole;
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
  address: string | null;
  project_manager: string;
  operations_manager: string | null;
  assistant_name: string | null;
  manager_name: string | null;
  operation_type: string;
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

export interface OperationSubsidy {
  id?: string;
  operation_id?: string;
  provider: string;
  purpose: string;
  amount: number | null;
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
