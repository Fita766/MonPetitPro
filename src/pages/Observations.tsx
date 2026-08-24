import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Edit3,
  EyeOff,
  LayoutGrid,
  List,
  Plus,
  Search,
  X,
} from "lucide-react";
import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "../lib/supabase";
import { useStore } from "../store/useStore";
import { permissionGranted } from "../lib/accessControl";
import {
  buildObservationPayload,
  buildResolutionValidationPayload,
  getObservationStatus,
  normalizeObservation,
  type ObservationDisplayStatus,
  type ObservationFormData,
  type ObservationRow,
} from "../lib/observationStatus";
import { observationCtxId, observationCtxLabel, resolveCtxForOperation, type ProfileCtxOption } from "../lib/observationCtx";
import ObservationForm from "../components/observations/ObservationForm";
import ResolutionActions from "../components/observations/ResolutionActions";
import MultiSelectFilter from "../components/filters/MultiSelectFilter";
import { triggerSuccessToast } from "../lib/toastUtils";
import { buildObservationDraft, editableObservationFields } from "../lib/observationAccess";
import type { Profile } from "../types/domain";
import { authorizedColumns, projectExportRows, selectedExportColumns, type ExportColumn } from "../lib/exportRegistry";
import ExportColumnDialog from "../components/exports/ExportColumnDialog";

interface ObservationOperation {
  id: string;
  name: string;
  project_manager: string | null;
  ctx_user_id: string | null;
  operations_manager: string | null;
  promoter_name: string | null;
  operation_type: string | null;
  stage: string | null;
}

interface ObservationWithOperation extends ObservationRow {
  operations: ObservationOperation | null;
  status: string;
  is_dg: boolean;
}

interface ObservationFilters {
  operations: string[];
  ctxs: string[];
  cops: string[];
  promoters: string[];
  operationTypes: string[];
  responsibles: string[];
  statuses: string[];
  dg: "all" | "only" | "exclude";
  assignment: "all" | "unassigned";
  query: string;
}

const EMPTY_FILTERS: ObservationFilters = {
  operations: [],
  ctxs: [],
  cops: [],
  promoters: [],
  operationTypes: [],
  responsibles: [],
  statuses: [],
  dg: "all",
  assignment: "all",
  query: "",
};
const STATUS_STYLES: Record<ObservationDisplayStatus, string> = {
  "En cours": "bg-teal-50 text-teal-700 border-teal-200",
  "En retard": "bg-red-50 text-red-700 border-red-200",
  Terminé: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Réussi: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Échec: "bg-rose-50 text-rose-700 border-rose-200",
  Bloqué: "bg-amber-50 text-amber-800 border-amber-200",
};

function unique(values: (string | null | undefined)[]): string[] {
  return [
    ...new Set(
      values.filter((value): value is string => Boolean(value?.trim())),
    ),
  ].sort((a, b) => a.localeCompare(b, "fr"));
}

function downloadBlob(buffer: ExcelJS.Buffer, filename: string) {
  const url = URL.createObjectURL(new Blob([buffer]));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function Observations() {
  const navigate = useNavigate();
  const profile = useStore((state) => state.profile);
  const permissions = useStore((state) => state.permissions);
  const user = useStore((state) => state.user);
  const [observations, setObservations] = useState<ObservationWithOperation[]>(
    [],
  );
  const [operations, setOperations] = useState<ObservationOperation[]>([]);
  const [assigneeProfiles, setAssigneeProfiles] = useState<Profile[]>([]);
  const [filters, setFilters] = useState<ObservationFilters>(EMPTY_FILTERS);
  const [view, setView] = useState<"structured" | "table">("structured");
  const [showEmpty, setShowEmpty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ObservationFormData | null>(null);
  const [editing, setEditing] = useState<ObservationWithOperation | null>(null);
  const [saving, setSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const editableFields = useMemo(() => editableObservationFields(permissions), [permissions]);
  const canCreate = permissionGranted(permissions, 'observations.create');
  const canViewAll = permissionGranted(permissions, 'observations.view_all');
  const canViewDg = permissionGranted(permissions, 'observations.view_dg');
  const assigneeOptions = useMemo(() => {
    const rows = assigneeProfiles.map((item) => ({
      id: item.id,
      label: item.display_name?.trim() || item.initials?.trim() || item.email?.split('@')[0] || 'Utilisateur',
    }));
    if (form?.assignee_user_id && !rows.some((item) => item.id === form.assignee_user_id)) {
      rows.push({ id: form.assignee_user_id, label: form.responsible_person || 'Utilisateur affecté' });
    }
    return rows;
  }, [assigneeProfiles, form]);
  const ctxOptions: ProfileCtxOption[] = useMemo(() => assigneeProfiles.map((item) => ({
    id: item.id,
    label: item.display_name?.trim() || item.initials?.trim() || item.email?.split('@')[0] || 'Utilisateur',
    initials: item.initials,
  })), [assigneeProfiles]);
  const profileById = useMemo(() => new Map(ctxOptions.map((option) => [option.id, option.label])), [ctxOptions]);
  const exportRegistry = useMemo<ExportColumn<ObservationWithOperation>[]>(() => [
    { key: "operation", label: "Opération", group: "Opération", formatter: (row) => row.operations?.name ?? "" },
    { key: "type", label: "Type", group: "Opération", formatter: (row) => row.operations?.operation_type ?? "" },
    { key: "ctx", label: "CTX", group: "Équipe", formatter: (row) => observationCtxLabel(row, row.operations, profileById) },
    { key: "cop", label: "COP", group: "Équipe", formatter: (row) => row.operations?.operations_manager ?? "" },
    { key: "info_date", label: "Date info", group: "Suivi", formatter: (row) => row.info_date ? new Date(`${row.info_date}T12:00:00`).toLocaleDateString("fr-FR") : "" },
    { key: "description", label: "Description", group: "Suivi", formatter: (row) => row.description },
    { key: "responsible", label: "Responsable", group: "Suivi", formatter: (row) => row.responsible_person },
    { key: "deadline", label: "Date butoir", group: "Suivi", formatter: (row) => row.deadline_date ? new Date(`${row.deadline_date}T12:00:00`).toLocaleDateString("fr-FR") : "" },
    { key: "completion", label: "Réalisation", group: "Suivi", formatter: (row) => row.completion_date ?? "" },
    { key: "resolution", label: "Résolution proposée", group: "Suivi", formatter: (row) => row.resolution_date ?? "" },
    { key: "status", label: "Statut", group: "Suivi", formatter: (row) => getObservationStatus(row) },
    { key: "dg", label: "DG", group: "Confidentiel", requiredPermission: "observations.view_dg", formatter: (row) => row.is_dg ? "Oui" : "Non" },
    { key: "author", label: "Auteur", group: "Suivi", formatter: (row) => row.author_initials ?? "" },
  ], [profileById]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      supabase
        .from("observations")
        .select(
          "*, operations(id, name, project_manager, ctx_user_id, operations_manager, promoter_name, operation_type, stage)",
        )
        .order("deadline_date"),
      supabase
        .from("operations")
        .select(
          "id, name, project_manager, ctx_user_id, operations_manager, promoter_name, operation_type, stage",
        )
        .order("name"),
      supabase.from("profiles")
        .select("id,email,display_name,initials,status")
        .eq("status", "active")
        .order("display_name"),
    ]).then(([observationResult, operationResult, profileResult]) => {
      if (cancelled) return;
      const firstError = observationResult.error || operationResult.error;
      if (firstError) setError(firstError.message);
      else {
        setObservations(
          ((observationResult.data ?? []) as ObservationWithOperation[]).map(
            normalizeObservation,
          ),
        );
        setOperations(
          (operationResult.data as ObservationOperation[] | null) ?? [],
        );
        if (!profileResult.error) setAssigneeProfiles((profileResult.data as Profile[] | null) ?? []);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const statusFor = (observation: ObservationWithOperation) =>
    getObservationStatus(observation);
  const options = useMemo(
    () => ({
      operations: operations.map((operation) => operation.name),
      ctxs: (() => {
        const ids = new Set<string>();
        observations.forEach((observation) => {
          const id = observationCtxId(observation, observation.operations);
          if (id) ids.add(id);
        });
        return unique([...ids]
          .map((id) => profileById.get(id))
          .filter((label): label is string => Boolean(label)));
      })(),
      cops: unique(operations.map((operation) => operation.operations_manager)),
      promoters: unique(operations.map((operation) => operation.promoter_name)),
      operationTypes: unique(
        operations.map((operation) => operation.operation_type),
      ),
      responsibles: unique(
        observations.map((observation) => observation.responsible_person),
      ),
      statuses: unique(observations.map(statusFor)),
    }),
    [observations, operations, profileById],
  );

  const filtered = useMemo(
    () =>
      observations.filter((observation) => {
        const operation = observation.operations;
        if (
          filters.operations.length &&
          (!operation || !filters.operations.includes(operation.name))
        )
          return false;
        if (filters.ctxs.length) {
          const ctxId = observationCtxId(observation, observation.operations);
          const ctxLabel = ctxId ? (profileById.get(ctxId) ?? null) : null;
          const effectiveCtx =
            ctxLabel ??
            observation.operations?.project_manager ??
            null;
          if (!effectiveCtx || !filters.ctxs.includes(effectiveCtx))
            return false;
        }
        if (
          filters.cops.length &&
          (!operation?.operations_manager ||
            !filters.cops.includes(operation.operations_manager))
        )
          return false;
        if (
          filters.promoters.length &&
          (!operation?.promoter_name ||
            !filters.promoters.includes(operation.promoter_name))
        )
          return false;
        if (
          filters.operationTypes.length &&
          (!operation?.operation_type ||
            !filters.operationTypes.includes(operation.operation_type))
        )
          return false;
        if (
          filters.responsibles.length &&
          !filters.responsibles.includes(observation.responsible_person)
        )
          return false;
        if (
          filters.statuses.length &&
          !filters.statuses.includes(statusFor(observation))
        )
          return false;
        if (filters.dg === "only" && !observation.is_dg) return false;
        if (filters.dg === "exclude" && observation.is_dg) return false;
        if (filters.assignment === "unassigned" && observation.assignee_user_id) return false;
        const query = filters.query.trim().toLocaleLowerCase("fr");
        return (
          !query ||
          [
            observation.description,
            observation.responsible_person,
            operation?.name,
            operation?.project_manager,
            operation?.operations_manager,
          ].some((value) => value?.toLocaleLowerCase("fr").includes(query))
        );
      }),
    [filters, observations, profileById],
  );

  const grouped = useMemo(
    () =>
      operations.flatMap((operation) => {
        const items = filtered.filter(
          (observation) => observation.operation_id === operation.id,
        );
        return items.length || showEmpty ? [{ operation, items }] : [];
      }),
    [filtered, operations, showEmpty],
  );

  const openCreate = (operationId = "") => {
    setEditing(null);
    if (!profile) return;
    const draft = buildObservationDraft(profile, permissionGranted(permissions, 'observations.assign'), operationId);
    if (operationId) {
      const operation = operations.find((item) => item.id === operationId);
      if (operation) {
        const ctxId = resolveCtxForOperation(operation, ctxOptions);
        if (ctxId) draft.ctx_user_id = ctxId;
      }
    }
    setForm(draft);
  };
  const openEdit = (observation: ObservationWithOperation) => {
    setEditing(observation);
    setForm({
      operation_id: observation.operation_id,
      info_date: observation.info_date,
      description: observation.description,
      responsible_person: observation.responsible_person,
      assignee_user_id: observation.assignee_user_id ?? "",
      ctx_user_id: observation.ctx_user_id ?? "",
      deadline_date: observation.deadline_date,
      completion_date: observation.completion_date ?? "",
      resolution_date: observation.resolution_date ?? "",
      status: observation.status as ObservationFormData["status"],
      is_dg: observation.is_dg,
    });
  };

  const handleOperationSelect = (operationId: string) => {
    if (!form || editing) return; // création uniquement
    const operation = operations.find((item) => item.id === operationId);
    if (!operation) return;
    const ctxId = resolveCtxForOperation(operation, ctxOptions);
    setForm({ ...form, operation_id: operationId, ctx_user_id: ctxId });
  };

  const saveObservation = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form || !user || (editing ? editableFields.size === 0 : !canCreate)) return;
    setSaving(true);
    setError(null);
    const payload = buildObservationPayload(form, {
      userId: editing?.user_id ?? user.id,
      initials:
        editing?.author_initials ??
        profile?.initials ??
        user.email?.slice(0, 2).toUpperCase() ??
        "??",
    });
    const result = editing
      ? await supabase.from("observations").update(payload).eq("id", editing.id)
      : await supabase.from("observations").insert(payload);
    if (result.error) setError(result.error.message);
    else {
      triggerSuccessToast(
        user.email,
        editing ? "Observation modifiée." : "Observation ajoutée.",
      );
      setForm(null);
      setEditing(null);
      setRefreshKey((key) => key + 1);
    }
    setSaving(false);
  };

  const validateResolution = async (observation: ObservationWithOperation) => {
    if (!user || !permissionGranted(permissions, 'observations.validate')) return;
    const { error: validationError } = await supabase
      .from("observations")
      .update(buildResolutionValidationPayload(user.id))
      .eq("id", observation.id);
    if (validationError) setError(validationError.message);
    else {
      triggerSuccessToast(user.email, "Résolution validée.");
      setRefreshKey((key) => key + 1);
    }
  };

  const deleteObservation = async (observation: ObservationWithOperation) => {
    if (
      !permissionGranted(permissions, 'observations.delete') ||
      !window.confirm("Supprimer cette observation ?")
    )
      return;
    const { error: deleteError } = await supabase
      .from("observations")
      .delete()
      .eq("id", observation.id);
    if (deleteError) setError(deleteError.message);
    else {
      triggerSuccessToast(user?.email, "Observation supprimée.");
      setRefreshKey((key) => key + 1);
    }
  };

  const exportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Observations");
    sheet.columns = [
      { header: "Opération", key: "operation", width: 30 },
      { header: "Type", key: "type", width: 14 },
      { header: "CTX", key: "ctx", width: 12 },
      { header: "COP", key: "cop", width: 12 },
      { header: "Date info", key: "info", width: 13 },
      { header: "Description", key: "description", width: 55 },
      { header: "Réalisateur", key: "responsible", width: 18 },
      { header: "Butoir", key: "deadline", width: 13 },
      { header: "Résolution", key: "resolution", width: 13 },
      { header: "Validation", key: "validation", width: 16 },
      { header: "Statut", key: "status", width: 14 },
      { header: "DG", key: "dg", width: 8 },
      { header: "Auteur", key: "author", width: 10 },
    ];
    filtered.forEach((observation) =>
      sheet.addRow({
        operation: observation.operations?.name ?? "",
        type: observation.operations?.operation_type ?? "",
        ctx: observationCtxLabel(observation, observation.operations, profileById),
        cop: observation.operations?.operations_manager ?? "",
        info: observation.info_date,
        description: observation.description,
        responsible: observation.responsible_person,
        deadline: observation.deadline_date,
        resolution: observation.resolution_date ?? "",
        validation: observation.resolution_validated_at ? "Validée" : "",
        status: statusFor(observation),
        dg: observation.is_dg ? "Oui" : "Non",
        author: observation.author_initials ?? "",
      }),
    );
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0F766E" },
    };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    downloadBlob(
      await workbook.xlsx.writeBuffer(),
      `observations-${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  };

  const exportPdf = () => {
    const document = new jsPDF({ orientation: "landscape" });
    document.setFontSize(16);
    document.text("MonPetitPro — Observations", 14, 15);
    autoTable(document, {
      startY: 21,
      head: [
        [
          "Opération",
          "CTX/COP",
          "Information",
          "Description",
          "Réalisateur",
          "Butoir",
          "Résolution",
          "Statut",
          "DG",
        ],
      ],
      body: filtered.map((observation) => [
        observation.operations?.name ?? "",
        `${observationCtxLabel(observation, observation.operations, profileById) || "—"} / ${observation.operations?.operations_manager ?? "—"}`,
        observation.info_date,
        observation.description,
        observation.responsible_person,
        observation.deadline_date,
        observation.resolution_date ?? "",
        statusFor(observation),
        observation.is_dg ? "Oui" : "",
      ]),
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [15, 118, 110] },
    });
    document.save(`observations-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // Conservés pendant la transition de format pour garantir la lecture des
  // anciennes extractions déjà ouvertes dans une session.
  void exportExcel;
  void exportPdf;
  const exportColumns = authorizedColumns(exportRegistry, permissions);
  const exportSelectedExcel = async (keys: string[], source = filtered) => {
    const columns = selectedExportColumns(keys, exportColumns);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Observations");
    sheet.addRow(columns.map((column) => column.label));
    projectExportRows(source, keys, exportColumns).forEach((row) => sheet.addRow(row));
    columns.forEach((column, index) => { sheet.getColumn(index + 1).width = Math.min(55, Math.max(14, column.label.length + 5)); });
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F766E" } };
    downloadBlob(await workbook.xlsx.writeBuffer(), `observations-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };
  const exportSelectedPdf = (keys: string[], source = filtered) => {
    const columns = selectedExportColumns(keys, exportColumns);
    const document = new jsPDF({ orientation: columns.length > 5 ? "landscape" : "portrait" });
    document.setFontSize(16);
    document.text("MonPetitPro — Observations", 14, 15);
    autoTable(document, {
      startY: 21,
      head: [columns.map((column) => column.label)],
      body: projectExportRows(source, keys, exportColumns),
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [15, 118, 110] },
    });
    document.save(`observations-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const statusBadge = (observation: ObservationWithOperation) => {
    const status = statusFor(observation);
    return (
      <span
        className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-medium ${STATUS_STYLES[status]}`}
      >
        {status}
      </span>
    );
  };
  const canEditObservation = (observation: ObservationWithOperation) =>
    permissionGranted(permissions, 'observations.edit_all')
    || (observation.assignee_user_id === user?.id
      && permissionGranted(permissions, 'observations.edit_assigned'))
    || permissions.some((key) => [
      'observations.reassign', 'observations.set_completion',
      'observations.set_status', 'observations.set_dg',
    ].includes(key));

  if (loading)
    return (
      <div className="flex min-h-[55vh] items-center justify-center text-slate-500">
        Chargement des observations…
      </div>
    );

  return (
    <div className="mx-auto max-w-[1700px] pb-12">
      <header className="mb-7 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950">
            Observations
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {filtered.length} point{filtered.length > 1 ? "s" : ""} visible
            {filtered.length > 1 ? "s" : ""} · chaque auteur est identifié
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-xl border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setView("structured")}
              className={`rounded-lg p-2 ${view === "structured" ? "bg-teal-700 text-white" : "text-slate-500"}`}
              title="Vue structurée"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              type="button"
              onClick={() => setView("table")}
              className={`rounded-lg p-2 ${view === "table" ? "bg-teal-700 text-white" : "text-slate-500"}`}
              title="Vue tableau"
            >
              <List size={16} />
            </button>
          </div>
          {permissionGranted(permissions, 'observations.export') && <ExportColumnDialog
            columns={exportColumns}
            storageKey="mpp-export-columns-observations"
            defaultKeys={["operation", "ctx", "cop", "info_date", "description", "responsible", "deadline", "resolution", "status"]}
            onExcel={(keys) => exportSelectedExcel(keys)}
            onPdf={(keys) => exportSelectedPdf(keys)}
            extraAction={canViewDg ? {
              label: "Exporter uniquement les informations DG",
              onClick: (keys) => exportSelectedExcel(keys, filtered.filter((row) => row.is_dg)),
            } : undefined}
          />}
          {permissionGranted(permissions, 'observations.create') && (
            <button
              type="button"
              onClick={() => openCreate()}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-800 px-4 py-2 text-sm font-medium text-white"
            >
              <Plus size={17} /> Ajouter
            </button>
          )}
        </div>
      </header>
      {error && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-900"
        >
          {error}
        </div>
      )}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-[#f3f5f1] p-4">
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-[260px] flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={15}
            />
            <input
              value={filters.query}
              onChange={(event) =>
                setFilters({ ...filters, query: event.target.value })
              }
              placeholder="Rechercher une observation…"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-teal-600"
            />
          </div>
          <MultiSelectFilter
            label="Opérations"
            options={options.operations}
            values={filters.operations}
            onChange={(value) => setFilters({ ...filters, operations: value })}
          />
          <MultiSelectFilter
            label="CTX"
            options={options.ctxs}
            values={filters.ctxs}
            onChange={(value) => setFilters({ ...filters, ctxs: value })}
          />
          <MultiSelectFilter
            label="COP"
            options={options.cops}
            values={filters.cops}
            onChange={(value) => setFilters({ ...filters, cops: value })}
          />
          <MultiSelectFilter
            label="Promoteurs"
            options={options.promoters}
            values={filters.promoters}
            onChange={(value) => setFilters({ ...filters, promoters: value })}
          />
          <MultiSelectFilter
            label="Types"
            options={options.operationTypes}
            values={filters.operationTypes}
            onChange={(value) =>
              setFilters({ ...filters, operationTypes: value })
            }
          />
          <MultiSelectFilter
            label="Réalisateurs"
            options={options.responsibles}
            values={filters.responsibles}
            onChange={(value) =>
              setFilters({ ...filters, responsibles: value })
            }
          />
          <MultiSelectFilter
            label="Statuts"
            options={options.statuses}
            values={filters.statuses}
            onChange={(value) => setFilters({ ...filters, statuses: value })}
          />
          {canViewDg && <select
            aria-label="Filtre DG"
            value={filters.dg}
            onChange={(event) =>
              setFilters({
                ...filters,
                dg: event.target.value as ObservationFilters["dg"],
              })
            }
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium"
          >
            <option value="all">Toutes infos</option>
            <option value="only">DG uniquement</option>
            <option value="exclude">Hors DG</option>
          </select>}
          {canViewAll && <select aria-label="Filtre affectation" value={filters.assignment}
            onChange={(event) => setFilters({ ...filters, assignment: event.target.value as ObservationFilters["assignment"] })}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium">
            <option value="all">Toutes affectations</option>
            <option value="unassigned">Sans affectation</option>
          </select>}
          <button
            type="button"
            onClick={() => setFilters(EMPTY_FILTERS)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-500"
          >
            Effacer
          </button>
        </div>
        {view === "structured" && (
          <label className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-600">
            <input
              type="checkbox"
              checked={showEmpty}
              onChange={(event) => setShowEmpty(event.target.checked)}
            />{" "}
            Afficher les opérations sans observation
          </label>
        )}
      </div>

      {view === "structured" ? (
        <div className="space-y-4">
          {grouped.map(({ operation, items }) => (
            <section
              key={operation.id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <button
                type="button"
                onClick={() => navigate(`/operations/${operation.id}`)}
                className="flex w-full flex-col justify-between gap-3 border-b border-teal-200 bg-teal-50 px-5 py-4 text-left text-slate-900 md:flex-row md:items-center"
              >
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-teal-700">
                    {operation.operation_type ?? "Type non renseigné"} ·{" "}
                    {operation.stage ? `Stade ${operation.stage}` : "Stade —"}
                  </p>
                  <h2 className="mt-1 text-lg font-medium">{operation.name}</h2>
                </div>
                <p className="text-xs font-medium text-slate-500">
                  CTX {operation.project_manager ?? "—"} · COP{" "}
                  {operation.operations_manager ?? "—"} · {items.length} point
                  {items.length > 1 ? "s" : ""}
                </p>
              </button>
              {items.length === 0 ? (
                <div className="p-7 text-center text-sm text-slate-400">
                  Aucune observation.
                  {canCreate && (
                    <button
                      type="button"
                      onClick={() => openCreate(operation.id)}
                      className="ml-2 font-medium text-teal-700"
                    >
                      Ajouter un point
                    </button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {items.map((observation) => (
                    <div
                      key={observation.id}
                      className="grid grid-cols-1 items-center gap-3 px-5 py-4 md:grid-cols-[100px_minmax(240px,1fr)_110px_110px_110px_130px]"
                    >
                      <div>
                        <p className="text-[10px] font-medium uppercase text-slate-400">
                          Info
                        </p>
                        <p className="mt-1 text-xs font-medium">
                          {new Date(
                            `${observation.info_date}T12:00:00`,
                          ).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          {statusBadge(observation)}
                          {(() => {
                            const ctxId = observationCtxId(observation, observation.operations);
                            const ctxLabel = ctxId ? (profileById.get(ctxId) ?? null) : null;
                            return ctxLabel ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">
                                CTX · {ctxLabel}
                              </span>
                            ) : null;
                          })()}
                          {observation.is_dg && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-medium text-amber-900">
                              <EyeOff size={11} /> DG
                            </span>
                          )}
                          <span className="text-[10px] font-medium text-slate-400">
                            par {observation.author_initials ?? "—"}
                          </span>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                          {observation.description}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium uppercase text-slate-400">
                          Réalisateur
                        </p>
                        <p className="mt-1 text-xs font-medium">
                          {observation.responsible_person}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium uppercase text-slate-400">
                          Butoir
                        </p>
                        <p className="mt-1 text-xs font-medium">
                          {observation.deadline_date}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium uppercase text-slate-400">
                          Résolution
                        </p>
                        <p className="mt-1 text-xs font-medium">
                          {observation.resolution_date ?? "—"}
                        </p>
                      </div>
                      <div className="flex items-center justify-end gap-1">
                        {canEditObservation(observation) &&
                          (!observation.resolution_validated_at ||
                            permissionGranted(permissions, 'observations.validate')) && (
                            <button
                              type="button"
                              onClick={() => openEdit(observation)}
                              className="rounded-lg p-2 text-slate-400 hover:bg-teal-50 hover:text-teal-700"
                            >
                              <Edit3 size={16} />
                            </button>
                          )}
                        <ResolutionActions
                          observation={observation}
                          canValidate={permissionGranted(permissions, 'observations.validate')}
                          canDelete={permissionGranted(permissions, 'observations.delete')}
                          onValidate={() =>
                            void validateResolution(observation)
                          }
                          onDelete={() => void deleteObservation(observation)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-[1200px] w-full text-left text-xs">
            <thead className="border-b border-teal-200 bg-teal-50 text-teal-950">
              <tr>
                {[
                  "Opération",
                  "Description",
                  "CTX",
                  "COP",
                  "Réalisateur",
                  "Butoir",
                  "Résolution",
                  "Statut",
                  "DG",
                  "Actions",
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
              {filtered.map((observation) => (
                <tr key={observation.id} className="border-b border-slate-100">
                  <td className="px-3 py-3 font-medium">
                    {observation.operations?.name}
                  </td>
                  <td className="max-w-xl px-3 py-3">
                    {observation.description}
                  </td>
                  <td className="px-3 py-3">
                    {(() => {
                      const ctxId = observationCtxId(observation, observation.operations);
                      return ctxId ? (profileById.get(ctxId) ?? observation.operations?.project_manager ?? '—') : (observation.operations?.project_manager ?? '—');
                    })()}
                  </td>
                  <td className="px-3 py-3">
                    {observation.operations?.operations_manager}
                  </td>
                  <td className="px-3 py-3">
                    {observation.responsible_person}
                  </td>
                  <td className="px-3 py-3">{observation.deadline_date}</td>
                  <td className="px-3 py-3">
                    {observation.resolution_date ?? "—"}
                  </td>
                  <td className="px-3 py-3">{statusBadge(observation)}</td>
                  <td className="px-3 py-3">{observation.is_dg ? "DG" : ""}</td>
                  <td className="px-3 py-3">
                    <div className="flex">
                      {canEditObservation(observation) && <button
                        type="button"
                        onClick={() => openEdit(observation)}
                        className="p-2 text-slate-400"
                      >
                        <Edit3 size={15} />
                      </button>}
                      <ResolutionActions
                        observation={observation}
                        canValidate={permissionGranted(permissions, 'observations.validate')}
                        canDelete={permissionGranted(permissions, 'observations.delete')}
                        onValidate={() => void validateResolution(observation)}
                        onDelete={() => void deleteObservation(observation)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-800/50 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-teal-700">
                  Observation
                </p>
                <h2 className="text-xl font-medium text-slate-950">
                  {editing ? "Modifier le point" : "Ajouter un point"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setForm(null)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100"
              >
                <X />
              </button>
            </div>
            <div className="p-6">
              <ObservationForm
                value={form}
                operations={operations}
                assignees={assigneeOptions}
                ctxOptions={ctxOptions}
                editableFields={editableFields}
                canViewDg={canViewDg}
                saving={saving}
                onChange={setForm}
                onOperationSelect={handleOperationSelect}
                onSubmit={saveObservation}
                onCancel={() => setForm(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
