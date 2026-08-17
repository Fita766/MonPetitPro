import type { MilestoneDefinition, MilestoneGroupDefinition } from '../../../lib/planningMilestones';
import MilestoneRow, { type SoControl } from './MilestoneRow';

export interface MilestoneRowExtra {
  so?: SoControl;
  hint?: string;
  emphasized?: boolean;
}

interface MilestoneGroupProps {
  group: MilestoneGroupDefinition;
  milestones: MilestoneDefinition[];
  valueFor: (field: string | undefined) => string | null;
  canEdit: (field: string | undefined, calculated?: boolean) => boolean;
  onChange: (field: string, value: string) => void;
  note?: string;
  rowExtra?: (milestone: MilestoneDefinition) => MilestoneRowExtra | undefined;
}

export default function MilestoneGroup({
  group,
  milestones,
  valueFor,
  canEdit,
  onChange,
  note,
  rowExtra,
}: MilestoneGroupProps) {
  if (milestones.length === 0) return null;
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-teal-200 bg-teal-50 px-5 py-4">
        <h3 className="font-medium text-teal-950">{group.title}</h3>
        <p className="mt-1 text-xs text-slate-600">{group.description}</p>
        {note && <p className="mt-2 rounded-lg bg-white/80 px-3 py-2 text-xs text-teal-900">{note}</p>}
      </header>
      <div>{milestones.map((milestone) => <MilestoneRow key={milestone.key}
        milestone={milestone}
        expected={valueFor(milestone.expectedField)}
        actual={valueFor(milestone.actualField)}
        expectedEditable={canEdit(milestone.expectedField, milestone.expectedCalculated)}
        actualEditable={canEdit(milestone.actualField)}
        onExpectedChange={milestone.expectedField ? (value) => onChange(milestone.expectedField as string, value) : undefined}
        onActualChange={milestone.actualField ? (value) => onChange(milestone.actualField as string, value) : undefined}
        {...rowExtra?.(milestone)} />)}</div>
    </article>
  );
}
