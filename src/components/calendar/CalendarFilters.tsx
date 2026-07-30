import type { BusinessCalendarView } from '../../lib/calendarEvents';
import MultiSelectFilter from '../filters/MultiSelectFilter';

export interface CalendarFilterState {
  operations: string[];
  ctxs: string[];
  cops: string[];
  departments: string[];
  promoters: string[];
  stages: string[];
  modes: string[];
  natures: string[];
  milestoneTypes: string[];
}

export type CalendarFilterOptions = CalendarFilterState;

export default function CalendarFilters({ view, filters, options, onChange }: { view: BusinessCalendarView | 'agenda'; filters: CalendarFilterState; options: CalendarFilterOptions; onChange: (filters: CalendarFilterState) => void }) {
  const set = (key: keyof CalendarFilterState, values: string[]) => onChange({ ...filters, [key]: values });
  return (
    <div className="flex flex-wrap gap-2">
      <MultiSelectFilter label="Opérations" options={options.operations} values={filters.operations} onChange={(values) => set('operations', values)} />
      <MultiSelectFilter label="CTX" options={options.ctxs} values={filters.ctxs} onChange={(values) => set('ctxs', values)} />
      <MultiSelectFilter label="COP" options={options.cops} values={filters.cops} onChange={(values) => set('cops', values)} />
      <MultiSelectFilter label="Départements" options={options.departments} values={filters.departments} onChange={(values) => set('departments', values)} />
      <MultiSelectFilter label="Promoteurs" options={options.promoters} values={filters.promoters} onChange={(values) => set('promoters', values)} />
      <MultiSelectFilter label="Stades" options={options.stages} values={filters.stages} onChange={(values) => set('stages', values)} />
      <MultiSelectFilter label="Modes" options={options.modes} values={filters.modes} onChange={(values) => set('modes', values)} />
      <MultiSelectFilter label="Natures" options={options.natures} values={filters.natures} onChange={(values) => set('natures', values)} />
      {view !== 'agenda' && <MultiSelectFilter label="Types de jalon" options={options.milestoneTypes} values={filters.milestoneTypes} onChange={(values) => set('milestoneTypes', values)} />}
      {Object.values(filters).some((values) => values.length) && <button type="button" onClick={() => onChange({ operations: [], ctxs: [], cops: [], departments: [], promoters: [], stages: [], modes: [], natures: [], milestoneTypes: [] })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-500">Effacer</button>}
    </div>
  );
}
