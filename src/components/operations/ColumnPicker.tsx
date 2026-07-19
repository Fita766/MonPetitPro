import { Columns3 } from 'lucide-react';
import { useState } from 'react';
import type { OperationColumn } from '../../lib/operationExport';

export default function ColumnPicker({ columns, selected, onChange }: { columns: OperationColumn[]; selected: string[]; onChange: (columns: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const toggle = (key: string) => onChange(selected.includes(key) ? selected.filter((item) => item !== key) : [...selected, key]);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:border-slate-300"><Columns3 size={15} /> Colonnes · {selected.length}</button>
      {open && <div className="absolute right-0 z-50 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl"><div className="mb-2 flex justify-between px-1"><button type="button" onClick={() => onChange(columns.map((column) => column.key))} className="text-xs font-bold text-teal-700">Tout afficher</button><button type="button" onClick={() => onChange(['stage', 'name', 'project_manager', 'expected_delivery_date', 'actual_delivery_date'])} className="text-xs font-bold text-slate-500">Essentiel</button></div><div className="max-h-80 overflow-y-auto">{columns.map((column) => <label key={column.key} className="flex items-center gap-3 rounded-lg px-2 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><input type="checkbox" checked={selected.includes(column.key)} onChange={() => toggle(column.key)} className="rounded border-slate-300 text-teal-700" /> {column.label}</label>)}</div></div>}
    </div>
  );
}
