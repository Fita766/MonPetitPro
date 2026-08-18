import { Check, ChevronDown, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

export interface ReferenceSelectOption {
  id: string;
  label: string;
  secondary?: string;
  isActive?: boolean;
}

interface ReferenceSelectProps {
  valueId: string;
  options: ReferenceSelectOption[];
  disabled?: boolean;
  placeholder?: string;
  fallbackLabel?: string;
  onSelect: (option: ReferenceSelectOption) => void;
}

export default function ReferenceSelect({
  valueId,
  options,
  disabled = false,
  placeholder = 'Rechercher et sélectionner…',
  fallbackLabel = '',
  onSelect,
}: ReferenceSelectProps) {
  const selected = options.find((option) => option.id === valueId);
  const displayValue = selected?.label ?? fallbackLabel;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('fr');
    return options
      .filter((option) => option.isActive !== false || option.id === valueId)
      .filter((option) => !needle
        || `${option.label} ${option.secondary ?? ''}`.toLocaleLowerCase('fr').includes(needle))
      .slice(0, 80);
  }, [options, query, valueId]);

  const choose = (option: ReferenceSelectOption) => {
    onSelect(option);
    setQuery('');
    setOpen(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search aria-hidden size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input role="combobox" aria-expanded={open} aria-autocomplete="list"
          disabled={disabled} value={open ? query : displayValue}
          placeholder={placeholder}
          onFocus={() => { setOpen(true); setQuery(''); setActiveIndex(0); }}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onChange={(event) => { setQuery(event.target.value); setOpen(true); setActiveIndex(0); }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setActiveIndex((current) => Math.min(current + 1, filtered.length - 1));
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setActiveIndex((current) => Math.max(current - 1, 0));
            } else if (event.key === 'Enter' && filtered[activeIndex]) {
              event.preventDefault();
              choose(filtered[activeIndex]);
            } else if (event.key === 'Escape') {
              setOpen(false);
            }
          }}
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-10 text-sm text-slate-950 shadow-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/10 disabled:bg-slate-100 disabled:text-slate-500" />
        <ChevronDown aria-hidden size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
      </div>
      {open && !disabled && <div role="listbox"
        className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10">
        {filtered.length === 0 && <p className="p-3 text-sm text-slate-500">Aucune valeur correspondante.</p>}
        {filtered.map((option, index) => <button key={option.id} role="option"
          aria-selected={option.id === valueId} type="button" onMouseDown={(event) => event.preventDefault()}
          onClick={() => choose(option)}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left ${index === activeIndex ? 'bg-teal-50' : 'hover:bg-slate-50'}`}>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-slate-900">{option.label}</span>
            {option.secondary && <span className="block truncate text-xs text-slate-500">{option.secondary}</span>}
          </span>
          {option.isActive === false && <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] text-slate-500">Inactive</span>}
          {option.id === valueId && <Check size={16} className="text-teal-700" />}
        </button>)}
      </div>}
    </div>
  );
}
