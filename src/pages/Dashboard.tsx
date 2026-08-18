import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowUpDown,
  Building2,
  CalendarDays,
  Edit3,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useStore } from "../store/useStore";
import { broadActionGranted, permissionGranted } from "../lib/accessControl";
import { getStageConfig } from "../lib/stage";
import {
  filterOperations,
  sortOperations,
  uniqueFilterValues,
  type FilterableOperation,
  type OperationFilters,
} from "../lib/operationFilters";
import {
  exportOperationsExcel,
  exportOperationsPdf,
  formatOperationValue,
  OPERATION_EXPORT_REGISTRY,
  OPERATION_COLUMNS,
} from "../lib/operationExport";
import { authorizedColumns } from "../lib/exportRegistry";
import MultiSelectFilter from "../components/filters/MultiSelectFilter";
import ColumnPicker from "../components/operations/ColumnPicker";
import type { OperationStage } from "../types/domain";
import { triggerSuccessToast } from "../lib/toastUtils";
import { buildAlerts, type AlertCondition, type AlertOperation } from "../lib/alerts";
import UpcomingAlerts from "../components/dashboard/UpcomingAlerts";
import ExportColumnDialog from "../components/exports/ExportColumnDialog";
import { alertToIcsEvent, buildIcs, downloadIcs } from "../lib/ics";
import KpiCards from "../components/dashboard/KpiCards";
import { buildKpis, countActiveFilters } from "../lib/dashboardKpis";

interface DashboardOperation extends FilterableOperation {
  id: string;
  name: string;
  stage: OperationStage | null;
  project_manager: string;
  operations_manager: string | null;
  operation_type: string;
  promoter_name: string | null;
  department: string | null;
  commune: string | null;
  certification: string | null;
  total_housing_units: number | null;
  final_budget: number | null;
  expected_delivery_date: string | null;
  actual_delivery_date: string | null;
  observations?: { responsible_person: string | null }[];
}

const EMPTY_FILTERS: OperationFilters = {
  stages: [],
  departments: [],
  communes: [],
  cops: [],
  ctxs: [],
  promoters: [],
  operationTypes: [],
  labels: [],
  deliveryFrom: "",
  deliveryTo: "",
  query: "",
};

const DEFAULT_COLUMNS = [
  "stage",
  "name",
  "department",
  "commune",
  "total_housing_units",
  "operations_manager",
  "project_manager",
  "operation_type",
  "promoter_name",
  "expected_delivery_date",
  "actual_delivery_date",
];

function shortDate(value: string | null | undefined): string {
  return value
    ? new Date(`${value}T12:00:00`).toLocaleDateString("fr-FR")
    : "Non renseignée";
}

export default function Dashboard() {
  const navigate = useNavigate();
  const permissions = useStore((state) => state.permissions);
  const user = useStore((state) => state.user);
  const [operations, setOperations] = useState<DashboardOperation[]>([]);
  const [conditions, setConditions] = useState<AlertCondition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<OperationFilters>(EMPTY_FILTERS);
  const [columns, setColumns] = useState<string[]>(DEFAULT_COLUMNS);
  const [sort, setSort] = useState<{
    key: keyof DashboardOperation;
    direction: "asc" | "desc";
  }>({ key: "name", direction: "asc" });

  const fetchOperations = async () => {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from("operations")
      .select("*, observations(responsible_person)")
      .order("name");
    if (fetchError) setError(fetchError.message);
    else setOperations((data as DashboardOperation[] | null) ?? []);
    const { data: conditionData, error: conditionError } = await supabase
      .from("suspensive_conditions")
      .select("*");
    if (!conditionError) setConditions((conditionData as AlertCondition[] | null) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void supabase
      .from("operations")
      .select("*, observations(responsible_person)")
      .order("name")
      .then(({ data, error: fetchError }) => {
        if (fetchError) setError(fetchError.message);
        else setOperations((data as DashboardOperation[] | null) ?? []);
        setLoading(false);
      });
    void supabase
      .from("suspensive_conditions")
      .select("*")
      .then(({ data: conditionData, error: conditionError }) => {
        if (!conditionError) setConditions((conditionData as AlertCondition[] | null) ?? []);
      });
  }, []);

  const options = useMemo(
    () => ({
      stages: uniqueFilterValues(operations, "stage"),
      departments: uniqueFilterValues(operations, "department"),
      communes: uniqueFilterValues(operations, "commune"),
      cops: uniqueFilterValues(operations, "operations_manager"),
      ctxs: uniqueFilterValues(operations, "project_manager"),
      promoters: uniqueFilterValues(operations, "promoter_name"),
      operationTypes: uniqueFilterValues(operations, "operation_type"),
      labels: [
        ...new Set([
          ...uniqueFilterValues(operations, "certification"),
          ...uniqueFilterValues(operations, "thermal_regulation"),
        ]),
      ].sort(),
    }),
    [operations],
  );

  const filtered = useMemo(
    () =>
      sortOperations(
        filterOperations(operations, filters),
        sort.key,
        sort.direction,
      ),
    [filters, operations, sort],
  );
  const selectedColumns = columns.flatMap((key) => {
    const column = OPERATION_COLUMNS.find((candidate) => candidate.key === key);
    return column ? [column] : [];
  });
  const exportColumns = useMemo(
    () => authorizedColumns(OPERATION_EXPORT_REGISTRY, permissions),
    [permissions],
  );
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const alerts = useMemo(
    () => buildAlerts(operations as unknown as AlertOperation[], conditions, todayIso),
    [operations, conditions, todayIso],
  );
  const kpis = useMemo(() => buildKpis(operations, alerts), [operations, alerts]);
  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);
  const exportAlertsToOutlook = (items: typeof alerts, filename: string) => {
    if (items.length === 0) return;
    downloadIcs(filename, buildIcs(items.map(alertToIcsEvent), 'Échéances MonPetitPro'));
    triggerSuccessToast(
      user?.email,
      `${items.length} échéance${items.length > 1 ? 's' : ''} exportée${items.length > 1 ? 's' : ''} vers Outlook. Rappels J-30 et J-15 inclus.`,
    );
  };

  const setFilter = <K extends keyof OperationFilters>(
    key: K,
    value: OperationFilters[K],
  ) => setFilters((current) => ({ ...current, [key]: value }));
  const toggleSort = (key: keyof DashboardOperation) =>
    setSort((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));

  const handleDelete = async (
    event: React.MouseEvent,
    operation: DashboardOperation,
  ) => {
    event.stopPropagation();
    if (!permissionGranted(permissions, 'operations.delete')) return;
    if (
      !window.confirm(
        `Supprimer « ${operation.name} » et toutes ses observations ?`,
      )
    )
      return;
    const { error: observationsError } = await supabase
      .from("observations")
      .delete()
      .eq("operation_id", operation.id);
    if (observationsError) {
      setError(observationsError.message);
      return;
    }
    const { error: operationError } = await supabase
      .from("operations")
      .delete()
      .eq("id", operation.id);
    if (operationError) setError(operationError.message);
    else {
      triggerSuccessToast(user?.email, "Opération supprimée.");
      await fetchOperations();
    }
  };

  if (loading)
    return (
      <div className="flex min-h-[55vh] items-center justify-center text-slate-500">
        Chargement des opérations…
      </div>
    );

  return (
    <div className="mx-auto max-w-[1700px] pb-12">
      <header className="mb-7 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950">
            Opérations
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {filtered.length} affichée{filtered.length > 1 ? "s" : ""} sur{" "}
            {operations.length} · filtres cumulables
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ColumnPicker
            columns={OPERATION_COLUMNS}
            selected={columns}
            onChange={setColumns}
          />
          {permissionGranted(permissions, 'operations.export') && <ExportColumnDialog
            columns={exportColumns}
            storageKey="mpp-export-columns-operations"
            defaultKeys={DEFAULT_COLUMNS}
            onExcel={(keys) => exportOperationsExcel(filtered, keys)}
            onPdf={(keys) => exportOperationsPdf(filtered, keys)}
          />}
          {permissionGranted(permissions, 'operations.create') && (
            <button
              type="button"
              onClick={() => navigate("/operations/new")}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-800 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-teal-900"
            >
              <Plus size={17} /> Nouvelle opération
            </button>
          )}
        </div>
      </header>

      <KpiCards kpis={kpis} />

      {error && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-900"
        >
          {error}
        </div>
      )}

      <UpcomingAlerts
        alerts={alerts}
        onOpenOperation={(operationId) => navigate(`/operations/${operationId}`)}
        onExportAlert={permissionGranted(permissions, 'calendar.export')
          ? (alert) => exportAlertsToOutlook([alert], `monpetitpro-${alert.id}.ics`)
          : undefined}
        onExportAll={permissionGranted(permissions, 'calendar.export')
          ? (items) => exportAlertsToOutlook(items, 'monpetitpro-echeances.ics')
          : undefined}
      />

      <div className="mb-6 rounded-2xl border border-slate-200 bg-[#f3f5f1] p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[260px] flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
            />
            <input
              value={filters.query}
              onChange={(event) => setFilter("query", event.target.value)}
              placeholder="Nom, ville, CTX, COP, promoteur…"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-teal-600"
            />
          </div>
          <MultiSelectFilter
            label="Stades"
            options={options.stages}
            values={filters.stages}
            onChange={(value) => setFilter("stages", value)}
          />
          <MultiSelectFilter
            label="Départements"
            options={options.departments}
            values={filters.departments}
            onChange={(value) => setFilter("departments", value)}
          />
          <MultiSelectFilter
            label="Communes"
            options={options.communes}
            values={filters.communes}
            onChange={(value) => setFilter("communes", value)}
          />
          <MultiSelectFilter
            label="COP"
            options={options.cops}
            values={filters.cops}
            onChange={(value) => setFilter("cops", value)}
          />
          <MultiSelectFilter
            label="CTX"
            options={options.ctxs}
            values={filters.ctxs}
            onChange={(value) => setFilter("ctxs", value)}
          />
          <MultiSelectFilter
            label="Promoteurs"
            options={options.promoters}
            values={filters.promoters}
            onChange={(value) => setFilter("promoters", value)}
          />
          <MultiSelectFilter
            label="Types"
            options={options.operationTypes}
            values={filters.operationTypes}
            onChange={(value) => setFilter("operationTypes", value)}
          />
          <MultiSelectFilter
            label="Labels"
            options={options.labels}
            values={filters.labels}
            onChange={(value) => setFilter("labels", value)}
          />
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-500">
            Du{" "}
            <input
              aria-label="Livraison à partir du"
              type="date"
              value={filters.deliveryFrom}
              onChange={(event) =>
                setFilter("deliveryFrom", event.target.value)
              }
              className="outline-none"
            />
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-500">
            Au{" "}
            <input
              aria-label="Livraison jusqu’au"
              type="date"
              value={filters.deliveryTo}
              onChange={(event) => setFilter("deliveryTo", event.target.value)}
              className="outline-none"
            />
          </label>
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
              {activeFilterCount} filtre{activeFilterCount > 1 ? "s" : ""} actif{activeFilterCount > 1 ? "s" : ""}
            </span>
          )}
          <button
            type="button"
            onClick={() => setFilters(EMPTY_FILTERS)}
            className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 hover:text-teal-800"
            title="Réinitialiser"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {operations.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-16 text-center">
          <Building2 className="mx-auto text-slate-300" size={42} />
          <h2 className="mt-4 text-xl font-medium text-slate-800">
            Aucune opération
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Créez la première fiche pour démarrer le suivi.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-14 text-center text-slate-500">
          Aucune opération ne correspond à tous les filtres sélectionnés.
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left text-xs">
                <thead className="border-b border-teal-200 bg-teal-50 text-teal-950">
                  <tr>
                    {selectedColumns.map((column) => (
                      <th
                        key={column.key}
                        className="whitespace-nowrap px-3 py-3 font-medium uppercase tracking-wider"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            toggleSort(column.key as keyof DashboardOperation)
                          }
                          className="inline-flex items-center gap-1.5"
                        >
                          {column.label}
                          <ArrowUpDown size={11} className="text-teal-300" />
                        </button>
                      </th>
                    ))}
                    <th className="sticky right-0 bg-teal-50 px-3 py-3 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((operation) => {
                    const stage = getStageConfig(operation.stage);
                    return (
                      <tr
                        key={operation.id}
                        onClick={() => navigate(`/operations/${operation.id}`)}
                        className="cursor-pointer border-b border-slate-100 transition hover:bg-teal-50/40"
                      >
                        {selectedColumns.map((column) => (
                          <td
                            key={column.key}
                            className="max-w-[260px] px-3 py-3 font-medium text-slate-700"
                          >
                            {column.key === "stage" ? (
                              <span
                                style={{
                                  backgroundColor: stage.color,
                                  color: stage.textColor,
                                }}
                                className="inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-medium"
                              >
                                {operation.stage
                                  ? `${operation.stage} · ${stage.label}`
                                  : stage.label}
                              </span>
                            ) : column.key === "name" ? (
                              <span className="font-medium text-slate-950">
                                {operation.name}
                              </span>
                            ) : (
                              formatOperationValue(operation, column) || (
                                <span className="text-slate-300">—</span>
                              )
                            )}
                          </td>
                        ))}
                        <td className="sticky right-0 bg-white px-3 py-2">
                          <div className="flex justify-end gap-1">
                            {broadActionGranted(permissions, 'contribute') && (
                              <button
                                type="button"
                                aria-label="Modifier"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  navigate(`/operations/${operation.id}/edit`);
                                }}
                                className="rounded-lg p-2 text-slate-400 hover:bg-teal-50 hover:text-teal-700"
                              >
                                <Edit3 size={15} />
                              </button>
                            )}
                            {permissionGranted(permissions, 'operations.delete') && (
                              <button
                                type="button"
                                aria-label="Supprimer"
                                onClick={(event) =>
                                  void handleDelete(event, operation)
                                }
                                className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:hidden">
            {filtered.map((operation) => {
              const stage = getStageConfig(operation.stage);
              return (
                <article
                  key={operation.id}
                  onClick={() => navigate(`/operations/${operation.id}`)}
                  className="cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <div
                    style={{
                      backgroundColor: stage.color,
                      color: stage.textColor,
                    }}
                    className="px-5 py-3"
                  >
                    <p className="text-[10px] font-medium uppercase tracking-[0.2em]">
                      Stade {operation.stage ?? "—"} · {stage.label}
                    </p>
                  </div>
                  <div className="p-5">
                    <h2 className="break-words text-xl font-medium text-slate-950">
                      {operation.name}
                    </h2>
                    <p className="mt-2 text-sm font-medium text-slate-500">
                      {[operation.department, operation.commune]
                        .filter(Boolean)
                        .join(" · ") || "Localisation non renseignée"}
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="font-medium uppercase text-slate-400">
                          CTX
                        </p>
                        <p className="mt-1 font-medium text-slate-800">
                          {operation.project_manager || "—"}
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="font-medium uppercase text-slate-400">
                          COP
                        </p>
                        <p className="mt-1 font-medium text-slate-800">
                          {operation.operations_manager || "—"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4 text-xs text-slate-600">
                      <CalendarDays size={14} className="text-teal-700" />
                      <span>
                        Prévue {shortDate(operation.expected_delivery_date)}
                      </span>
                      <span>·</span>
                      <span>
                        Réelle {shortDate(operation.actual_delivery_date)}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
