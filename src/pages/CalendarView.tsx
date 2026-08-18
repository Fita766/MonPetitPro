import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { fr } from "date-fns/locale";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Plus,
  X,
} from "lucide-react";
import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "../lib/supabase";
import { useStore } from "../store/useStore";
import { permissionGranted } from "../lib/accessControl";
import {
  buildCalendarEvents,
  type BusinessCalendarEvent,
  type BusinessCalendarView,
  type CalendarCondition,
  type CalendarOperation,
} from "../lib/calendarEvents";
import CalendarFilters, {
  type CalendarFilterState,
} from "../components/calendar/CalendarFilters";
import CalendarLegend from "../components/calendar/CalendarLegend";
import {
  FieldLabel,
  SelectInput,
  TextArea,
  TextInput,
} from "../components/operations/FormControls";
import { triggerSuccessToast } from "../lib/toastUtils";
import { buildIcs, downloadIcs } from "../lib/ics";
import { filterCurrentUserEvents } from "../lib/calendarScoping";

type CalendarViewType = BusinessCalendarView | "agenda";
type CalendarDisplay = "month" | "year";

interface ManualEventRow {
  id: string;
  title: string;
  event_date: string;
  event_time: string | null;
  description: string | null;
  operation_id: string | null;
}

interface CalendarObservationRow {
  id: string;
  operation_id: string;
  description: string;
  deadline_date: string;
  completion_date: string | null;
}

interface DisplayEvent extends BusinessCalendarEvent {
  manualId?: string;
  description?: string | null;
  time?: string | null;
}

const EMPTY_FILTERS: CalendarFilterState = {
  operations: [],
  ctxs: [],
  cops: [],
  departments: [],
  promoters: [],
  stages: [],
  modes: [],
  natures: [],
  milestoneTypes: [],
};
const VIEW_LABELS: {
  id: CalendarViewType;
  label: string;
  description: string;
}[] = [
  {
    id: "conditions",
    label: "Conditions suspensives",
    description: "Butoirs et réalisations",
  },
  {
    id: "program",
    label: "Programme et autorisations",
    description: "Comités, agréments, permis et foncier",
  },
  {
    id: "works",
    label: "Travaux",
    description: "OS et préparation de livraison",
  },
  { id: "deliveries", label: "Livraisons", description: "Réelle, révisée ou contractuelle" },
  {
    id: "management",
    label: "Mises en gestion",
    description: "MEG réelle ou prévisionnelle",
  },
  {
    id: "agenda",
    label: "Agenda libre",
    description: "Événements et observations existants",
  },
];

function unique(values: (string | null | undefined)[]) {
  return [
    ...new Set(
      values.filter((value): value is string => Boolean(value?.trim())),
    ),
  ].sort((a, b) => a.localeCompare(b, "fr"));
}

function eventMatches(
  event: BusinessCalendarEvent,
  filters: CalendarFilterState,
) {
  return (
    (!filters.operations.length ||
      filters.operations.includes(event.operationName)) &&
    (!filters.ctxs.length ||
      (event.ctx != null && filters.ctxs.includes(event.ctx))) &&
    (!filters.cops.length ||
      (event.cop != null && filters.cops.includes(event.cop))) &&
    (!filters.departments.length ||
      (event.department != null &&
        filters.departments.includes(event.department))) &&
    (!filters.promoters.length ||
      (event.promoter != null && filters.promoters.includes(event.promoter))) &&
    (!filters.stages.length || (event.stage != null && filters.stages.includes(event.stage))) &&
    (!filters.modes.length || (event.mode != null && filters.modes.includes(event.mode))) &&
    (!filters.natures.length || (event.nature != null && filters.natures.includes(event.nature))) &&
    (!filters.milestoneTypes.length || filters.milestoneTypes.includes(event.milestoneType))
  );
}

export default function CalendarView() {
  const navigate = useNavigate();
  const permissions = useStore((state) => state.permissions);
  const user = useStore((state) => state.user);
  const viewAll = permissionGranted(permissions, "calendar.view_all");
  const [view, setView] = useState<CalendarViewType>("deliveries");
  const [display, setDisplay] = useState<CalendarDisplay>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [operations, setOperations] = useState<CalendarOperation[]>([]);
  const [calendarOperations, setCalendarOperations] = useState<CalendarOperation[]>([]);
  const [conditions, setConditions] = useState<CalendarCondition[]>([]);
  const [manualEvents, setManualEvents] = useState<ManualEventRow[]>([]);
  const [observations, setObservations] = useState<CalendarObservationRow[]>(
    [],
  );
  const [filters, setFilters] = useState<CalendarFilterState>(EMPTY_FILTERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [eventForm, setEventForm] = useState<ManualEventRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    const operationsQuery = supabase
      .from("operations")
      .select("*")
      .order("name");
    const calendarOperationsQuery = viewAll
      ? operationsQuery
      : supabase.from("calendar_operations").select("*").order("name");
    void Promise.all([
      calendarOperationsQuery,
      operationsQuery,
      supabase.from("suspensive_conditions").select("*"),
      supabase
        .from("observations")
        .select(
          "id, operation_id, description, deadline_date, completion_date",
        ),
      supabase.from("events").select("*"),
    ]).then(
      ([
        operationResult,
        fullOperationResult,
        conditionResult,
        observationResult,
        eventResult,
      ]) => {
        if (cancelled) return;
        const firstError =
          operationResult.error ||
          fullOperationResult.error ||
          conditionResult.error ||
          observationResult.error;
        if (firstError) setError(firstError.message);
        else {
          // L'agenda (observations + événements libres) est volontairement
          // alimenté par toutes les opérations : ses liens peuvent pointer vers
          // n'importe quelle opération qu'un détenteur de `calendar.view` peut
          // référencer, quand bien même l'utilisateur n'en est ni COP ni CTX.
          // L'agenda ne porte que des champs d'affichage (nom, équipe,
          // département…) — jamais de jalons ni de chiffres budgétaires. Ne pas
          // router les données de jalons d'opérations par ce chemin.
          setOperations(
            (fullOperationResult.data as CalendarOperation[] | null) ?? [],
          );
          setCalendarOperations(
            viewAll
              ? []
              : ((operationResult.data as CalendarOperation[] | null) ?? []),
          );
          setConditions(
            (conditionResult.data as CalendarCondition[] | null) ?? [],
          );
          setObservations(
            (observationResult.data as CalendarObservationRow[] | null) ?? [],
          );
          setManualEvents(
            eventResult.error?.code === "42P01"
              ? []
              : ((eventResult.data as ManualEventRow[] | null) ?? []),
          );
        }
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [refreshKey, viewAll]);

  const operationById = useMemo(
    () => new Map(operations.map((operation) => [operation.id, operation])),
    [operations],
  );
  const opsById = useMemo(() => {
    const record: Record<string, CalendarOperation> = {};
    for (const operation of operations) record[operation.id] = operation;
    return record;
  }, [operations]);
  const scopedOperations = useMemo(
    () => (viewAll ? operations : calendarOperations),
    [operations, calendarOperations, viewAll],
  );
  const agendaEvents = useMemo<DisplayEvent[]>(() => {
    const fromManual = manualEvents.flatMap((event): DisplayEvent[] => {
      const operation = event.operation_id
        ? operationById.get(event.operation_id)
        : null;
      return [
        {
          id: `manual-${event.id}`,
          manualId: event.id,
          date: event.event_date,
          title: event.title,
          code: "EVT",
          kind: "key-dates",
          actual: true,
          milestoneType: "agenda",
          operationId: operation?.id ?? "",
          operationName: operation?.name ?? "Sans opération",
          ctx: operation?.project_manager ?? null,
          cop: operation?.operations_manager ?? null,
          department: operation?.department ?? null,
          promoter: operation?.promoter_name ?? null,
          stage: operation?.stage ?? null,
          mode: operation?.operation_type ?? null,
          nature: operation?.program_nature ?? null,
          description: event.description,
          time: event.event_time,
        },
      ];
    });
    const fromObservations = observations.flatMap(
      (observation): DisplayEvent[] => {
        const operation = operationById.get(observation.operation_id);
        if (!operation) return [];
        return [
          {
            id: `observation-${observation.id}`,
            date: observation.completion_date || observation.deadline_date,
            title: observation.description,
            code: "OBS",
            kind: "key-dates",
            actual: Boolean(observation.completion_date),
            milestoneType: "observation",
            operationId: operation.id,
            operationName: operation.name,
            ctx: operation.project_manager ?? null,
            cop: operation.operations_manager ?? null,
            department: operation.department ?? null,
            promoter: operation.promoter_name ?? null,
            stage: operation.stage ?? null,
            mode: operation.operation_type ?? null,
            nature: operation.program_nature ?? null,
          },
        ];
      },
    );
    return [...fromManual, ...fromObservations].sort((left, right) =>
      left.date.localeCompare(right.date),
    );
  }, [manualEvents, observations, operationById]);

  const allEvents = useMemo<DisplayEvent[]>(
    () => {
      if (view === "agenda") return agendaEvents;
      const built = buildCalendarEvents(scopedOperations, conditions, view);
      return filterCurrentUserEvents(built, opsById, {
        id: user?.id ?? "",
        hasViewAll: viewAll,
      });
    },
    [agendaEvents, conditions, opsById, scopedOperations, user, view, viewAll],
  );
  const filteredEvents = useMemo(
    () => allEvents.filter((event) => eventMatches(event, filters)),
    [allEvents, filters],
  );
  const displayOperations = useMemo(
    () => (view === "agenda" ? operations : scopedOperations),
    [operations, scopedOperations, view],
  );
  const options = useMemo(
    () => ({
      operations: displayOperations.map((operation) => operation.name),
      ctxs: unique(displayOperations.map((operation) => operation.project_manager)),
      cops: unique(displayOperations.map((operation) => operation.operations_manager)),
      departments: unique(displayOperations.map((operation) => operation.department)),
      promoters: unique(displayOperations.map((operation) => operation.promoter_name)),
      stages: unique(displayOperations.map((operation) => operation.stage)),
      modes: unique(displayOperations.map((operation) => operation.operation_type)),
      natures: unique(displayOperations.map((operation) => operation.program_nature)),
      milestoneTypes: unique(allEvents.map((event) => event.milestoneType)),
    }),
    [allEvents, displayOperations],
  );

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 1 }),
    end: endOfWeek(monthEnd, { weekStartsOn: 1 }),
  });
  const year = currentDate.getFullYear();
  const eventsForDay = (date: Date) =>
    filteredEvents.filter((event) => event.date === format(date, "yyyy-MM-dd"));

  const changeView = (next: CalendarViewType) => {
    setView(next);
    setFilters(EMPTY_FILTERS);
  };
  const openNewEvent = () =>
    setEventForm({
      id: "",
      title: "",
      event_date: format(currentDate, "yyyy-MM-dd"),
      event_time: null,
      description: null,
      operation_id: null,
    });
  const openEvent = (event: DisplayEvent) => {
    if (event.manualId) {
      const source = manualEvents.find(
        (manual) => manual.id === event.manualId,
      );
      if (source) setEventForm(source);
    } else if (event.operationId) navigate(`/operations/${event.operationId}`);
  };
  const exportOutlook = (events: DisplayEvent[], filename: string) => {
    if (events.length === 0) return;
    const content = buildIcs(events.map((event) => ({
      uid: event.id,
      title: `${event.title}${event.operationName && event.operationName !== 'Sans opération' ? ` — ${event.operationName}` : ''}`,
      date: event.date,
      description: event.description ?? `Jalon ${event.code} issu de MonPetitPro`,
    })), 'MonPetitPro');
    downloadIcs(filename, content);
    triggerSuccessToast(
      user?.email,
      `${events.length} échéance${events.length > 1 ? 's' : ''} exportée${events.length > 1 ? 's' : ''} vers Outlook. Rappels J-30 et J-15 inclus.`,
    );
  };

  const saveManualEvent = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!eventForm || !user) return;
    const payload = {
      title: eventForm.title,
      event_date: eventForm.event_date,
      event_time: eventForm.event_time || null,
      description: eventForm.description || null,
      operation_id: eventForm.operation_id || null,
      user_id: user.id,
    };
    const result = eventForm.id
      ? await supabase.from("events").update(payload).eq("id", eventForm.id)
      : await supabase.from("events").insert(payload);
    if (result.error) setError(result.error.message);
    else {
      triggerSuccessToast(user.email, "Événement enregistré.");
      setEventForm(null);
      setRefreshKey((key) => key + 1);
    }
  };

  const deleteManualEvent = async () => {
    if (!eventForm?.id || !window.confirm("Supprimer cet événement ?")) return;
    const { error: deleteError } = await supabase
      .from("events")
      .delete()
      .eq("id", eventForm.id);
    if (deleteError) setError(deleteError.message);
    else {
      setEventForm(null);
      setRefreshKey((key) => key + 1);
    }
  };

  const yearEvents = filteredEvents.filter((event) =>
    event.date.startsWith(String(year)),
  );
  const exportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(`Calendrier ${year}`);
    sheet.columns = [
      { header: "Date", key: "date", width: 14 },
      { header: "Code", key: "code", width: 10 },
      { header: "Événement", key: "title", width: 42 },
      { header: "Opération", key: "operation", width: 32 },
      { header: "CTX", key: "ctx", width: 12 },
      { header: "COP", key: "cop", width: 12 },
      { header: "Département", key: "department", width: 14 },
      { header: "Promoteur", key: "promoter", width: 24 },
      { header: "Nature", key: "nature", width: 16 },
    ];
    yearEvents.forEach((item) =>
      sheet.addRow({
        date: item.date,
        code: item.code,
        title: item.title,
        operation: item.operationName,
        ctx: item.ctx,
        cop: item.cop,
        department: item.department,
        promoter: item.promoter,
        nature: item.actual ? "Réel / réalisé" : "Prévisionnel",
      }),
    );
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF8F4938" },
    };
    const buffer = await workbook.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buffer]));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `calendrier-${view}-${year}.xlsx`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const exportPdf = () => {
    const document = new jsPDF({ orientation: "landscape" });
    document.setFontSize(16);
    document.text(
      `Calendrier ${VIEW_LABELS.find((item) => item.id === view)?.label} — ${year}`,
      14,
      15,
    );
    autoTable(document, {
      startY: 21,
      head: [
        [
          "Date",
          "Code",
          "Événement",
          "Opération",
          "CTX",
          "COP",
          "Département",
          "Nature",
        ],
      ],
      body: yearEvents.map((item) => [
        item.date,
        item.code,
        item.title,
        item.operationName,
        item.ctx ?? "",
        item.cop ?? "",
        item.department ?? "",
        item.actual ? "Réel" : "Prévisionnel",
      ]),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [143, 73, 56] },
    });
    document.save(`calendrier-${view}-${year}.pdf`);
  };

  if (loading)
    return (
      <div className="flex min-h-[55vh] items-center justify-center text-slate-500">
        Chargement des calendriers…
      </div>
    );

  return (
    <div className="mx-auto max-w-[1700px] pb-12">
      <header className="mb-7 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950">
            Calendriers
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Une source unique, plusieurs lectures métier et filtres multiples.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {permissionGranted(permissions, 'calendar.export') && <><button
            type="button"
            onClick={() => void exportExcel()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium"
          >
            <FileSpreadsheet size={15} /> Excel {year}
          </button>
          <button
            type="button"
            onClick={exportPdf}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium"
          >
            <Download size={15} /> PDF {year}
          </button>
          <div className="flex flex-col items-start gap-1">
            <button
              type="button"
              disabled={filteredEvents.length === 0}
              onClick={() => exportOutlook(filteredEvents, `monpetitpro-${view}.ics`)}
              className="inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-medium text-teal-900 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <CalendarDays size={15} /> Exporter les échéances vers Outlook (.ics)
            </button>
            <span className="px-1 text-[10px] text-slate-500">Rappels J-30 et J-15 inclus</span>
          </div></>}
          {view === "agenda" && permissionGranted(permissions, 'calendar.manage') && (
            <button
              type="button"
              onClick={openNewEvent}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-800 px-4 py-2 text-sm font-medium text-white"
            >
              <Plus size={16} /> Événement
            </button>
          )}
        </div>
      </header>
      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-900">
          {error}
        </div>
      )}
      <div className="mb-5 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-6">
        {VIEW_LABELS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => changeView(item.id)}
            className={`rounded-2xl border p-4 text-left transition ${view === item.id ? "border-teal-300 bg-teal-50 text-teal-950 shadow-sm" : "border-slate-200 bg-white text-slate-800 hover:border-teal-400"}`}
          >
            <p
              className={`text-xs font-medium ${view === item.id ? "text-teal-800" : "text-teal-700"}`}
            >
              {item.label}
            </p>
            <p
              className={`mt-1 text-[11px] ${view === item.id ? "text-slate-600" : "text-slate-500"}`}
            >
              {item.description}
            </p>
          </button>
        ))}
      </div>
      <div className="mb-5 rounded-2xl border border-slate-200 bg-[#f3f5f1] p-4">
        <CalendarFilters
          view={view}
          filters={filters}
          options={options}
          onChange={setFilters}
        />
        <div className="mt-4">
          <CalendarLegend />
        </div>
      </div>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Mois précédent"
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              className="rounded-xl border border-slate-200 p-2 text-slate-600"
            >
              <ChevronLeft />
            </button>
            <button
              type="button"
              onClick={() => setCurrentDate(new Date())}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium"
            >
              Aujourd’hui
            </button>
            <button
              type="button"
              aria-label="Mois suivant"
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              className="rounded-xl border border-slate-200 p-2 text-slate-600"
            >
              <ChevronRight />
            </button>
            <h2 className="ml-2 text-xl font-medium capitalize text-slate-950">
              {display === "month"
                ? format(currentDate, "MMMM yyyy", { locale: fr })
                : year}
            </h2>
          </div>
          <div className="flex rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setDisplay("month")}
              className={`rounded-lg px-3 py-2 text-xs font-medium ${display === "month" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}
            >
              Mois
            </button>
            <button
              type="button"
              onClick={() => setDisplay("year")}
              className={`rounded-lg px-3 py-2 text-xs font-medium ${display === "year" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}
            >
              Année
            </button>
          </div>
        </div>
        {display === "month" ? (
          <div>
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
              {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => (
                <div
                  key={day}
                  className="px-2 py-3 text-center text-[10px] font-medium uppercase tracking-widest text-slate-400"
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {monthDays.map((day) => {
                const items = eventsForDay(day);
                return (
                  <div
                    key={day.toISOString()}
                    className={`min-h-32 border-b border-r border-slate-100 p-2 ${isSameMonth(day, currentDate) ? "bg-white" : "bg-slate-50/70 text-slate-300"}`}
                  >
                    <p
                      className={`mb-2 text-xs font-medium ${format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd") ? "inline-flex h-6 w-6 items-center justify-center rounded-full bg-teal-700 text-white" : ""}`}
                    >
                      {format(day, "d")}
                    </p>
                    <div className="space-y-1">
                      {items.slice(0, 4).map((item) => (
                        <div key={item.id} className={`overflow-hidden rounded-lg border ${item.actual ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-teal-300 bg-teal-50 text-teal-900"}`}>
                          <button type="button" onClick={() => openEvent(item)}
                            className="block w-full min-w-0 px-2 py-1.5 text-left text-[10px] font-medium leading-tight">
                            <span className="mr-1 font-medium">{item.code}</span>
                            {item.time && <span>{item.time} · </span>}
                            {item.operationName !== "Sans opération" && <span>{item.operationName} · </span>}
                            {item.title}
                          </button>
                          {permissionGranted(permissions, 'calendar.export') && <button type="button" title="Ajouter à Outlook" aria-label={`Ajouter ${item.title} à Outlook`}
                            onClick={() => exportOutlook([item], `monpetitpro-${item.id}.ics`)}
                            className="flex w-full items-center gap-1 border-t border-current/10 px-2 py-1 text-left text-[9px] font-medium hover:bg-white/50">
                            <CalendarDays size={11} /> Ajouter à Outlook
                          </button>}
                        </div>
                      ))}
                      {items.length > 4 && (
                        <p className="px-2 text-[10px] font-medium text-slate-400">
                          + {items.length - 4} autre(s)
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-px bg-slate-200 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 12 }, (_, monthIndex) => {
              const monthDate = new Date(year, monthIndex, 1);
              const items = filteredEvents.filter(
                (event) =>
                  parseISO(event.date).getFullYear() === year &&
                  parseISO(event.date).getMonth() === monthIndex,
              );
              return (
                <button
                  key={monthIndex}
                  type="button"
                  onClick={() => {
                    setCurrentDate(monthDate);
                    setDisplay("month");
                  }}
                  className="min-h-52 bg-white p-5 text-left hover:bg-teal-50/30"
                >
                  <h3 className="text-sm font-medium capitalize text-slate-950">
                    {format(monthDate, "MMMM", { locale: fr })}
                  </h3>
                  <p className="mt-1 text-[10px] font-medium text-slate-400">
                    {items.length} événement(s)
                  </p>
                  <div className="mt-4 space-y-2">
                    {items.slice(0, 5).map((item) => (
                      <div key={item.id} className="flex gap-2 text-[10px]">
                        <span
                          className={`mt-1 h-2 w-2 shrink-0 rounded-full ${item.actual ? "bg-emerald-500" : "bg-teal-400"}`}
                        />
                        <span className="font-medium text-slate-600">
                          {format(parseISO(item.date), "dd")} ·{" "}
                          {item.operationName} · {item.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {eventForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-800/50 p-4 backdrop-blur-sm">
          <form
            onSubmit={saveManualEvent}
            className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-teal-700">
                  Agenda libre
                </p>
                <h2 className="text-xl font-medium">
                  {eventForm.id ? "Modifier l’événement" : "Nouvel événement"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEventForm(null)}
                className="rounded-full p-2 text-slate-400"
              >
                <X />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <FieldLabel>Titre *</FieldLabel>
                <TextInput
                  required
                  value={eventForm.title}
                  onChange={(event) =>
                    setEventForm({ ...eventForm, title: event.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Date *</FieldLabel>
                  <TextInput
                    required
                    type="date"
                    value={eventForm.event_date}
                    onChange={(event) =>
                      setEventForm({
                        ...eventForm,
                        event_date: event.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <FieldLabel>Heure</FieldLabel>
                  <TextInput
                    type="time"
                    value={eventForm.event_time ?? ""}
                    onChange={(event) =>
                      setEventForm({
                        ...eventForm,
                        event_time: event.target.value || null,
                      })
                    }
                  />
                </div>
              </div>
              <div>
                <FieldLabel>Opération</FieldLabel>
                <SelectInput
                  value={eventForm.operation_id ?? ""}
                  onChange={(event) =>
                    setEventForm({
                      ...eventForm,
                      operation_id: event.target.value || null,
                    })
                  }
                >
                  <option value="">Sans opération</option>
                  {operations.map((operation) => (
                    <option key={operation.id} value={operation.id}>
                      {operation.name}
                    </option>
                  ))}
                </SelectInput>
              </div>
              <div>
                <FieldLabel>Description</FieldLabel>
                <TextArea
                  rows={4}
                  value={eventForm.description ?? ""}
                  onChange={(event) =>
                    setEventForm({
                      ...eventForm,
                      description: event.target.value || null,
                    })
                  }
                />
              </div>
            </div>
            <div className="mt-6 flex justify-between border-t border-slate-200 pt-5">
              {eventForm.id ? (
                <button
                  type="button"
                  onClick={() => void deleteManualEvent()}
                  className="text-sm font-medium text-red-600"
                >
                  Supprimer
                </button>
              ) : (
                <span />
              )}
              <button
                type="submit"
                className="rounded-xl bg-teal-800 px-5 py-2.5 text-sm font-medium text-white"
              >
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
