import { addMonths, format } from 'date-fns';

export type RealizationMode = 'MOD' | 'VEFA';

export interface MilestoneDefinition {
  key: string;
  label: string;
  code?: string;
  expectedField?: string;
  actualField?: string;
  appliesTo?: RealizationMode[];
  expectedCalculated?: boolean;
  formula?: string;
  alertEligible?: boolean;
}

export interface MilestoneGroupDefinition {
  key: string;
  title: string;
  description: string;
  milestones: MilestoneDefinition[];
}

export const MILESTONE_GROUPS: MilestoneGroupDefinition[] = [
  {
    key: 'committees',
    title: 'Comités et passations',
    description: 'Décisions internes et transmission entre les équipes.',
    milestones: [
      { key: 'co_cpi', label: 'Comité opérationnel / CPI', code: 'AJ', actualField: 'co_cpi_date' },
      { key: 'cei_cef', label: 'CEI / CEF', code: 'AK', actualField: 'cei_cef_date' },
      { key: 'csi_ca', label: 'CSI / conseil d’administration', code: 'AL', actualField: 'csi_ca_date' },
      { key: 'development_handover', label: 'Passation Développement → Montage', code: 'AM', actualField: 'development_to_assembly_date' },
      { key: 'works_handover', label: 'Passation Montage → Travaux', code: 'BC', actualField: 'assembly_to_works_date' },
    ],
  },
  {
    key: 'approvals',
    title: 'Agréments',
    description: 'Dépôt du dossier et obtention des accords de financement.',
    milestones: [
      { key: 'approvals_submission', label: 'Dépôt des agréments', code: 'AN', expectedField: 'approvals_expected_date', actualField: 'approvals_submission_date', alertEligible: true },
      { key: 'lls_approval', label: 'Obtention agrément LLS', code: 'AO', actualField: 'lls_approval_date' },
      { key: 'lli_approval', label: 'Obtention agrément LLI', code: 'AP', actualField: 'lli_approval_date' },
      { key: 'anru_approval', label: 'Obtention agrément ANRU', code: 'AQ', actualField: 'anru_approval_date' },
    ],
  },
  {
    key: 'permits',
    title: 'Permis et appel d’offres',
    description: 'Autorisations administratives et consultation des entreprises.',
    milestones: [
      { key: 'permit_submission', label: 'Dépôt du permis', code: 'AR', expectedField: 'permit_expected_date', actualField: 'permit_submission_date', alertEligible: true },
      { key: 'permit_order', label: 'Arrêté du permis', code: 'AS', actualField: 'permit_order_date' },
      { key: 'tender', label: 'Appel d’offres', code: 'AT', expectedField: 'tender_expected_date', actualField: 'tender_date', alertEligible: true },
    ],
  },
  {
    key: 'land',
    title: 'Foncier, CPR et acte',
    description: 'Engagement contractuel puis acquisition ou acte VEFA.',
    milestones: [
      { key: 'cpr', label: 'Signature CPR / compromis', code: 'AU', expectedField: 'cpr_expected_date', actualField: 'vefa_cpr_or_sale_agreement_date', alertEligible: true },
      { key: 'vefa_deed', label: 'Acte VEFA / acquisition du terrain', code: 'AW', actualField: 'vefa_deed_or_land_purchase_date' },
    ],
  },
  {
    key: 'works',
    title: 'Travaux',
    description: 'Lancement contractuel du chantier.',
    milestones: [
      { key: 'works_order', label: 'Ordre de service travaux', code: 'AX / AY', expectedField: 'works_order_expected_date', actualField: 'works_order_actual_date', appliesTo: ['MOD'], alertEligible: true },
      { key: 'contractual_delivery', label: 'Livraison contractuelle', code: 'AZ', expectedField: 'contractual_delivery_date', expectedCalculated: true, formula: 'Acte ou OS réel + 24 mois, sinon OS prévisionnel + 24 mois' },
    ],
  },
  {
    key: 'delivery_preparation',
    title: 'Préparation de livraison',
    description: 'Jalons de préparation calculés depuis la date contractuelle.',
    milestones: [
      { key: 'm8', label: 'M-8', code: 'BA / BB', expectedField: 'm8_expected_date', actualField: 'm8_actual_date', expectedCalculated: true, formula: 'Livraison contractuelle − 8 mois' },
      { key: 'm7', label: 'M-7', code: 'BD / BE', expectedField: 'm7_expected_date', actualField: 'm7_actual_date', expectedCalculated: true, formula: 'Livraison contractuelle − 7 mois' },
      { key: 'm4', label: 'M-4', code: 'BF / BG', expectedField: 'm4_expected_date', actualField: 'm4_actual_date', expectedCalculated: true, formula: 'Livraison contractuelle − 4 mois' },
      { key: 'show_home', label: 'Logement témoin', code: 'BH / BI', expectedField: 'show_home_expected_date', actualField: 'show_home_actual_date', expectedCalculated: true, formula: 'Livraison contractuelle − 6 mois' },
      { key: 'opl', label: 'Opérations préalables à la livraison', code: 'BJ', actualField: 'opl_actual_date' },
    ],
  },
  {
    key: 'delivery',
    title: 'Livraison et réserves',
    description: 'Prévision révisée, livraison réelle et clôture des réserves.',
    milestones: [
      { key: 'delivery', label: 'Livraison', code: 'BL / BN', expectedField: 'expected_delivery_date', actualField: 'actual_delivery_date', alertEligible: true },
      { key: 'authorized_deadline', label: 'Date limite autorisée', code: 'BT', expectedField: 'authorized_deadline_date', expectedCalculated: true, formula: 'Livraison contractuelle + retard justifié' },
      { key: 'reservations_clearance', label: 'Levée des réserves', code: 'BW', actualField: 'reservations_clearance_date' },
      { key: 'daact', label: 'Dépôt DAACT', code: 'BX', actualField: 'daact_date' },
    ],
  },
  {
    key: 'management',
    title: 'Mise en gestion, GPA et H2',
    description: 'Entrée en gestion et échéances après livraison.',
    milestones: [
      { key: 'management', label: 'Mise en gestion', code: 'BZ / CA', expectedField: 'management_expected_date', actualField: 'management_actual_date', expectedCalculated: true, formula: 'Livraison prévisionnelle + 1 mois', alertEligible: true },
      { key: 'reservations_meeting', label: 'Réunion levée des réserves', code: 'CB', expectedField: 'm3_reservations_meeting_date', expectedCalculated: true, formula: 'Livraison réelle + 3 mois' },
      { key: 'm10', label: 'Jalon M+10', code: 'CC', expectedField: 'm10_date', expectedCalculated: true, formula: 'Livraison réelle + 10 mois' },
      { key: 'gpa_end', label: 'Fin de GPA', code: 'CD', expectedField: 'gpa_end_date', expectedCalculated: true, formula: 'Livraison réelle + 12 mois' },
      { key: 'h2', label: 'H2', code: 'CF / CG', expectedField: 'h2_deadline_date', actualField: 'h2_actual_date', expectedCalculated: true, formula: 'Livraison réelle + 3 mois' },
    ],
  },
];

function parseIsoDate(value: string | null | undefined): number | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const timestamp = Date.UTC(year, month - 1, day);
  const date = new Date(timestamp);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return timestamp;
}

export function calculateDateVariance(
  expected: string | null | undefined,
  actual: string | null | undefined,
): number | null {
  const expectedTime = parseIsoDate(expected);
  const actualTime = parseIsoDate(actual);
  if (expectedTime == null || actualTime == null) return null;
  return Math.round((actualTime - expectedTime) / 86_400_000);
}

export function visibleMilestones(mode: RealizationMode): MilestoneDefinition[] {
  return MILESTONE_GROUPS.flatMap((group) =>
    group.milestones.filter((milestone) => !milestone.appliesTo || milestone.appliesTo.includes(mode)));
}

export interface MilestoneVisibility {
  shown: boolean;
  emphasized: boolean;
}

export interface MilestoneVisibilityInput {
  mode: RealizationMode;
  terrain: boolean;
  vefaDeedOrLandPurchaseDate?: string | null;
}

/**
 * Décide si un jalon est affiché dans le planning et s'il doit être mis en
 * avant. Le mode est filtré (MOD/VEFA), puis le jalon « Acte VEFA / acquisition
 * du terrain » n'est visible que si l'opération est « avec terrain » ou si une
 * date est déjà renseignée (elle pilote le calcul de livraison) ; il n'est mis
 * en avant que lorsque la case « Terrain » est cochée.
 */
export function milestoneVisibility(
  milestone: MilestoneDefinition,
  input: MilestoneVisibilityInput,
): MilestoneVisibility {
  if (milestone.appliesTo && !milestone.appliesTo.includes(input.mode)) {
    return { shown: false, emphasized: false };
  }
  if (milestone.key === 'vefa_deed') {
    const shown = input.terrain || Boolean(input.vefaDeedOrLandPurchaseDate);
    return { shown, emphasized: input.terrain };
  }
  return { shown: true, emphasized: false };
}

export function proposedPermitOrderDate(submission: string | null): string | null {
  if (!submission) return null;
  const timestamp = parseIsoDate(submission);
  if (timestamp === null) return null;
  const [year, month, day] = submission.split('-').map(Number);
  return format(addMonths(new Date(year, month - 1, day), 4), 'yyyy-MM-dd');
}
