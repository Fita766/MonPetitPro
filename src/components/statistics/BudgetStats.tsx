export default function BudgetStats({
  stats,
  onDetail,
}: {
  stats: {
    operations: number;
    initialBudget: number;
    finalBudget: number;
    variance: number;
    operationsWithInitialBudget: number;
    operationsWithFinalBudget: number;
    operationIds: string[];
  };
  onDetail?: (title: string, ids: string[]) => void;
}) {
  const currency = (value: number) =>
    value.toLocaleString("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    });
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-2xl border border-teal-200 bg-teal-50 p-6 text-teal-950">
        <p className="text-[10px] font-medium uppercase tracking-widest text-teal-700">
          Opérations
        </p>
        <p className="mt-2 text-3xl font-medium">{stats.operations}</p>
        <button type="button" onClick={() => onDetail?.("Budget", stats.operationIds)} className="mt-2 text-xs text-teal-700 underline">Voir le détail</button>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400">
          Budget initial
        </p>
        <p className="mt-2 text-2xl font-medium text-slate-950">
          {currency(stats.initialBudget)}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {stats.operationsWithInitialBudget} budget(s) renseigné(s)
        </p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400">
          Atterrissage
        </p>
        <p className="mt-2 text-2xl font-medium text-slate-950">
          {currency(stats.finalBudget)}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {stats.operationsWithFinalBudget} budget(s) renseigné(s)
        </p>
      </div>
      <div
        className={`rounded-2xl border p-6 ${stats.variance <= 0 ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}
      >
        <p className="text-[10px] font-medium uppercase tracking-widest text-slate-500">
          Écart
        </p>
        <p className="mt-2 text-2xl font-medium text-slate-950">
          {stats.variance > 0 ? "+" : ""}
          {currency(stats.variance)}
        </p>
      </div>
    </div>
  );
}
