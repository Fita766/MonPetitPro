import { CheckField, FieldLabel, SectionHeading, TextInput } from './FormControls';
import type { OperationSectionProps } from './formTypes';

export default function ObjectivesSection({ form, onChange, canEditField = () => true }: OperationSectionProps) {
  const currentYear = new Date().getFullYear();
  return (
    <section>
      <SectionHeading eyebrow="Pilotage DMO" title="Objectifs annuels" description="L’objectif reste attaché à son année de référence. Les réalisations et décalages seront calculés sans modifier ce point de départ." />
      <div className="max-w-2xl rounded-3xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white p-7">
        <CheckField disabled={!canEditField('is_objective')} checked={form.is_objective} onChange={(value) => onChange('is_objective', value)}>Cette opération fait partie des objectifs DMO Travaux</CheckField>
        <div className="mt-5 max-w-xs"><FieldLabel>Année de l’objectif</FieldLabel><TextInput disabled={!form.is_objective || !canEditField('objective_year')} min={2000} max={2100} type="number" placeholder={String(currentYear)} value={form.objective_year} onChange={(event) => onChange('objective_year', event.target.value)} /></div>
        <p className="mt-5 text-sm leading-relaxed text-slate-600">Le nombre de logements objectif sera figé à partir du programme. La vue annuelle comparera ensuite la MEG prévue et la MEG réelle mois par mois.</p>
      </div>
    </section>
  );
}
