import { Flag, Plus, Trash2 } from 'lucide-react';
import type { ObjectiveCategory, ObjectiveKind, OperationObjective } from '../../types/domain';
import { calculateOperationSchedule } from '../../lib/operationCalculations';
import { FieldLabel, SectionHeading, SelectInput, TextInput } from './FormControls';
import type { OperationSectionProps } from './formTypes';

const KIND_CONFIG: Array<{ kind: ObjectiveKind; title: string; description: string }> = [
  {
    kind: 'works_order',
    title: 'Objectif OS travaux',
    description: 'Suit le démarrage des travaux à partir de la date prévisionnelle d’OS.',
  },
  {
    kind: 'management',
    title: 'Objectif mise en gestion',
    description: 'Suit les logements mis en gestion et calcule les logements-mois gagnés ou perdus.',
  },
];

export default function ObjectivesSection({
  form,
  objectives,
  detailsEditable,
  canDeleteInitial,
  onObjectivesChange,
}: OperationSectionProps & {
  objectives: OperationObjective[];
  detailsEditable: boolean;
  canDeleteInitial: boolean;
  onObjectivesChange: (rows: OperationObjective[]) => void;
}) {
  const currentYear = new Date().getFullYear();
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
  const update = (target: OperationObjective, patch: Partial<OperationObjective>) =>
    onObjectivesChange(objectives.map((row) => row === target ? { ...row, ...patch } : row));
  const add = (kind: ObjectiveKind) => {
    const category: ObjectiveCategory = objectives.some((row) =>
      row.kind === kind && row.objective_year === currentYear && row.category === 'initial')
      ? 'supplementary'
      : 'initial';
    onObjectivesChange([...objectives, {
      kind,
      objective_year: currentYear,
      category,
      snapshot_date: null,
      snapshot_housing_units: null,
    }]);
  };

  return (
    <section>
      <SectionHeading eyebrow="Pilotage DMO" title="Objectifs annuels"
        description="Les objectifs OS et mise en gestion sont indépendants. L’objectif initial est figé ; un complément reste affiché séparément sans changer la base présentée à la direction." />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {KIND_CONFIG.map((config) => {
          const kindRows = objectives.filter((row) => row.kind === config.kind);
          const expectedDate = config.kind === 'works_order' ? form.works_order_expected_date : schedule.managementExpectedDate;
          return (
            <div key={config.kind} className="rounded-3xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white p-6">
              <div className="mb-5 flex items-start gap-3">
                <span className="rounded-xl bg-white p-2.5 text-teal-700 shadow-sm"><Flag size={19} /></span>
                <div>
                  <h3 className="font-medium text-slate-950">{config.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{config.description}</p>
                </div>
              </div>
              <div className="space-y-4">
                {kindRows.map((row, index) => {
                  const protectedInitial = row.category === 'initial' && Boolean(row.id) && !canDeleteInitial;
                  return <div key={row.id ?? `${config.kind}-${index}`} className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel>Année</FieldLabel>
                    <TextInput disabled={!detailsEditable || protectedInitial} min={2000} max={2200} type="number"
                      value={row.objective_year} onChange={(event) => update(row, { objective_year: Number(event.target.value) })} />
                  </div>
                  <div>
                    <FieldLabel>Catégorie</FieldLabel>
                    <SelectInput disabled={!detailsEditable || protectedInitial} value={row.category}
                      onChange={(event) => update(row, { category: event.target.value as ObjectiveCategory })}>
                      <option value="initial">Objectif initial</option>
                      <option value="supplementary">Objectif complémentaire</option>
                    </SelectInput>
                  </div>
                  <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                    <span className="font-medium text-slate-800">Référence figée : </span>
                    {(row.snapshot_date ?? expectedDate) || 'date prévisionnelle à renseigner'}
                    {' · '}
                    {(row.snapshot_housing_units ?? form.total_housing_units) || '0'} logements
                  </div>
                  {protectedInitial && (
                    <p className="sm:col-span-2 text-xs text-slate-500">
                      Cet objectif initial est protégé. Seul un rôle disposant de l’autorisation dédiée peut le retirer ou le reclasser.
                    </p>
                  )}
                  <button type="button" disabled={!detailsEditable || protectedInitial}
                    onClick={() => onObjectivesChange(objectives.filter((item) => item !== row))}
                    className="sm:col-span-2 inline-flex w-fit items-center gap-2 text-xs text-rose-700 disabled:text-slate-300">
                    <Trash2 size={14} /> Retirer ce rattachement
                  </button>
                </div>;
                })}
                {kindRows.length === 0 && <p className="rounded-xl border border-dashed border-slate-200 px-4 py-5 text-center text-sm text-slate-400">Aucun rattachement.</p>}
                <button type="button" disabled={!detailsEditable} onClick={() => add(config.kind)}
                  className="inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-white px-4 py-2 text-sm text-teal-800 disabled:opacity-40">
                  <Plus size={16} /> Ajouter un rattachement
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
