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
  /** Mode recherche distante : appelé à chaque frappe (≥ 2 caractères). Le parent
   *  fournit les résultats via `options`. Utile pour les grosses tables (communes)
   *  que le serveur tronque à 1000 lignes (PostgREST) — on ne peut pas tout charger. */
  onSearchChange?: (query: string) => void;
}

export default function ReferenceSelect({
  valueId,
  options,
  disabled = false,
  placeholder = 'Rechercher et sélectionner…',
  fallbackLabel = '',
  onSelect,
  onSearchChange,
}: ReferenceSelectProps) {
  const selected = options.find((option) => option.id === valueId);
  const displayValue = selected?.label ?? fallbackLabel;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setOpen(true);
    setActiveIndex(0);
    if (onSearchChange) {
      const needle = value.trim();
      onSearchChange(needle.length >= 2 ? needle : '');
    }
  };

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('fr');
    const results = options
      .filter((option) => option.isActive !== false || option.id === valueId)
      .filter((option) => !needle
        || `${option.label} ${option.secondary ?? ''}`.toLocaleLowerCase('fr').includes(needle));
    // Dès qu'on tape, on affiche TOUTES les correspondances (aucune troncature) :
    // une recherche doit pouvoir trouver n'importe quelle valeur, de A à Z.
    // La limite à 80 ne s'applique qu'à la liste affichée à l'ouverture sans
    // recherche (qui est de toute façon remplacée par l'invite sur les grandes listes).
    return needle ? results : results.slice(0, 80);
  }, [options, query, valueId]);

  // Pour une grande liste (ex. les communes), l'ouverture sans recherche ne doit
  // pas noyer l'utilisateur avec les 80 premières valeurs triées (qui ne font
  // apparaître qu'une seule lettre) : on invite à taper.
  const promptSearch = !query.trim() && (options.length > 80 || Boolean(onSearchChange));

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
          onChange={(event) => handleQueryChange(event.target.value)}
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
        {promptSearch && (
          <p className="p-4 text-center text-sm text-slate-500">
            Tapez au moins 2 caractères pour rechercher…
          </p>
        )}
        {!promptSearch && filtered.length === 0 && <p className="p-3 text-sm text-slate-500">Aucune valeur correspondante.</p>}
        {!promptSearch && filtered.map((option, index) => <button key={option.id} role="option"
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
