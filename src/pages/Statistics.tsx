import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Building2,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  TriangleAlert,
} from "lucide-react";
import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "../lib/supabase";
import { useStore } from "../store/useStore";
import { permissionGranted } from "../lib/accessControl";
import {
  aggregateBudget,
  aggregateCtxStats,
  aggregatePromoters,
  buildDeliveryStats,
  buildWorksOrderStats,
  type StatisticsBasis,
  type StatisticsOperation,
} from "../lib/statistics";
import {
  getObservationStatus,
  normalizeObservation,
  type ObservationRow,
} from "../lib/observationStatus";
import MultiSelectFilter from "../components/filters/MultiSelectFilter";
import PromoterStats from "../components/statistics/PromoterStats";
import CtxStats from "../components/statistics/CtxStats";
import DeliveryStats from "../components/statistics/DeliveryStats";
import BudgetStats from "../components/statistics/BudgetStats";
import StatisticsDetailDialog from "../components/statistics/StatisticsDetailDialog";

type StatisticsTab = "overview" | "promoters" | "ctx" | "deliveries" | "works_orders" | "budget";
type StatsObservation = ObservationRow & { status: string };

const TABS: { id: StatisticsTab; label: string }[] = [
  { id: "overview", label: "Vue d’ensemble" },
  { id: "promoters", label: "Promoteurs" },
  { id: "ctx", label: "CTX" },
  { id: "deliveries", label: "Livraisons" },
  { id: "works_orders", label: "OS travaux" },
  { id: "budget", label: "Budget" },
];

export default function Statistics() {
  const permissions = useStore((state) => state.permissions);
  const currentYear = new Date().getFullYear();
  const [operations, setOperations] = useState<StatisticsOperation[]>([]);
  const [observations, setObservations] = useState<StatsObservation[]>([]);
  const [selectedYears, setSelectedYears] = useState<string[]>([
    String(currentYear),
  ]);
  const [tab, setTab] = useState<StatisticsTab>("overview");
  const [budgetBasis, setBudgetBasis] = useState<StatisticsBasis>("delivery");
  const [detail, setDetail] = useState<{ title: string; ids: string[]; basis: StatisticsBasis } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      supabase.from("operations").select("*,operation_budget_lines(*)"),
      supabase.from("observations").select("*"),
    ]).then(([operationResult, observationResult]) => {
      if (cancelled) return;
      const firstError = operationResult.error || observationResult.error;
      if (firstError) setError(firstError.message);
      else {
        setOperations(
          (operationResult.data as StatisticsOperation[] | null) ?? [],
        );
        setObservations(
          ((observationResult.data ?? []) as StatsObservation[]).map(
            normalizeObservation,
          ),
        );
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const years = useMemo(() => {
    const values = new Set<string>([String(currentYear)]);
    operations.forEach((operation) => {
      for (const date of [
        operation.actual_delivery_date, operation.expected_delivery_date,
        operation.works_order_actual_date, operation.works_order_expected_date,
      ]) if (date) values.add(date.slice(0, 4));
    });
    return [...values].sort((left, right) => Number(right) - Number(left));
  }, [currentYear, operations]);
  const numericYears = useMemo(
    () => (selectedYears.length ? selectedYears.map(Number) : [currentYear]),
    [currentYear, selectedYears],
  );
  const focusYear = Math.max(...numericYears);
  const promoters = useMemo(
    () => aggregatePromoters(operations, numericYears),
    [numericYears, operations],
  );
  const ctxRows = useMemo(
    () => aggregateCtxStats(operations, focusYear),
    [focusYear, operations],
  );
  const deliveryRows = useMemo(
    () => buildDeliveryStats(operations, focusYear),
    [focusYear, operations],
  );
  const worksOrderRows = useMemo(
    () => buildWorksOrderStats(operations, focusYear),
    [focusYear, operations],
  );
  const budget = useMemo(
    () => aggregateBudget(operations, numericYears, budgetBasis),
    [budgetBasis, numericYears, operations],
  );
  const completedObservations = observations.filter((observation) =>
    ["Terminé", "Réussi"].includes(getObservationStatus(observation)),
  ).length;
  const lateObservations = observations.filter(
    (observation) => getObservationStatus(observation) === "En retard",
  ).length;
  const totalHousing = operations.reduce(
    (sum, operation) => sum + (operation.total_housing_units ?? 0),
    0,
  );

  const exportData = () => {
    if (tab === "promoters")
      return {
        headers: [
          "Promoteur",
          "Opérations",
          "Logements",
          "Réserves",
          "Réserves/logt",
          "Levée moyenne",
        ],
        rows: promoters.map((row) => [
          row.name,
          row.operations,
          row.housing,
          row.reservations,
          row.reservationsPerHousing ?? "",
          row.averageClearanceDays ?? "",
        ]),
      };
    if (tab === "ctx")
      return {
        headers: [
          "CTX",
          "Opérations",
          "Logements",
          "Réserves",
          "Réserves/logt",
          "Levée moyenne",
          `GPA ${focusYear - 1}`,
        ],
        rows: ctxRows.map((row) => [
          row.name,
          row.deliveredOperations,
          row.deliveredHousing,
          row.reservations,
          row.reservationsPerHousing ?? "",
          row.averageClearanceDays ?? "",
          row.previousYearAverageGpa ?? "",
        ]),
      };
    if (tab === "deliveries")
      return {
        headers: [
          "Mois",
          "Prévisionnel",
          "Réel",
          "Prévisionnel cumulé",
          "Réel cumulé",
        ],
        rows: deliveryRows.map((row) => [
          row.label,
          row.expected,
          row.actual,
          row.expectedCumulative,
          row.actualCumulative,
        ]),
      };
    if (tab === "works_orders")
      return {
        headers: ["Mois", "Prévisionnel", "Réel", "Prévisionnel cumulé", "Réel cumulé"],
        rows: worksOrderRows.map((row) => [row.label, row.expected, row.actual, row.expectedCumulative, row.actualCumulative]),
      };
    if (tab === "budget")
      return {
        headers: ["Opérations", "Budget initial", "Atterrissage", "Écart"],
        rows: [
          [
            budget.operations,
            budget.initialBudget,
            budget.finalBudget,
            budget.variance,
          ],
        ],
      };
    return {
      headers: ["Indicateur", "Valeur"],
      rows: [
        ["Opérations", operations.length],
        ["Logements", totalHousing],
        ["Observations", observations.length],
        ["Observations terminées", completedObservations],
        ["Observations en retard", lateObservations],
      ],
    };
  };

  const exportExcel = async () => {
    const data = exportData();
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Statistiques");
    sheet.addRow(data.headers);
    data.rows.forEach((row) => sheet.addRow(row));
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0F766E" },
    };
    sheet.columns.forEach((column) => {
      column.width = 22;
    });
    const buffer = await workbook.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buffer]));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `statistiques-${tab}-${numericYears.join("-")}.xlsx`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const exportPdf = () => {
    const data = exportData();
    const document = new jsPDF({ orientation: "landscape" });
    document.setFontSize(16);
    document.text(
      `Statistiques MonPetitPro — ${numericYears.join(", ")}`,
      14,
      15,
    );
    autoTable(document, {
      startY: 21,
      head: [data.headers],
      body: data.rows,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [15, 118, 110] },
    });
    document.save(`statistiques-${tab}-${numericYears.join("-")}.pdf`);
  };

  if (loading)
    return (
      <div className="flex min-h-[55vh] items-center justify-center text-slate-500">
        Calcul des statistiques…
      </div>
    );

  return (
    <div className="mx-auto max-w-[1700px] pb-12">
      <header className="mb-7 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-teal-700">
            Indicateurs DMO
          </p>
          <h1 className="mt-1 text-4xl font-semibold tracking-tight text-slate-950">
            Statistiques
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Livraisons, promoteurs, réserves, GPA et trajectoire budgétaire.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <MultiSelectFilter
            label="Années"
            options={years}
            values={selectedYears}
            onChange={setSelectedYears}
          />
          {permissionGranted(permissions, 'statistics.export') && <><button
            type="button"
            onClick={() => void exportExcel()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium"
          >
            <FileSpreadsheet size={15} /> Excel
          </button>
          <button
            type="button"
            onClick={exportPdf}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium"
          >
            <Download size={15} /> PDF
          </button></>}
        </div>
      </header>
      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-900">
          {error}
        </div>
      )}
      <div className="mb-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5">
        <div className="flex min-w-max gap-1">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`rounded-xl px-4 py-2.5 text-sm font-medium ${tab === item.id ? "bg-teal-700 text-white shadow-sm" : "text-slate-500 hover:bg-slate-100"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "overview" && (
        <div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border border-teal-200 bg-teal-50 p-5 text-teal-950">
              <Building2 className="text-teal-700" />
              <p className="mt-4 text-3xl font-medium">{operations.length}</p>
              <p className="text-xs text-slate-400">opérations</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <BarChart3 className="text-teal-700" />
              <p className="mt-4 text-3xl font-medium">
                {totalHousing.toLocaleString("fr-FR")}
              </p>
              <p className="text-xs text-slate-500">logements suivis</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <FileSpreadsheet className="text-teal-600" />
              <p className="mt-4 text-3xl font-medium">{observations.length}</p>
              <p className="text-xs text-slate-500">observations</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <CheckCircle2 className="text-emerald-700" />
              <p className="mt-4 text-3xl font-medium text-emerald-950">
                {completedObservations}
              </p>
              <p className="text-xs text-emerald-700">terminées</p>
            </div>
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
              <TriangleAlert className="text-rose-700" />
              <p className="mt-4 text-3xl font-medium text-rose-950">
                {lateObservations}
              </p>
              <p className="text-xs text-rose-700">en retard</p>
            </div>
          </div>
          <div className="mt-6">
            <DeliveryStats rows={deliveryRows} onDetail={(title, ids) => setDetail({ title, ids, basis: "delivery" })} />
          </div>
        </div>
      )}
      {tab === "promoters" && <PromoterStats rows={promoters} onDetail={(title, ids) => setDetail({ title, ids, basis: "delivery" })} />}
      {tab === "ctx" && <CtxStats rows={ctxRows} year={focusYear} onDetail={(title, ids) => setDetail({ title, ids, basis: "delivery" })} />}
      {tab === "deliveries" && <DeliveryStats rows={deliveryRows} onDetail={(title, ids) => setDetail({ title, ids, basis: "delivery" })} />}
      {tab === "works_orders" && <DeliveryStats title="OS travaux" rows={worksOrderRows} onDetail={(title, ids) => setDetail({ title, ids, basis: "works_order" })} />}
      {tab === "budget" && <div>
        <div className="mb-4 flex w-fit rounded-xl bg-slate-100 p-1">
          <button type="button" onClick={() => setBudgetBasis("delivery")} className={`rounded-lg px-4 py-2 text-xs ${budgetBasis === "delivery" ? "bg-white shadow-sm" : "text-slate-500"}`}>Par livraison</button>
          <button type="button" onClick={() => setBudgetBasis("works_order")} className={`rounded-lg px-4 py-2 text-xs ${budgetBasis === "works_order" ? "bg-white shadow-sm" : "text-slate-500"}`}>Par OS travaux</button>
        </div>
        <BudgetStats stats={budget} onDetail={(title, ids) => setDetail({ title, ids, basis: budgetBasis })} />
      </div>}
      {detail && <StatisticsDetailDialog title={detail.title} operationIds={detail.ids} operations={operations} basis={detail.basis} onClose={() => setDetail(null)} />}
    </div>
  );
}
