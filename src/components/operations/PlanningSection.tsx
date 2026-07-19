import { Calculator, LockKeyhole } from 'lucide-react';
import { calculateOperationSchedule } from '../../lib/operationCalculations';
import { FieldLabel, SectionHeading, TextInput } from './FormControls';
import type { OperationSectionProps } from './formTypes';

const dateFields = [
  ['co_cpi_date', 'Date CO / CPI'], ['cei_cef_date', 'Date CEI / CEF'], ['csi_ca_date', 'Date CSI / CA'],
  ['development_to_assembly_date', 'Passation Dév. → Montage'], ['approvals_submission_date', 'Dépôt des agréments'],
  ['lls_approval_date', 'Obtention agrément LLS'], ['lli_approval_date', 'Obtention agrément LLI'], ['anru_approval_date', 'Obtention agrément ANRU'],
  ['permit_submission_date', 'Dépôt PC'], ['permit_order_date', 'Arrêté PC'], ['tender_date', 'Date AO'],
  ['vefa_cpr_or_sale_agreement_date', 'Signature CPR / compromis'], ['vefa_deed_or_land_purchase_date', 'Acte VEFA / acquisition terrain (AW)'],
  ['works_order_expected_date', 'OS travaux prévisionnel (AX)'], ['works_order_actual_date', 'OS travaux réel (AY)'],
  ['m8_actual_date', 'M-8 réalisé (BB)'], ['assembly_to_works_date', 'Passation Montage → Travaux (BC)'],
  ['m7_actual_date', 'M-7 réalisé (BE)'], ['m4_actual_date', 'M-4 réalisé (BG)'],
  ['show_home_actual_date', 'Logement témoin réel (BI)'], ['opl_actual_date', 'OPL réelle (BJ)'],
  ['expected_delivery_date', 'Livraison prévisionnelle révisée (BL)'], ['actual_delivery_date', 'Livraison réelle (BN)'],
  ['reservations_clearance_date', 'PV levée des réserves (BW)'], ['daact_date', 'Dépôt DAACT (BX)'],
  ['management_actual_date', 'MEG réelle validée (CA)'], ['h2_actual_date', 'H2 réelle (CG)'],
] as const;

function formatDate(value: string | null): string {
  return value ? new Date(`${value}T12:00:00`).toLocaleDateString('fr-FR') : '—';
}

export default function PlanningSection({ form, onChange }: OperationSectionProps) {
  const schedule = calculateOperationSchedule({
    operationType: form.operation_type,
    vefaDeedOrLandPurchaseDate: form.vefa_deed_or_land_purchase_date,
    worksOrderExpectedDate: form.operation_type === 'VEFA' ? null : form.works_order_expected_date,
    worksOrderActualDate: form.operation_type === 'VEFA' ? null : form.works_order_actual_date,
    contractualDeliveryDate: form.contractual_delivery_date,
    expectedDeliveryDate: form.expected_delivery_date,
    actualDeliveryDate: form.actual_delivery_date,
    justifiedDelayDays: form.justified_delay_days ? Number(form.justified_delay_days) : 0,
  });

  const calculated = [
    ['AZ', 'Livraison contractuelle', schedule.contractualDeliveryDate, form.operation_type === 'VEFA' ? 'AW + 24 mois' : 'AY + 24 mois, sinon AX'],
    ['BA', 'M-8 prévisionnel', schedule.m8ExpectedDate, 'AZ − 8 mois'],
    ['BD', 'M-7 prévisionnel', schedule.m7ExpectedDate, 'AZ − 7 mois'],
    ['BF', 'M-4 prévisionnel', schedule.m4ExpectedDate, 'AZ − 4 mois'],
    ['BH', 'Logement témoin prévisionnel', schedule.showHomeExpectedDate, 'AZ − 6 mois'],
    ['BZ', 'MEG prévisionnelle', schedule.managementExpectedDate, 'BL + 1 mois'],
    ['CB', 'Réunion levée réserves', schedule.m3ReservationsMeetingDate, 'BN + 3 mois'],
    ['CC', 'Jalon M+10', schedule.m10Date, 'BN + 10 mois'],
    ['CD', 'Fin GPA', schedule.gpaEndDate, 'BN + 12 mois'],
    ['CF', 'H2 butoir', schedule.h2DeadlineDate, 'BN + 3 mois'],
  ] as const;

  return (
    <section>
      <SectionHeading eyebrow="AJ → CG" title="Planning et jalons" description="Les dates saisies alimentent automatiquement les jalons contractuels. Les cartes sombres sont calculées et ne demandent aucune ressaisie." />

      <div className="mb-8 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        {calculated.map(([code, label, value, formula]) => (
          <div key={code} className="relative overflow-hidden rounded-2xl bg-slate-950 p-4 text-white shadow-sm">
            <div className="absolute right-3 top-3 text-teal-300/60"><LockKeyhole size={14} /></div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-300">{code}</p>
            <p className="mt-1 min-h-8 text-xs font-bold text-slate-300">{label}</p>
            <p className="mt-2 text-lg font-black">{formatDate(value)}</p>
            <p className="mt-2 flex items-center gap-1 text-[10px] text-slate-400"><Calculator size={11} /> {formula}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        <div><FieldLabel>N° permis de construire</FieldLabel><TextInput value={form.permit_number} onChange={(event) => onChange('permit_number', event.target.value)} /></div>
        {dateFields.map(([key, label]) => {
          const disabled = form.operation_type === 'VEFA' && (key === 'works_order_expected_date' || key === 'works_order_actual_date');
          return <div key={key}><FieldLabel hint={disabled ? 'VEFA' : undefined}>{label}</FieldLabel><TextInput disabled={disabled} type="date" value={disabled ? '' : form[key]} onChange={(event) => onChange(key, event.target.value)} /></div>;
        })}
        <div><FieldLabel>Avancement (BK)</FieldLabel><TextInput value={form.progress_status} onChange={(event) => onChange('progress_status', event.target.value)} /></div>
        <div><FieldLabel>Évaluation des risques (BM)</FieldLabel><TextInput value={form.risk_assessment} onChange={(event) => onChange('risk_assessment', event.target.value)} /></div>
        <div><FieldLabel>Réserves de livraison (BO)</FieldLabel><TextInput min="0" type="number" value={form.delivery_reservations_count} onChange={(event) => onChange('delivery_reservations_count', event.target.value)} /></div>
        <div><FieldLabel>Retard justifié en jours (BR)</FieldLabel><TextInput min="0" type="number" value={form.justified_delay_days} onChange={(event) => onChange('justified_delay_days', event.target.value)} /></div>
        <div><FieldLabel>Pénalités (BV)</FieldLabel><TextInput min="0" step="0.01" type="number" value={form.penalty_amount} onChange={(event) => onChange('penalty_amount', event.target.value)} /></div>
        <div><FieldLabel>DPE (BY)</FieldLabel><TextInput value={form.dpe} onChange={(event) => onChange('dpe', event.target.value)} /></div>
        <div><FieldLabel>Nombre de GPA (CE)</FieldLabel><TextInput min="0" type="number" value={form.gpa_count} onChange={(event) => onChange('gpa_count', event.target.value)} /></div>
      </div>
    </section>
  );
}
