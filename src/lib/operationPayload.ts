import type { OperationStage } from '../types/domain';
import { calculateBudgetPerHousing, calculateOperationSchedule } from './operationCalculations';

export interface OperationFormData {
  name: string;
  stage: OperationStage | '';
  of_number: string;
  gesprojet_number: string;
  department: string;
  commune: string;
  commune_id: string;
  address: string;
  project_manager: string;
  operations_manager: string;
  assistant_name: string;
  gpa_assistant_name: string;
  manager_name: string;
  animation_provider: string;
  operation_type: string;
  program_nature: string;
  promoter_name: string;
  total_housing_units: string;
  individual_housing_units: string;
  collective_housing_units: string;
  plus_units: string;
  plai_units: string;
  pls_units: string;
  lli_units: string;
  lls_units: string;
  brs_units: string;
  psla_units: string;
  student_units: string;
  specific_units: string;
  anru_units: string;
  acv_units: string;
  commercial_units: string;
  other_units: string;
  thermal_regulation: string;
  certification: string;
  clesence_bbca: boolean;
  clesence_reversible: boolean;
  clesence_land_sobriety: boolean;
  clesence_green_space: boolean;
  zoning: string;
  category: string;
  co_cpi_date: string;
  cei_cef_date: string;
  csi_ca_date: string;
  development_to_assembly_date: string;
  approvals_expected_date: string;
  approvals_submission_date: string;
  lls_approval_date: string;
  lli_approval_date: string;
  anru_approval_date: string;
  permit_number: string;
  permit_expected_date: string;
  permit_submission_date: string;
  permit_order_date: string;
  tender_expected_date: string;
  tender_date: string;
  cpr_expected_date: string;
  vefa_cpr_or_sale_agreement_date: string;
  vefa_deed_or_land_purchase_date: string;
  works_order_expected_date: string;
  works_order_actual_date: string;
  contractual_delivery_date: string;
  m8_actual_date: string;
  assembly_to_works_date: string;
  m7_actual_date: string;
  m4_actual_date: string;
  show_home_actual_date: string;
  opl_actual_date: string;
  progress_status: string;
  expected_delivery_date: string;
  risk_assessment: string;
  actual_delivery_date: string;
  delivery_reservations_count: string;
  justified_delay_days: string;
  penalty_amount: string;
  reservations_clearance_date: string;
  daact_date: string;
  dpe: string;
  management_actual_date: string;
  gpa_count: string;
  h2_actual_date: string;
  initial_budget: string;
  final_budget: string;
  is_objective: boolean;
  objective_year: string;
  synthesis_description: string;
  significant_works: string;
}

export const EMPTY_OPERATION_FORM: OperationFormData = {
  name: '', stage: '', of_number: '', gesprojet_number: '', department: '', commune: '', commune_id: '', address: '',
  project_manager: '', operations_manager: '', assistant_name: '', gpa_assistant_name: '', manager_name: '', animation_provider: '',
  operation_type: 'MOD', program_nature: '', promoter_name: '', total_housing_units: '0', individual_housing_units: '0', collective_housing_units: '0',
  plus_units: '0', plai_units: '0', pls_units: '0', lli_units: '0', lls_units: '0', brs_units: '0', psla_units: '0', student_units: '0', specific_units: '0',
  anru_units: '0', acv_units: '0', commercial_units: '0', other_units: '0', thermal_regulation: '', certification: '',
  clesence_bbca: false, clesence_reversible: false, clesence_land_sobriety: false, clesence_green_space: false, zoning: '', category: '',
  co_cpi_date: '', cei_cef_date: '', csi_ca_date: '', development_to_assembly_date: '', approvals_expected_date: '', approvals_submission_date: '', lls_approval_date: '',
  lli_approval_date: '', anru_approval_date: '', permit_number: '', permit_expected_date: '', permit_submission_date: '', permit_order_date: '', tender_expected_date: '', tender_date: '', cpr_expected_date: '',
  vefa_cpr_or_sale_agreement_date: '', vefa_deed_or_land_purchase_date: '', works_order_expected_date: '', works_order_actual_date: '',
  contractual_delivery_date: '', m8_actual_date: '', assembly_to_works_date: '', m7_actual_date: '', m4_actual_date: '',
  show_home_actual_date: '', opl_actual_date: '', progress_status: '', expected_delivery_date: '', risk_assessment: '', actual_delivery_date: '',
  delivery_reservations_count: '', justified_delay_days: '', penalty_amount: '', reservations_clearance_date: '', daact_date: '', dpe: '',
  management_actual_date: '', gpa_count: '', h2_actual_date: '', initial_budget: '', final_budget: '', is_objective: false, objective_year: '',
  synthesis_description: '', significant_works: '',
};

const INTEGER_FIELDS = [
  'total_housing_units', 'individual_housing_units', 'collective_housing_units', 'plus_units', 'plai_units', 'pls_units',
  'lli_units', 'lls_units', 'brs_units', 'psla_units', 'student_units', 'specific_units', 'anru_units', 'acv_units',
  'commercial_units', 'other_units', 'delivery_reservations_count', 'justified_delay_days', 'gpa_count', 'objective_year',
] as const;

const DECIMAL_FIELDS = ['initial_budget', 'final_budget', 'penalty_amount'] as const;

const DATE_FIELDS = [
  'co_cpi_date', 'cei_cef_date', 'csi_ca_date', 'development_to_assembly_date', 'approvals_expected_date', 'approvals_submission_date',
  'lls_approval_date', 'lli_approval_date', 'anru_approval_date', 'permit_expected_date', 'permit_submission_date', 'permit_order_date', 'tender_expected_date', 'tender_date', 'cpr_expected_date',
  'vefa_cpr_or_sale_agreement_date', 'vefa_deed_or_land_purchase_date', 'works_order_expected_date', 'works_order_actual_date',
  'contractual_delivery_date', 'm8_actual_date', 'assembly_to_works_date', 'm7_actual_date', 'm4_actual_date',
  'show_home_actual_date', 'opl_actual_date', 'expected_delivery_date', 'actual_delivery_date', 'reservations_clearance_date',
  'daact_date', 'management_actual_date', 'h2_actual_date',
] as const;

type OperationPayload = Record<string, string | number | boolean | null | undefined>;

function integerOrNull(value: string): number | null {
  if (value.trim() === '') return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function decimalOrNull(value: string): number | null {
  if (value.trim() === '') return null;
  const parsed = Number.parseFloat(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

export function toOperationPayload(form: OperationFormData, userId?: string): OperationPayload {
  if (form.operation_type !== 'MOD' && form.operation_type !== 'VEFA') {
    throw new Error('Le mode de réalisation doit être MOD ou VEFA.');
  }
  const payload: OperationPayload = { ...form, user_id: userId };

  for (const key of INTEGER_FIELDS) payload[key] = integerOrNull(form[key]);
  for (const key of DECIMAL_FIELDS) payload[key] = decimalOrNull(form[key]);
  for (const key of DATE_FIELDS) payload[key] = form[key] || null;
  payload.stage = form.stage || null;
  payload.promoter_name = form.promoter_name || null;
  payload.commune_id = form.commune_id || null;
  payload.program_nature = form.program_nature || null;
  payload.objective_year = form.is_objective ? integerOrNull(form.objective_year) : null;

  if (form.operation_type.toUpperCase() === 'VEFA') {
    payload.works_order_expected_date = null;
    payload.works_order_actual_date = null;
  }

  const justifiedDelayDays = integerOrNull(form.justified_delay_days);
  const schedule = calculateOperationSchedule({
    operationType: form.operation_type,
    vefaDeedOrLandPurchaseDate: form.vefa_deed_or_land_purchase_date,
    worksOrderExpectedDate: form.operation_type.toUpperCase() === 'VEFA' ? null : form.works_order_expected_date,
    worksOrderActualDate: form.operation_type.toUpperCase() === 'VEFA' ? null : form.works_order_actual_date,
    contractualDeliveryDate: form.contractual_delivery_date,
    expectedDeliveryDate: form.expected_delivery_date,
    actualDeliveryDate: form.actual_delivery_date,
    justifiedDelayDays,
  });

  payload.contractual_delivery_date = schedule.contractualDeliveryDate;
  payload.m8_expected_date = schedule.m8ExpectedDate;
  payload.m7_expected_date = schedule.m7ExpectedDate;
  payload.m4_expected_date = schedule.m4ExpectedDate;
  payload.show_home_expected_date = schedule.showHomeExpectedDate;
  payload.management_expected_date = schedule.managementExpectedDate;
  payload.m3_reservations_meeting_date = schedule.m3ReservationsMeetingDate;
  payload.m10_date = schedule.m10Date;
  payload.gpa_end_date = schedule.gpaEndDate;
  payload.h2_deadline_date = schedule.h2DeadlineDate;
  payload.delivery_delay_days = schedule.deliveryGapDays;
  payload.effective_delay_days = schedule.effectiveDelayDays;
  payload.authorized_deadline_date = schedule.authorizedDeadlineDate;
  payload.deadline_status = schedule.deadlineStatus;
  payload.reservations_per_housing = calculateBudgetPerHousing(
    integerOrNull(form.delivery_reservations_count),
    integerOrNull(form.total_housing_units),
  );

  return payload;
}

export function fromOperationRow(row: Record<string, unknown>): OperationFormData {
  const form = { ...EMPTY_OPERATION_FORM };
  for (const key of Object.keys(form) as (keyof OperationFormData)[]) {
    const value = row[key];
    if (typeof form[key] === 'boolean') {
      (form as Record<string, unknown>)[key] = value === true;
    } else {
      (form as Record<string, unknown>)[key] = value == null ? '' : String(value);
    }
  }
  return form;
}
