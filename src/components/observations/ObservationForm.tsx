import { EyeOff, Save, X } from 'lucide-react';
import type { ObservationFormData, ObservationExplicitStatus } from '../../lib/observationStatus';
import { FieldLabel, SelectInput, TextArea, TextInput } from '../operations/FormControls';

export interface ObservationOperationOption {
  id: string;
  name: string;
}

export default function ObservationForm({ value, operations, responsibles, fixedOperation, saving, onChange, onSubmit, onCancel }: {
  value: ObservationFormData;
  operations: ObservationOperationOption[];
  responsibles: string[];
  fixedOperation?: boolean;
  saving?: boolean;
  onChange: (value: ObservationFormData) => void;
  onSubmit: (event: React.FormEvent) => void;
  onCancel: () => void;
}) {
  const update = <K extends keyof ObservationFormData>(key: K, fieldValue: ObservationFormData[K]) => onChange({ ...value, [key]: fieldValue });
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {!fixedOperation && <div><FieldLabel>Opération *</FieldLabel><SelectInput required value={value.operation_id} onChange={(event) => update('operation_id', event.target.value)}><option value="">Sélectionner…</option>{operations.map((operation) => <option key={operation.id} value={operation.id}>{operation.name}</option>)}</SelectInput></div>}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div><FieldLabel>Date d’information *</FieldLabel><TextInput required type="date" value={value.info_date} onChange={(event) => update('info_date', event.target.value)} /></div>
        <div><FieldLabel>Réalisateur / responsable *</FieldLabel><TextInput required list="observation-responsibles" value={value.responsible_person} onChange={(event) => update('responsible_person', event.target.value)} /><datalist id="observation-responsibles">{responsibles.map((responsible) => <option key={responsible} value={responsible} />)}</datalist></div>
      </div>
      <div><FieldLabel>Description *</FieldLabel><TextArea required rows={5} value={value.description} onChange={(event) => update('description', event.target.value)} /></div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div><FieldLabel>Date butoir *</FieldLabel><TextInput required type="date" value={value.deadline_date} onChange={(event) => update('deadline_date', event.target.value)} /></div>
        <div><FieldLabel>Réalisation</FieldLabel><TextInput type="date" value={value.completion_date} onChange={(event) => update('completion_date', event.target.value)} /></div>
        <div><FieldLabel>Résolution proposée</FieldLabel><TextInput type="date" value={value.resolution_date} onChange={(event) => update('resolution_date', event.target.value)} /></div>
        <div><FieldLabel>Statut</FieldLabel><SelectInput value={value.status} onChange={(event) => update('status', event.target.value as ObservationExplicitStatus)}>{(['En cours', 'Réussi', 'Échec', 'Bloqué'] as ObservationExplicitStatus[]).map((status) => <option key={status}>{status}</option>)}</SelectInput></div>
      </div>
      <label className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition ${value.is_dg ? 'border-amber-300 bg-amber-50 text-amber-950' : 'border-slate-200 bg-slate-50 text-slate-600'}`}><input type="checkbox" checked={value.is_dg} onChange={(event) => update('is_dg', event.target.checked)} className="rounded border-slate-300 text-amber-600" /><EyeOff size={17} /> Information DG — inclure dans l’extraction spécifique</label>
      <div className="flex justify-end gap-3 border-t border-slate-200 pt-5"><button type="button" onClick={onCancel} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600"><X size={16} /> Annuler</button><button disabled={saving} type="submit" className="inline-flex items-center gap-2 rounded-xl bg-teal-800 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"><Save size={16} /> {saving ? 'Enregistrement…' : 'Enregistrer'}</button></div>
    </form>
  );
}
