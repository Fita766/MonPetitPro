import { Check, ChevronDown, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export default function MultiSelectFilter({ label, options, values, onChange }: { label: string; options: string[]; values: string[]; onChange: (values: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const toggle = (option: string) => onChange(values.includes(option) ? values.filter((value) => value !== option) : [...values, option]);

  return (
    <div ref={containerRef} className="relative min-w-[150px]">
      <button type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-bold shadow-sm transition ${values.length ? 'border-teal-500 bg-teal-50 text-teal-950' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>
        <span className="truncate">{label}{values.length ? ` · ${values.length}` : ''}</span><ChevronDown size={14} className={`shrink-0 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 z-50 mt-2 max-h-72 min-w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-2xl">
          {values.length > 0 && <button type="button" onClick={() => onChange([])} className="mb-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-bold text-red-600 hover:bg-red-50"><X size={13} /> Effacer</button>}
          {options.length === 0 ? <p className="px-3 py-4 text-center text-xs text-slate-400">Aucune valeur</p> : options.map((option) => {
            const selected = values.includes(option);
            return <button key={option} type="button" onClick={() => toggle(option)} className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold ${selected ? 'bg-teal-50 text-teal-950' : 'text-slate-600 hover:bg-slate-50'}`}><span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${selected ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300'}`}>{selected && <Check size={11} />}</span><span className="whitespace-nowrap">{option}</span></button>;
          })}
        </div>
      )}
    </div>
  );
}
