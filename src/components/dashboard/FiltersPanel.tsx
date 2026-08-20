import { useState } from 'react';
import { ChevronDown, RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import MultiSelectFilter from '../filters/MultiSelectFilter';
import type { OperationFilters } from '../../lib/operationFilters';

interface FiltersPanelProps {
  options: {
    stages: string[];
    departments: string[];
    communes: string[];
    cops: string[];
    ctxs: string[];
    promoters: string[];
    operationTypes: string[];
    labels: string[];
  };
  filters: OperationFilters;
  onFilterChange: <K extends keyof OperationFilters>(key: K, value: OperationFilters[K]) => void;
  onReset: () => void;
  activeFilterCount: number;
}

/**
 * Pilier de filtres du centre de pilotage : recherche, critères et bornes de
 * dates regroupés dans un panneau latéral repliable, pour désencombrer le fil
 * des opérations.
 */
export default function FiltersPanel({
  options,
  filters,
  onFilterChange,
  onReset,
  activeFilterCount,
}: FiltersPanelProps) {
  const [open, setOpen] = useState(true);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="flex items-center gap-2 text-left"
        >
          <SlidersHorizontal size={16} className="text-teal-800" />
          <span className="text-sm font-medium text-slate-900">Filtres</span>
          {activeFilterCount > 0 && (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown size={16} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 rounded-lg p-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
          >
            <RotateCcw size={13} /> Réinitialiser
          </button>
        )}
      </header>

      {open && (
        <div className="space-y-3 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              value={filters.query}
              onChange={(event) => onFilterChange('query', event.target.value)}
              placeholder="Nom, ville, CTX, COP, promoteur…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-teal-600 focus:bg-white"
            />
          </div>

          <div className="flex flex-col gap-2.5">
            <MultiSelectFilter label="Stades" options={options.stages} values={filters.stages} onChange={(value) => onFilterChange('stages', value)} />
            <MultiSelectFilter label="Départements" options={options.departments} values={filters.departments} onChange={(value) => onFilterChange('departments', value)} />
            <MultiSelectFilter label="Communes" options={options.communes} values={filters.communes} onChange={(value) => onFilterChange('communes', value)} />
            <MultiSelectFilter label="COP" options={options.cops} values={filters.cops} onChange={(value) => onFilterChange('cops', value)} />
            <MultiSelectFilter label="CTX" options={options.ctxs} values={filters.ctxs} onChange={(value) => onFilterChange('ctxs', value)} />
            <MultiSelectFilter label="Promoteurs" options={options.promoters} values={filters.promoters} onChange={(value) => onFilterChange('promoters', value)} />
            <MultiSelectFilter label="Types" options={options.operationTypes} values={filters.operationTypes} onChange={(value) => onFilterChange('operationTypes', value)} />
            <MultiSelectFilter label="Labels" options={options.labels} values={filters.labels} onChange={(value) => onFilterChange('labels', value)} />
          </div>

          <div className="space-y-2 border-t border-slate-100 pt-3">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Livraison</p>
            <label className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
              Du
              <input
                aria-label="Livraison à partir du"
                type="date"
                value={filters.deliveryFrom}
                onChange={(event) => onFilterChange('deliveryFrom', event.target.value)}
                className="outline-none"
              />
            </label>
            <label className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
              Au
              <input
                aria-label="Livraison jusqu’au"
                type="date"
                value={filters.deliveryTo}
                onChange={(event) => onFilterChange('deliveryTo', event.target.value)}
                className="outline-none"
              />
            </label>
          </div>
        </div>
      )}
    </section>
  );
}
