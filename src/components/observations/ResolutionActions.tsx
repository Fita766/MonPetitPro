import { BadgeCheck, Check, Trash2 } from 'lucide-react';
import { can } from '../../lib/permissions';
import type { ObservationRow } from '../../lib/observationStatus';
import type { UserRole } from '../../types/domain';

export default function ResolutionActions({ observation, role, onValidate, onDelete }: { observation: ObservationRow; role: UserRole | null | undefined; onValidate: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center justify-end gap-1">
      {observation.resolution_validated_at ? (
        <span title={`Validée le ${new Date(observation.resolution_validated_at).toLocaleString('fr-FR')}`} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700"><BadgeCheck size={13} /> Validée</span>
      ) : observation.resolution_date && can(role, 'validateResolution') ? (
        <button type="button" onClick={onValidate} title="Valider la résolution" className="rounded-lg p-2 text-emerald-700 hover:bg-emerald-50"><Check size={17} /></button>
      ) : null}
      {can(role, 'deleteObservation') && <button type="button" onClick={onDelete} title="Supprimer" className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button>}
    </div>
  );
}
