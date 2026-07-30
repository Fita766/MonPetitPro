import type { CtxStat } from "../../lib/statistics";

function number(value: number | null, decimals = 0) {
  return value == null
    ? "—"
    : value.toLocaleString("fr-FR", { maximumFractionDigits: decimals });
}

export default function CtxStats({
  rows,
  year,
  onDetail,
}: {
  rows: CtxStat[];
  year: number;
  onDetail?: (title: string, ids: string[]) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="min-w-[900px] w-full text-left text-xs">
        <thead className="border-b border-teal-200 bg-teal-50 text-teal-950">
          <tr>
            {[
              "CTX",
              `Opérations livrées ${year}`,
              `Logements livrés ${year}`,
              "Réserves",
              "Réserves / logement",
              "Levée moyenne (jours)",
              `GPA moy. opérations ${year - 1}`,
            ].map((label) => (
              <th
                key={label}
                className="px-4 py-3 font-medium uppercase tracking-wider"
              >
                {label}
              </th>
            ))}
            <th className="px-4 py-3 font-medium uppercase tracking-wider">Détail</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name} className="border-b border-slate-100">
              <td className="px-4 py-4 font-medium text-slate-950">
                {row.name}
              </td>
              <td className="px-4 py-4">{row.deliveredOperations}</td>
              <td className="px-4 py-4 font-medium">{row.deliveredHousing}</td>
              <td className="px-4 py-4">{row.reservations}</td>
              <td className="px-4 py-4">
                {number(row.reservationsPerHousing, 2)}
              </td>
              <td className="px-4 py-4">
                {number(row.averageClearanceDays, 1)}
              </td>
              <td className="px-4 py-4">
                {number(row.previousYearAverageGpa, 1)}
              </td>
              <td className="px-4 py-4"><button type="button" onClick={() => onDetail?.(`CTX · ${row.name}`, row.operationIds)} className="text-teal-700 underline">Voir le détail</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
