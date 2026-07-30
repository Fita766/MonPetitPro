import type { PromoterStat } from "../../lib/statistics";

function number(value: number | null, decimals = 0) {
  return value == null
    ? "—"
    : value.toLocaleString("fr-FR", { maximumFractionDigits: decimals });
}

export default function PromoterStats({ rows, onDetail }: { rows: PromoterStat[]; onDetail?: (title: string, ids: string[]) => void }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="min-w-[1400px] w-full text-left text-xs">
        <thead className="border-b border-teal-200 bg-teal-50 text-teal-950">
          <tr>
            {[
              "Promoteur",
              "Opérations",
              "Logements",
              "Collectifs",
              "Individuels",
              "Réserves",
              "Réserves / logt",
              "Réserves / op.",
              "Levée moyenne (j)",
              "Op. en retard",
              "Logt en retard",
              "DO",
              "Détail",
            ].map((label) => (
              <th
                key={label}
                className="px-3 py-3 font-medium uppercase tracking-wider"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name} className="border-b border-slate-100">
              <td className="px-3 py-3 font-medium text-slate-950">
                {row.name}
              </td>
              <td className="px-3 py-3">{row.operations}</td>
              <td className="px-3 py-3 font-medium">{number(row.housing)}</td>
              <td className="px-3 py-3">{number(row.collectiveHousing)}</td>
              <td className="px-3 py-3">{number(row.individualHousing)}</td>
              <td className="px-3 py-3">{number(row.reservations)}</td>
              <td className="px-3 py-3">
                {number(row.reservationsPerHousing, 2)}
              </td>
              <td className="px-3 py-3">
                {number(row.reservationsPerOperation, 1)}
              </td>
              <td className="px-3 py-3">
                {number(row.averageClearanceDays, 1)}
              </td>
              <td className="px-3 py-3 text-rose-700">{row.lateOperations}</td>
              <td className="px-3 py-3 text-rose-700">{row.lateHousing}</td>
              <td className="px-3 py-3">{row.doOperations}</td>
              <td className="px-3 py-3"><button type="button" onClick={() => onDetail?.(`Promoteur · ${row.name}`, row.operationIds)} className="text-teal-700 underline">Voir le détail</button></td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={13} className="p-10 text-center text-slate-400">
                Aucune livraison promoteur sur la période.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
