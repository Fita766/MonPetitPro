import { Calculator, Check, LockKeyhole } from 'lucide-react';
import { calculateDateVariance, type MilestoneDefinition } from '../../../lib/planningMilestones';
import { TextInput } from '../FormControls';

export interface SoControl {
  checked: boolean;
  editable?: boolean;
  onChange: (checked: boolean) => void;
}

interface MilestoneRowProps {
  milestone: MilestoneDefinition;
  expected: string | null;
  actual: string | null;
  expectedEditable: boolean;
  actualEditable: boolean;
  onExpectedChange?: (value: string) => void;
  onActualChange?: (value: string) => void;
  so?: SoControl;
  hint?: string;
  emphasized?: boolean;
}

function varianceBadge(variance: number | null) {
  if (variance == null) return <span className="text-xs text-slate-400">Écart à calculer</span>;
  if (variance > 0) return <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-800">+{variance} jours de retard</span>;
  if (variance < 0) return <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">−{Math.abs(variance)} jours d’avance</span>;
  return <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800">À l’heure</span>;
}

export default function MilestoneRow({
  milestone,
  expected,
  actual,
  expectedEditable,
  actualEditable,
  onExpectedChange,
  onActualChange,
  so,
  hint,
  emphasized,
}: MilestoneRowProps) {
  const variance = calculateDateVariance(expected, actual);
  const hasPair = Boolean(milestone.expectedField && milestone.actualField);

  return (
    <div className={`grid gap-3 border-b border-slate-100 px-4 py-4 last:border-b-0 lg:grid-cols-[minmax(210px,1fr)_180px_180px_170px] lg:items-end ${emphasized ? 'bg-teal-50/50 ring-1 ring-inset ring-teal-200' : ''}`}>
      <div>
        <div className="flex items-center gap-2">
          <p className="font-medium text-slate-900">{milestone.label}</p>
          {milestone.code && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">{milestone.code}</span>}
          {emphasized && <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-medium text-teal-800">Terrain</span>}
          {so && (
            <label
              title="Sauf opposition"
              className={`ml-auto inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${so.checked ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300 bg-white text-slate-500 hover:border-teal-700 hover:text-teal-700'} ${so.editable === false ? 'cursor-not-allowed opacity-60' : ''}`}
            >
              <input type="checkbox" className="sr-only" disabled={so.editable === false} checked={so.checked} onChange={(event) => so.onChange(event.target.checked)} />
              {so.checked ? <Check size={12} /> : <span className="inline-block w-3" />}
              SO
            </label>
          )}
        </div>
        {milestone.formula && <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Calculator size={12} /> {milestone.formula}</p>}
      </div>
      <label className="text-xs text-slate-500">
        {milestone.actualField ? 'Date prévisionnelle' : 'Date'}
        {milestone.expectedField
          ? <div className="relative">
              <TextInput disabled={!expectedEditable} type="date" value={expected ?? ''} onChange={(event) => onExpectedChange?.(event.target.value)} />
              {milestone.expectedCalculated && <LockKeyhole size={14} className="pointer-events-none absolute right-3 top-3 text-teal-700" />}
            </div>
          : <span className="mt-1 block rounded-xl border border-dashed border-slate-200 px-3 py-2.5 text-slate-400">Non définie</span>}
      </label>
      <label className="text-xs text-slate-500">
        Date réelle
        {milestone.actualField
          ? <TextInput disabled={!actualEditable} type="date" value={actual ?? ''} onChange={(event) => onActualChange?.(event.target.value)} />
          : <span className="mt-1 block rounded-xl border border-dashed border-slate-200 px-3 py-2.5 text-slate-400">Jalon prévisionnel</span>}
        {hint && <span className="mt-1 block text-[11px] font-normal text-teal-700">{hint}</span>}
      </label>
      <div className="pb-2">{hasPair ? varianceBadge(variance) : <span className="text-xs text-slate-400">Date unique</span>}</div>
    </div>
  );
}
