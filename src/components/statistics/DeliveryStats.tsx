import type { DeliveryMonthStat } from "../../lib/statistics";

export default function DeliveryStats({ rows }: { rows: DeliveryMonthStat[] }) {
  const maximum = Math.max(
    1,
    ...rows.flatMap((row) => [row.expected, row.actual]),
  );
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="mb-6 flex gap-5 text-xs font-medium text-slate-500">
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-teal-400" /> Prévisionnel
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Réel
        </span>
      </div>
      <div className="grid grid-cols-12 gap-2">
        {rows.map((row) => (
          <div key={row.month} className="flex min-w-0 flex-col items-center">
            <div className="flex h-52 w-full items-end justify-center gap-1 border-b border-slate-200">
              <div
                title={`${row.expected} prévus`}
                style={{
                  height: `${Math.max(row.expected ? 5 : 0, (row.expected / maximum) * 100)}%`,
                }}
                className="w-2.5 rounded-t bg-teal-400 md:w-4"
              />
              <div
                title={`${row.actual} réels`}
                style={{
                  height: `${Math.max(row.actual ? 5 : 0, (row.actual / maximum) * 100)}%`,
                }}
                className="w-2.5 rounded-t bg-emerald-500 md:w-4"
              />
            </div>
            <p className="mt-2 text-[10px] font-medium text-slate-500">
              {row.label}
            </p>
            <p className="mt-1 text-[9px] font-medium text-slate-400">
              {row.expected}/{row.actual}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[700px] text-xs">
          <thead>
            <tr>
              <th className="p-2 text-left">Cumul</th>
              {rows.map((row) => (
                <th key={row.month} className="p-2 text-center">
                  {row.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="bg-teal-50 text-teal-900">
              <th className="p-2 text-left">Prévisionnel</th>
              {rows.map((row) => (
                <td key={row.month} className="p-2 text-center font-medium">
                  {row.expectedCumulative}
                </td>
              ))}
            </tr>
            <tr className="bg-emerald-50 text-emerald-900">
              <th className="p-2 text-left">Réel</th>
              {rows.map((row) => (
                <td key={row.month} className="p-2 text-center font-medium">
                  {row.actualCumulative}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
