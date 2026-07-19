import type { BusinessCalendarView } from '../../lib/calendarEvents';
import MultiSelectFilter from '../filters/MultiSelectFilter';

export interface CalendarFilterState {
  operations: string[];
  ctxs: string[];
  cops: string[];
  departments: string[];
  promoters: string[];
}

export type CalendarFilterOptions = CalendarFilterState;

export default function CalendarFilters({ view, filters, options, onChange }: { view: BusinessCalendarView | 'agenda'; filters: CalendarFilterState; options: CalendarFilterOptions; onChange: (filters: CalendarFilterState) => void }) {
  const set = (key: keyof CalendarFilterState, values: string[]) => onChange({ ...filters, [key]: values });
  return (
    <div className="flex flex-wrap gap-2">
      {(view === 'conditions' || view === 'key-dates' || view === 'agenda') && <MultiSelectFilter label="Opérations" options={options.operations} values={filters.operations} onChange={(values) => set('operations', values)} />}
      {(view === 'deliveries' || view === 'management' || view === 'agenda') && <MultiSelectFilter label="CTX" options={options.ctxs} values={filters.ctxs} onChange={(values) => set('ctxs', values)} />}
      {(view === 'conditions' || view === 'agenda') && <MultiSelectFilter label="COP" options={options.cops} values={filters.cops} onChange={(values) => set('cops', values)} />}
      {(view === 'deliveries' || view === 'management' || view === 'agenda') && <MultiSelectFilter label="Départements" options={options.departments} values={filters.departments} onChange={(values) => set('departments', values)} />}
      {(view === 'deliveries' || view === 'agenda') && <MultiSelectFilter label="Promoteurs" options={options.promoters} values={filters.promoters} onChange={(values) => set('promoters', values)} />}
      {Object.values(filters).some((values) => values.length) && <button type="button" onClick={() => onChange({ operations: [], ctxs: [], cops: [], departments: [], promoters: [] })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500">Effacer</button>}
    </div>
  );
}
