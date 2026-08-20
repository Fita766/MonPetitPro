import { AlertTriangle, Building2, Coins, Home } from 'lucide-react';
import type { DashboardKpis } from '../../lib/dashboardKpis';

interface KpiHeroProps {
  kpis: DashboardKpis;
}

const EUR = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const display = (value: number | null, formatter: (value: number) => string) =>
  value == null ? '—' : formatter(value);

/**
 * Bandeau de pilotage du centre de pilotage.
 * Une carte « héro » met en avant le total d'opérations, les logements et le
 * budget ; la tuile d'alerte voisine attire l'œil sur les échéances à traiter.
 * Agencement volontairement différent de l'ancienne ligne de 4 cartes identiques.
 */
export default function KpiHero({ kpis }: KpiHeroProps) {
  return (
    <section className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-3">
      {/* Carte héro : total opérations, mise en avant. */}
      <div className="flex flex-col justify-between gap-6 rounded-2xl bg-gradient-to-br from-teal-800 to-teal-950 p-6 text-white shadow-md sm:col-span-2">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-teal-100/90">
            <Building2 size={15} /> Pilotage des opérations
          </span>
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-teal-50">
            {new Date().toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </span>
        </div>
        <div>
          <p className="text-6xl font-semibold tracking-tight">
            {kpis.operations.toLocaleString('fr-FR')}
          </p>
          <p className="mt-1 text-sm text-teal-100/90">
            opérations suivies sur le territoire
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 border-t border-white/15 pt-4 text-sm">
          <div className="flex items-center gap-2.5">
            <Home size={17} className="text-teal-200" />
            <span>
              <span className="block text-xl font-medium">
                {display(kpis.housingUnits, (value) => value.toLocaleString('fr-FR'))}
              </span>
              <span className="text-xs text-teal-100/80">logements</span>
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <Coins size={17} className="text-teal-200" />
            <span>
              <span className="block text-xl font-medium">{display(kpis.finalBudget, EUR.format)}</span>
              <span className="text-xs text-teal-100/80">budget atterrissage</span>
            </span>
          </div>
        </div>
      </div>

      {/* Tuile alertes actives. */}
      <div className="flex flex-col justify-between rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
        <div className="flex items-start justify-between">
          <AlertTriangle className="text-amber-700" />
          <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-amber-700">
            à traiter
          </span>
        </div>
        <div>
          <p className="text-5xl font-semibold">{kpis.activeAlerts.toLocaleString('fr-FR')}</p>
          <p className="mt-1 text-sm font-medium text-amber-900">alertes actives</p>
        </div>
        <p className="text-xs text-amber-700/80">échéances non réalisées dans les 30 prochains jours</p>
      </div>
    </section>
  );
}
