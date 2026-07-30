import { Plus, Trash2 } from 'lucide-react';
import { totalSignificantWorks } from '../../../lib/synthesisModel';
import type { OperationSignificantWork } from '../../../types/domain';
import { FieldLabel, TextArea, TextInput } from '../FormControls';

export default function SignificantWorksEditor({ rows, editable, onChange }: {
  rows: OperationSignificantWork[];
  editable: boolean;
  onChange: (rows: OperationSignificantWork[]) => void;
}) {
  const update = (index: number, patch: Partial<OperationSignificantWork>) =>
    onChange(rows.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row));
  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div><p className="text-[10px] uppercase tracking-widest text-teal-700">Travaux significatifs</p>
          <p className="text-sm text-slate-600">Chaque montant alimente automatiquement la fiche de synthèse.</p></div>
        <button type="button" disabled={!editable} onClick={() => onChange([...rows, { label: '', amount_ht: null, comment: '', sort_order: rows.length }])}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-3 py-2 text-xs text-white disabled:opacity-40"><Plus size={15} /> Ajouter</button>
      </div>
      <div className="divide-y divide-slate-100">
        {rows.map((row, index) => <div key={row.id ?? index} className="grid grid-cols-1 items-end gap-4 p-4 lg:grid-cols-[1.2fr_180px_1.4fr_40px]">
          <div><FieldLabel>Libellé</FieldLabel><TextInput disabled={!editable} value={row.label} onChange={(event) => update(index, { label: event.target.value })} /></div>
          <div><FieldLabel>Montant HT</FieldLabel><TextInput disabled={!editable} type="number" min="0" step="0.01" value={row.amount_ht ?? ''} onChange={(event) => update(index, { amount_ht: event.target.value === '' ? null : Number(event.target.value) })} /></div>
          <div><FieldLabel>Commentaire</FieldLabel><TextArea disabled={!editable} rows={1} value={row.comment ?? ''} onChange={(event) => update(index, { comment: event.target.value })} /></div>
          <button type="button" disabled={!editable} aria-label="Supprimer ce travail" onClick={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index))}
            className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"><Trash2 size={17} /></button>
        </div>)}
        {rows.length === 0 && <p className="p-6 text-center text-sm text-slate-400">Aucun travail supplémentaire renseigné.</p>}
      </div>
      <div className="border-t border-teal-200 bg-teal-50 px-5 py-4 text-right text-sm text-teal-950">
        Total HT : <span className="font-medium">{totalSignificantWorks(rows).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
      </div>
    </div>
  );
}
