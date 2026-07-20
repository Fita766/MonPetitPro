export default function CalendarLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500">
      <span className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-teal-400" /> Prévisionnel /
        butoir
      </span>
      <span className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Réel /
        réalisé
      </span>
      <span className="text-slate-400">
        Le code Excel d’origine apparaît sur chaque événement.
      </span>
    </div>
  );
}
