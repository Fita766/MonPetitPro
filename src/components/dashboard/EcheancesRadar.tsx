import { useState } from 'react';
import { AlertTriangle, CalendarClock, CalendarPlus, Check, ChevronDown, ChevronRight, RotateCcw } from 'lucide-react';
import type { OperationAlert } from '../../lib/alerts';

interface EcheancesRadarProps {
  alerts: OperationAlert[];
  onOpenOperation: (operationId: string) => void;
  onExportAlert?: (alert: OperationAlert) => void;
  onExportAll?: (alerts: OperationAlert[]) => void;
}

const STATUS_TONE: Record<OperationAlert['status'], { bar: string; pill: string; label: string }> = {
  overdue: { bar: 'bg-red-500', pill: 'bg-red-100 text-red-800', label: 'Dépassée' },
  within15: { bar: 'bg-amber-500', pill: 'bg-amber-100 text-amber-800', label: 'Sous 15 j' },
  within30: { bar: 'bg-teal-500', pill: 'bg-teal-100 text-teal-800', label: 'Sous 30 j' },
};

const DISMISSED_KEY = 'mpp-echeances-traitees';

function readDismissed(): string[] {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

/**
 * Radar des échéances : fil vertical unique trié par date, avec barre de
 * statut colorée à gauche. Replié par défaut (bandeau compact) ; chaque
 * échéance peut être marquée « fait » pour être retirée du fil (mémorisé dans
 * le navigateur, réaffichable en un clic).
 */
export default function EcheancesRadar({ alerts, onOpenOperation, onExportAlert, onExportAll }: EcheancesRadarProps) {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>(readDismissed);

  const markDone = (alertId: string) => {
    const next = dismissed.includes(alertId) ? dismissed : [...dismissed, alertId];
    setDismissed(next);
    try {
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
    } catch {
      // navigation privée : la mémorisation est simplement ignorée
    }
  };

  const resetDone = () => {
    setDismissed([]);
    try {
      localStorage.removeItem(DISMISSED_KEY);
    } catch {
      // ignore
    }
  };

  const shownAlerts = alerts.filter((alert) => !dismissed.includes(alert.id));

  if (alerts.length === 0) {
    return (
      <section className="mb-7 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900">
        <CalendarClock size={20} /> Aucune échéance non réalisée dans les 30 prochains jours. Tout est sous contrôle.
      </section>
    );
  }

  const counts = { overdue: 0, within15: 0, within30: 0 };
  for (const alert of shownAlerts) counts[alert.status] += 1;

  return (
    <section className="mb-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="flex flex-wrap items-center gap-3 text-left"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
            <CalendarClock size={20} />
          </span>
          <span>
            <span className="flex items-center gap-2">
              <h2 className="font-medium text-slate-950">Radar des échéances</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{shownAlerts.length}</span>
            </span>
            <span className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-red-500" />{counts.overdue} dépassée{counts.overdue > 1 ? 's' : ''}</span>
              <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-amber-500" />{counts.within15} sous 15 j</span>
              <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-teal-500" />{counts.within30} sous 30 j</span>
            </span>
          </span>
          <ChevronDown size={18} className={`text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
        <div className="flex items-center gap-2">
          {dismissed.length > 0 && (
            <button
              type="button"
              onClick={resetDone}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700"
            >
              <RotateCcw size={12} /> Réafficher les traitées
            </button>
          )}
          {onExportAll && (
            <button
              type="button"
              aria-label="Exporter toutes vers Outlook"
              onClick={() => onExportAll(alerts)}
              className="inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-medium text-teal-900 hover:bg-teal-100"
            >
              <CalendarPlus size={15} /> Exporter toutes vers Outlook
            </button>
          )}
        </div>
      </header>

      {expanded && (
        <div className="border-t border-slate-100">
          {shownAlerts.length === 0 ? (
            <div className="flex flex-col items-start gap-3 px-5 py-6 text-sm text-slate-500">
              <span className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-emerald-600" />
                Toutes les échéances ont été traitées.
              </span>
              <button
                type="button"
                onClick={resetDone}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                <RotateCcw size={13} /> Réafficher toutes
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {shownAlerts.map((alert) => {
                const tone = STATUS_TONE[alert.status];
                return (
                  <li key={alert.id} className="relative flex items-stretch gap-3 px-5 py-3">
                    <span className={`w-1 shrink-0 rounded-full ${tone.bar}`} />
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => onOpenOperation(alert.operationId)}
                        className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 text-left"
                      >
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${tone.pill}`}>{tone.label}</span>
                        <span className="truncate text-sm font-medium text-slate-900">{alert.operationName}</span>
                        <span className="text-xs text-slate-500">
                          {alert.label} · {new Date(`${alert.date}T12:00:00`).toLocaleDateString('fr-FR')}
                        </span>
                        <span className="ml-auto text-xs font-semibold text-slate-700">
                          {alert.days < 0 ? `J+${Math.abs(alert.days)}` : `J-${alert.days}`}
                        </span>
                        <ChevronRight size={15} className="text-slate-300" />
                      </button>
                      {onExportAlert && (
                        <button
                          type="button"
                          aria-label={`Ajouter ${alert.label} à Outlook`}
                          onClick={() => onExportAlert(alert)}
                          className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-medium text-teal-800 hover:bg-teal-50"
                        >
                          <CalendarPlus size={13} /> Ajouter à Outlook
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      aria-label={`Marquer « ${alert.label} » de ${alert.operationName} comme fait`}
                      onClick={() => markDone(alert.id)}
                      title="Marquer comme fait et retirer du radar"
                      className="flex h-8 w-8 shrink-0 items-center justify-center self-center rounded-full border border-emerald-300 text-emerald-700 transition hover:bg-emerald-600 hover:text-white"
                    >
                      <Check size={15} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
