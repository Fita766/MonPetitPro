import { calculateOperationSchedule } from '../../lib/operationCalculations';
import { MILESTONE_GROUPS, proposedPermitOrderDate, type MilestoneDefinition } from '../../lib/planningMilestones';
import type { OperationFormData } from '../../lib/operationPayload';
import { FieldLabel, SectionHeading, TextInput } from './FormControls';
import type { OperationSectionProps } from './formTypes';
import MilestoneGroup, { type MilestoneRowExtra } from './planning/MilestoneGroup';

export default function PlanningSection({
  form,
  onChange,
  canEditField = () => true,
}: OperationSectionProps) {
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
  const calculatedValues: Record<string, string | null> = {
    contractual_delivery_date: schedule.contractualDeliveryDate,
    m8_expected_date: schedule.m8ExpectedDate,
    m7_expected_date: schedule.m7ExpectedDate,
    m4_expected_date: schedule.m4ExpectedDate,
    show_home_expected_date: schedule.showHomeExpectedDate,
    management_expected_date: schedule.managementExpectedDate,
    m3_reservations_meeting_date: schedule.m3ReservationsMeetingDate,
    m10_date: schedule.m10Date,
    gpa_end_date: schedule.gpaEndDate,
    h2_deadline_date: schedule.h2DeadlineDate,
    authorized_deadline_date: schedule.authorizedDeadlineDate,
  };

  const valueFor = (field: string | undefined): string | null => {
    if (!field) return null;
    if (field in calculatedValues) return calculatedValues[field];
    if (field in form) {
      const value = form[field as keyof OperationFormData];
      return typeof value === 'string' ? value || null : null;
    }
    return null;
  };
  const canEdit = (field: string | undefined, calculated = false) =>
    Boolean(field && !calculated && field in form && canEditField(field as keyof OperationFormData));
  const setDate = (field: string, value: string) => {
    if (field in form) onChange(field as keyof OperationFormData, value);
  };
  const rowExtra = (milestone: MilestoneDefinition): MilestoneRowExtra | undefined => {
    if (milestone.key === 'csi_ca') {
      return { so: { checked: Boolean(form.so_csi_ca), editable: canEditField('so_csi_ca'), onChange: (checked) => onChange('so_csi_ca', checked) } };
    }
    if (milestone.key === 'lli_approval') {
      return { so: { checked: Boolean(form.so_lli_approval), editable: canEditField('so_lli_approval'), onChange: (checked) => onChange('so_lli_approval', checked) } };
    }
    if (milestone.key === 'vefa_deed') {
      return { emphasized: Boolean(form.terrain) };
    }
    if (milestone.key === 'permit_order') {
      const proposed = proposedPermitOrderDate(form.permit_submission_date);
      if (!proposed || form.permit_order_date) return undefined;
      return { hint: `Proposition : ${proposed} (dépôt + 4 mois)` };
    }
    return undefined;
  };

  const delaySummary = [
    ['Retard brut', schedule.deliveryGapDays, 'jours'],
    ['Retard effectif', schedule.effectiveDelayDays, 'jours'],
    ['Date limite autorisée', schedule.authorizedDeadlineDate
      ? new Date(`${schedule.authorizedDeadlineDate}T12:00:00`).toLocaleDateString('fr-FR') : '—', ''],
    ['Situation', schedule.deadlineStatus ?? 'Non calculée', ''],
  ] as const;

  return (
    <section>
      <SectionHeading eyebrow="Planning métier" title="Jalons prévisionnels et réels"
        description="Les dates sont regroupées par étape. Chaque écart positif signale un retard, chaque écart négatif une avance." />

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <div>
          <FieldLabel>Numéro de permis de construire</FieldLabel>
          <TextInput disabled={!canEditField('permit_number')} value={form.permit_number}
            onChange={(event) => onChange('permit_number', event.target.value)} />
        </div>
        <div>
          <FieldLabel>Avancement général</FieldLabel>
          <TextInput disabled={!canEditField('progress_status')} value={form.progress_status}
            onChange={(event) => onChange('progress_status', event.target.value)} />
        </div>
      </div>

      <div className="space-y-5">
        {MILESTONE_GROUPS.map((group) => {
          const milestones = group.milestones.filter((milestone) =>
            (!milestone.appliesTo || milestone.appliesTo.includes(form.operation_type as 'MOD' | 'VEFA')) &&
            (milestone.key !== 'vefa_deed' || form.terrain));
          const note = group.key === 'works' && form.operation_type === 'VEFA'
            ? 'En VEFA, l’acte remplace l’ordre de service manuel pour les calculs contractuels.'
            : undefined;
          return <MilestoneGroup key={group.key} group={group} milestones={milestones}
            valueFor={valueFor} canEdit={canEdit} onChange={setDate} note={note} rowExtra={rowExtra} />;
        })}
      </div>

      <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
        <h3 className="font-medium text-slate-900">Délais de livraison</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {delaySummary.map(([label, value, suffix]) => <div key={label} className="rounded-xl border border-amber-100 bg-white p-3">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="mt-1 font-medium text-slate-900">{value ?? '—'} {value !== '—' ? suffix : ''}</p>
          </div>)}
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div><FieldLabel>Retard justifié en jours</FieldLabel><TextInput disabled={!canEditField('justified_delay_days')} min="0" type="number" value={form.justified_delay_days} onChange={(event) => onChange('justified_delay_days', event.target.value)} /></div>
          <div><FieldLabel>Pénalités</FieldLabel><TextInput disabled={!canEditField('penalty_amount')} min="0" step="0.01" type="number" value={form.penalty_amount} onChange={(event) => onChange('penalty_amount', event.target.value)} /></div>
          <div><FieldLabel>Réserves à la livraison</FieldLabel><TextInput disabled={!canEditField('delivery_reservations_count')} min="0" type="number" value={form.delivery_reservations_count} onChange={(event) => onChange('delivery_reservations_count', event.target.value)} /></div>
          <div><FieldLabel>Nombre de GPA</FieldLabel><TextInput disabled={!canEditField('gpa_count')} min="0" type="number" value={form.gpa_count} onChange={(event) => onChange('gpa_count', event.target.value)} /></div>
          <div className="md:col-span-2"><FieldLabel>Évaluation des risques</FieldLabel><TextInput disabled={!canEditField('risk_assessment')} value={form.risk_assessment} onChange={(event) => onChange('risk_assessment', event.target.value)} /></div>
          <div><FieldLabel>DPE</FieldLabel><TextInput disabled={!canEditField('dpe')} value={form.dpe} onChange={(event) => onChange('dpe', event.target.value)} /></div>
        </div>
      </div>
    </section>
  );
}
