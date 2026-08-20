import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Plus } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useStore } from "../store/useStore";
import { broadActionGranted, permissionGranted } from "../lib/accessControl";
import type { OperationStage } from "../types/domain";
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
  OPERATION_EXPORT_REGISTRY,
} from "../lib/operationExport";
import { authorizedColumns } from "../lib/exportRegistry";
import { triggerSuccessToast } from "../lib/toastUtils";
import { buildAlerts, type AlertCondition, type AlertOperation } from "../lib/alerts";
import { alertToIcsEvent, buildIcs, downloadIcs } from "../lib/ics";
import { buildKpis, countActiveFilters } from "../lib/dashboardKpis";
import KpiHero from "../components/dashboard/KpiHero";
import EcheancesRadar from "../components/dashboard/EcheancesRadar";
import FiltersPanel from "../components/dashboard/FiltersPanel";
import OperationCard, { type OperationCardData } from "../components/dashboard/OperationCard";
import ExportColumnDialog from "../components/exports/ExportColumnDialog";

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

const SORT_OPTIONS: { key: keyof DashboardOperation; direction: "asc" | "desc"; label: string }[] = [
  { key: "name", direction: "asc", label: "Nom (A → Z)" },
  { key: "name", direction: "desc", label: "Nom (Z → A)" },
  { key: "stage", direction: "asc", label: "Stade" },
  { key: "expected_delivery_date", direction: "asc", label: "Livraison prévue (proche → loin)" },
  { key: "expected_delivery_date", direction: "desc", label: "Livraison prévue (loin → proche)" },
  { key: "final_budget", direction: "desc", label: "Budget (décroissant)" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const permissions = useStore((state) => state.permissions);
  const user = useStore((state) => state.user);
  const [operations, setOperations] = useState<DashboardOperation[]>([]);
  const [conditions, setConditions] = useState<AlertCondition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<OperationFilters>(EMPTY_FILTERS);
  const [sortKey, setSortKey] = useState({ key: "name", direction: "asc" } as { key: keyof DashboardOperation; direction: "asc" | "desc" });

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
        sortKey.key,
        sortKey.direction,
      ),
    [filters, operations, sortKey],
  );
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

  const handleDelete = async (operation: DashboardOperation) => {
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
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-800">
            Centre de pilotage
          </p>
          <h1 className="mt-1 text-4xl font-semibold tracking-tight text-slate-950">
            Opérations
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {filtered.length} affichée{filtered.length > 1 ? "s" : ""} sur{" "}
            {operations.length} · filtres cumulables
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {permissionGranted(permissions, 'operations.export') && (
            <ExportColumnDialog
              columns={exportColumns}
              storageKey="mpp-export-columns-operations"
              defaultKeys={DEFAULT_COLUMNS}
              onExcel={(keys) => exportOperationsExcel(filtered, keys)}
              onPdf={(keys) => exportOperationsPdf(filtered, keys)}
            />
          )}
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

      <KpiHero kpis={kpis} />

      {error && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-900"
        >
          {error}
        </div>
      )}

      <EcheancesRadar
        alerts={alerts}
        onOpenOperation={(operationId) => navigate(`/operations/${operationId}`)}
        onExportAlert={permissionGranted(permissions, 'calendar.export')
          ? (alert) => exportAlertsToOutlook([alert], `monpetitpro-${alert.id}.ics`)
          : undefined}
        onExportAll={permissionGranted(permissions, 'calendar.export')
          ? (items) => exportAlertsToOutlook(items, 'monpetitpro-echeances.ics')
          : undefined}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[300px_1fr]">
        <aside className="xl:sticky xl:top-4 xl:self-start">
          <FiltersPanel
            options={options}
            filters={filters}
            onFilterChange={setFilter}
            onReset={() => setFilters(EMPTY_FILTERS)}
            activeFilterCount={activeFilterCount}
          />
        </aside>

        <section className="min-w-0">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-medium text-slate-950">
                Répertoire des opérations
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                  {filtered.length}
                </span>
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Cliquez sur une fiche pour ouvrir l'opération.
              </p>
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-500">
              Trier par
              <select
                aria-label="Trier les opérations"
                value={`${sortKey.key}:${sortKey.direction}`}
                onChange={(event) => {
                  const [key, direction] = event.target.value.split(':') as [
                    keyof DashboardOperation,
                    "asc" | "desc",
                  ];
                  setSortKey({ key, direction });
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-teal-600"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={`${option.key}:${option.direction}`} value={`${option.key}:${option.direction}`}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {filtered.map((operation) => (
                <OperationCard
                  key={operation.id}
                  operation={operation as OperationCardData}
                  onOpen={() => navigate(`/operations/${operation.id}`)}
                  onEdit={broadActionGranted(permissions, 'contribute')
                    ? () => navigate(`/operations/${operation.id}/edit`)
                    : undefined}
                  onDelete={permissionGranted(permissions, 'operations.delete')
                    ? () => void handleDelete(operation)
                    : undefined}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
