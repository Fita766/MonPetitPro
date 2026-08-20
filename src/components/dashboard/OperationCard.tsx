import { CalendarDays, Edit3, MapPin, Trash2 } from 'lucide-react';
import { getStageConfig } from '../../lib/stage';
import type { OperationStage } from '../../types/domain';

export interface OperationCardData {
  id: string;
  name: string;
  stage: OperationStage | null;
  project_manager: string | null;
  operations_manager: string | null;
  operation_type: string;
  promoter_name: string | null;
  department: string | null;
  commune: string | null;
  total_housing_units: number | null;
  expected_delivery_date: string | null;
  actual_delivery_date: string | null;
}

interface OperationCardProps {
  operation: OperationCardData;
  onOpen: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

function shortDate(value: string | null | undefined): string {
  return value ? new Date(`${value}T12:00:00`).toLocaleDateString('fr-FR') : '—';
}

/**
 * Fiche opération du centre de pilotage : carte compacte qui remplace la ligne
 * de tableau. Une pastille de stade colorée, les infos clés (localisation,
 * CTX/COP, logements) et les dates de livraison.
 */
export default function OperationCard({ operation, onOpen, onEdit, onDelete }: OperationCardProps) {
  const stage = getStageConfig(operation.stage);
  const location = [operation.department, operation.commune].filter(Boolean).join(' · ') || 'Localisation non renseignée';

  return (
    <article
      onClick={onOpen}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-teal-300 hover:shadow-md"
    >
      <div
        style={{ backgroundColor: stage.color, color: stage.textColor }}
        className="flex items-start justify-between gap-2 px-5 py-2.5"
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.15em]">
          {operation.stage ? `Stade ${operation.stage} · ${stage.label}` : stage.label}
        </span>
        {(onEdit || onDelete) && (
          <span
            className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={(event) => event.stopPropagation()}
          >
            {onEdit && (
              <button
                type="button"
                aria-label={`Modifier ${operation.name}`}
                onClick={onEdit}
                className="rounded-md p-1.5 hover:bg-black/10"
              >
                <Edit3 size={14} />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                aria-label={`Supprimer ${operation.name}`}
                onClick={onDelete}
                className="rounded-md p-1.5 hover:bg-black/10"
              >
                <Trash2 size={14} />
              </button>
            )}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="break-words text-lg font-medium leading-snug text-slate-950">{operation.name}</h3>
        <p className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-500">
          <MapPin size={14} className="shrink-0 text-slate-400" /> {location}
        </p>

        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
          <div>
            <dt className="uppercase tracking-wider text-slate-400">CTX</dt>
            <dd className="mt-0.5 truncate font-medium text-slate-800">{operation.project_manager || '—'}</dd>
          </div>
          <div>
            <dt className="uppercase tracking-wider text-slate-400">COP</dt>
            <dd className="mt-0.5 truncate font-medium text-slate-800">{operation.operations_manager || '—'}</dd>
          </div>
          <div>
            <dt className="uppercase tracking-wider text-slate-400">Promoteur</dt>
            <dd className="mt-0.5 truncate font-medium text-slate-800">{operation.promoter_name || '—'}</dd>
          </div>
          <div>
            <dt className="uppercase tracking-wider text-slate-400">Logements</dt>
            <dd className="mt-0.5 font-medium text-slate-800">
              {operation.total_housing_units != null ? operation.total_housing_units.toLocaleString('fr-FR') : '—'}
            </dd>
          </div>
        </dl>
      </div>

      <div className="flex items-center gap-2 border-t border-slate-100 px-5 py-3 text-xs text-slate-600">
        <CalendarDays size={14} className="shrink-0 text-teal-700" />
        <span className="truncate">
          Prévue <span className="font-medium text-slate-800">{shortDate(operation.expected_delivery_date)}</span> · Réelle{' '}
          <span className="font-medium text-slate-800">{shortDate(operation.actual_delivery_date)}</span>
        </span>
      </div>
    </article>
  );
}
