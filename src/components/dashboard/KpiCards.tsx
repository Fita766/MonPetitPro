import { AlertTriangle, Building2, Coins, Home } from 'lucide-react';
import type { DashboardKpis } from '../../lib/dashboardKpis';

interface KpiCardsProps {
  kpis: DashboardKpis;
}

const EUR = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

export default function KpiCards({ kpis }: KpiCardsProps) {
  const display = (value: number | null, formatter: (value: number) => string) =>
    value == null ? '—' : formatter(value);

  return (
    <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-2xl border border-teal-200 bg-teal-50 p-5 text-teal-950">
        <Building2 className="text-teal-700" />
        <p className="mt-4 text-3xl font-medium">
          {kpis.operations.toLocaleString('fr-FR')}
        </p>
        <p className="text-xs text-slate-400">opérations</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <Home className="text-teal-700" />
        <p className="mt-4 text-3xl font-medium">
          {display(kpis.housingUnits, (value) => value.toLocaleString('fr-FR'))}
        </p>
        <p className="text-xs text-slate-500">logements</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <Coins className="text-teal-600" />
        <p className="mt-4 text-3xl font-medium">
          {display(kpis.finalBudget, (value) => EUR.format(value))}
        </p>
        <p className="text-xs text-slate-500">budget atterrissage</p>
      </div>
      {/* « alertes actives » = toutes les échéances (dépassées + à venir), pas seulement celles en retard. */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <AlertTriangle className="text-amber-700" />
        <p className="mt-4 text-3xl font-medium text-amber-950">
          {kpis.activeAlerts.toLocaleString('fr-FR')}
        </p>
        <p className="text-xs text-amber-700">alertes actives</p>
      </div>
    </div>
  );
}
