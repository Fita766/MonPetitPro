import { useState } from 'react';
import { AlertTriangle, CalendarClock, CalendarPlus, ChevronDown, ChevronRight } from 'lucide-react';
import type { OperationAlert } from '../../lib/alerts';

interface UpcomingAlertsProps {
  alerts: OperationAlert[];
  onOpenOperation: (operationId: string) => void;
  onExportAlert?: (alert: OperationAlert) => void;
  onExportAll?: (alerts: OperationAlert[]) => void;
}

const GROUPS = [
  { status: 'overdue', label: 'Échéances dépassées', tone: 'border-red-200 bg-red-50', icon: 'text-red-700' },
  { status: 'within15', label: 'Dans les 15 jours', tone: 'border-amber-200 bg-amber-50', icon: 'text-amber-700' },
  { status: 'within30', label: 'Dans les 30 jours', tone: 'border-teal-200 bg-teal-50', icon: 'text-teal-700' },
] as const;

export default function UpcomingAlerts({ alerts, onOpenOperation, onExportAlert, onExportAll }: UpcomingAlertsProps) {
  // Replié par défaut : l'encart reste un bandeau compact qui se déplie à la demande.
  const [collapsed, setCollapsed] = useState(true);

  if (alerts.length === 0) {
    return <section className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900">
      <CalendarClock size={20} /> Aucune échéance non réalisée dans les 30 prochains jours.
    </section>;
  }
  return (
    <section className="mb-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          aria-expanded={!collapsed}
          className="flex items-center gap-2 text-left"
        >
          <AlertTriangle size={19} className="text-amber-700" />
          <h2 className="font-medium text-slate-950">Échéances à surveiller</h2>
          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">{alerts.length}</span>
          <ChevronDown size={18} className={`text-slate-400 transition-transform ${collapsed ? '' : 'rotate-180'}`} />
        </button>
        {onExportAll && <button
          type="button"
          aria-label="Exporter toutes vers Outlook"
          onClick={() => onExportAll(alerts)}
          className="inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-medium text-teal-900 hover:bg-teal-100"
        >
          <CalendarPlus size={15} /> Exporter toutes vers Outlook
        </button>}
      </div>
      {!collapsed && (
        <div className="grid gap-3 border-t border-slate-200 bg-[#f8faf7] p-4 xl:grid-cols-3">
          {GROUPS.map((group) => {
            const items = alerts.filter((alert) => alert.status === group.status);
            return <article key={group.status} className={`overflow-hidden rounded-2xl border ${group.tone}`}>
              <header className="flex items-center justify-between px-4 py-3">
                <h3 className={`text-sm font-medium ${group.icon}`}>{group.label}</h3>
                <span className="text-xs text-slate-500">{items.length}</span>
              </header>
              <div className="divide-y divide-slate-200 bg-white/70">
                {items.length === 0 && <p className="p-4 text-xs text-slate-500">Aucune échéance.</p>}
                {items.slice(0, 6).map((alert) => <div key={alert.id} className="p-2">
                  <button type="button"
                    onClick={() => onOpenOperation(alert.operationId)}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-white">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-900">{alert.operationName}</span>
                      <span className="block truncate text-xs text-slate-500">{alert.label} · {new Date(`${alert.date}T12:00:00`).toLocaleDateString('fr-FR')}</span>
                    </span>
                    <span className="text-xs font-medium text-slate-700">{alert.days < 0 ? `J+${Math.abs(alert.days)}` : `J-${alert.days}`}</span>
                    <ChevronRight size={15} className="text-slate-400" />
                  </button>
                  {onExportAlert && <button
                    type="button"
                    aria-label={`Ajouter ${alert.label} à Outlook`}
                    onClick={() => onExportAlert(alert)}
                    className="ml-2 mt-1 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] font-medium text-teal-800 hover:bg-teal-50"
                  >
                    <CalendarPlus size={13} /> Ajouter à Outlook
                  </button>}
                </div>)}
              </div>
            </article>;
          })}
        </div>
      )}
    </section>
  );
}
