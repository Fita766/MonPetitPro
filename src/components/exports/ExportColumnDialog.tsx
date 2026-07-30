import { useMemo, useState } from 'react';
import { Download, FileSpreadsheet, SlidersHorizontal, X } from 'lucide-react';
import type { ExportColumn } from '../../lib/exportRegistry';

export default function ExportColumnDialog<T>({ columns, storageKey, defaultKeys, label = 'Exporter', onExcel, onPdf, extraAction }: {
  columns: ExportColumn<T>[];
  storageKey: string;
  defaultKeys: string[];
  label?: string;
  onExcel: (keys: string[]) => Promise<void> | void;
  onPdf: (keys: string[]) => void;
  extraAction?: { label: string; onClick: (keys: string[]) => Promise<void> | void };
}) {
  const availableKeys = useMemo(() => new Set(columns.map((column) => column.key)), [columns]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) ?? '[]') as string[];
      const valid = stored.filter((key) => availableKeys.has(key));
      return valid.length ? valid : defaultKeys.filter((key) => availableKeys.has(key));
    } catch {
      return defaultKeys.filter((key) => availableKeys.has(key));
    }
  });
  const groups = [...new Set(columns.map((column) => column.group))];
  const toggle = (key: string) => setSelected((current) => {
    const next = current.includes(key) ? current.filter((item) => item !== key) : [...current, key];
    localStorage.setItem(storageKey, JSON.stringify(next));
    return next;
  });
  return <>
    <button type="button" onClick={() => setOpen(true)}
      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700 shadow-sm">
      <SlidersHorizontal size={15} /> {label}
    </button>
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4" role="dialog" aria-modal="true" aria-label="Choisir les colonnes d’export">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div><p className="text-[10px] uppercase tracking-widest text-teal-700">Extraction</p><h2 className="text-xl font-medium text-slate-950">Choisir les colonnes</h2></div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Fermer" className="rounded-xl p-2 text-slate-500"><X size={18} /></button>
        </div>
        <div className="max-h-[60vh] space-y-5 overflow-y-auto p-6">
          {groups.map((group) => <fieldset key={group}>
            <legend className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">{group}</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {columns.filter((column) => column.group === group).map((column) => <label key={column.key} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
                <input type="checkbox" checked={selected.includes(column.key)} onChange={() => toggle(column.key)} />
                {column.label}
              </label>)}
            </div>
          </fieldset>)}
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-6 py-4">
          {extraAction && <button disabled={!selected.length} type="button" onClick={() => void extraAction.onClick(selected)}
            className="mr-auto rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">{extraAction.label}</button>}
          <button disabled={!selected.length} type="button" onClick={() => void onExcel(selected)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs disabled:opacity-40"><FileSpreadsheet size={15} /> Excel</button>
          <button disabled={!selected.length} type="button" onClick={() => onPdf(selected)} className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-xs text-white disabled:opacity-40"><Download size={15} /> PDF</button>
        </div>
      </div>
    </div>}
  </>;
}
