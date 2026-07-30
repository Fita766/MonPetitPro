import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpenCheck,
  MapPin,
  Plus,
  Power,
  RefreshCw,
  Save,
  Search,
} from "lucide-react";
import { permissionGranted } from "../lib/accessControl";
import { normalizeReferenceLabel } from "../lib/references";
import { supabase } from "../lib/supabase";
import { useStore } from "../store/useStore";
import type {
  CommuneReference,
  ReferenceKind,
  ReferenceValue,
} from "../types/domain";

const REFERENCE_TABS: Array<{
  kind: ReferenceKind;
  label: string;
  description: string;
}> = [
  { kind: "ctx", label: "CTX", description: "Conducteurs de travaux" },
  { kind: "cop", label: "COP", description: "Conducteurs d’opération" },
  { kind: "assistant", label: "Assistantes", description: "Assistantes d’opération" },
  { kind: "gpa_assistant", label: "Assistantes GPA", description: "Suivi après livraison" },
  { kind: "manager", label: "Gestionnaires", description: "Gestion locative et partenaires" },
  {
    kind: "animation_provider",
    label: "Prestataires d’animation",
    description: "Animation sociale et accompagnement",
  },
  { kind: "promoter", label: "Promoteurs", description: "Promoteurs et vendeurs VEFA" },
  {
    kind: "certification",
    label: "Certifications",
    description: "Labels et certifications d’opération",
  },
  {
    kind: "thermal_regulation",
    label: "Réglementations thermiques",
    description: "RT, RE et niveaux de performance",
  },
  {
    kind: "program_nature",
    label: "Natures de programme",
    description: "Neuf, réhabilitation, mixte et catégories métier",
  },
];

type Tab = ReferenceKind | "communes";
type Notice = { kind: "ok" | "error"; text: string };

const emptyCommune = (): CommuneReference => ({
  id: "",
  name: "",
  insee_code: "",
  postal_code: "",
  department_code: "",
  department_name: "",
  region_name: "",
  housing_zone: "",
  is_active: true,
});

export default function AdminReferences() {
  const permissions = useStore((state) => state.permissions);
  const canManage = permissionGranted(permissions, "references.manage");
  const [tab, setTab] = useState<Tab>("ctx");
  const [references, setReferences] = useState<ReferenceValue[]>([]);
  const [communes, setCommunes] = useState<CommuneReference[]>([]);
  const [query, setQuery] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [communeDraft, setCommuneDraft] = useState<CommuneReference>(
    emptyCommune,
  );
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setNotice(null);
    const [referenceResult, communeResult] = await Promise.all([
      supabase
        .from("reference_values")
        .select("id,kind,label,is_active,sort_order,created_at,updated_at")
        .order("sort_order")
        .order("label"),
      supabase
        .from("communes")
        .select(
          "id,name,insee_code,postal_code,department_code,department_name,region_name,housing_zone,is_active",
        )
        .order("department_code")
        .order("name"),
    ]);
    const error = referenceResult.error ?? communeResult.error;
    if (error) setNotice({ kind: "error", text: error.message });
    else {
      setReferences((referenceResult.data as ReferenceValue[] | null) ?? []);
      setCommunes((communeResult.data as CommuneReference[] | null) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (action: () => Promise<void>, success: string) => {
    setBusy(true);
    setNotice(null);
    try {
      await action();
      setNotice({ kind: "ok", text: success });
      await load();
    } catch (error) {
      setNotice({
        kind: "error",
        text: error instanceof Error ? error.message : "Enregistrement impossible.",
      });
    } finally {
      setBusy(false);
    }
  };

  const selectedDefinition = REFERENCE_TABS.find((item) => item.kind === tab);
  const filteredReferences = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("fr");
    return references.filter(
      (row) =>
        row.kind === tab &&
        (!needle || row.label.toLocaleLowerCase("fr").includes(needle)),
    );
  }, [query, references, tab]);
  const filteredCommunes = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("fr");
    return communes.filter(
      (row) =>
        !needle ||
        [
          row.name,
          row.insee_code,
          row.postal_code,
          row.department_code,
          row.department_name,
          row.housing_zone,
        ].some((value) => value?.toLocaleLowerCase("fr").includes(needle)),
    );
  }, [communes, query]);

  const addReference = () =>
    void run(async () => {
      if (tab === "communes") return;
      const label = normalizeReferenceLabel(newLabel);
      const { error } = await supabase.from("reference_values").insert({
        kind: tab,
        label,
        sort_order:
          Math.max(
            0,
            ...references
              .filter((row) => row.kind === tab)
              .map((row) => row.sort_order),
          ) + 1,
      });
      if (error) throw error;
      setNewLabel("");
    }, "Valeur ajoutée au référentiel.");

  const saveReference = (row: ReferenceValue) =>
    void run(async () => {
      const { error } = await supabase
        .from("reference_values")
        .update({
          label: normalizeReferenceLabel(row.label),
          sort_order: row.sort_order,
          is_active: row.is_active,
        })
        .eq("id", row.id);
      if (error) throw error;
    }, "Référentiel mis à jour.");

  const saveCommune = (row: CommuneReference) =>
    void run(async () => {
      const payload = {
        name: normalizeReferenceLabel(row.name).toUpperCase(),
        insee_code: row.insee_code.trim(),
        postal_code: row.postal_code?.trim() || null,
        department_code: row.department_code.trim(),
        department_name: normalizeReferenceLabel(row.department_name),
        region_name: row.region_name?.trim() || null,
        housing_zone: row.housing_zone?.trim() || null,
        is_active: row.is_active,
      };
      if (!payload.insee_code || !payload.department_code) {
        throw new Error("Le code INSEE et le département sont obligatoires.");
      }
      const queryBuilder = row.id
        ? supabase.from("communes").update(payload).eq("id", row.id)
        : supabase.from("communes").insert(payload);
      const { error } = await queryBuilder;
      if (error) throw error;
      if (!row.id) setCommuneDraft(emptyCommune());
    }, row.id ? "Commune mise à jour." : "Commune ajoutée.");

  const updateReference = (id: string, patch: Partial<ReferenceValue>) =>
    setReferences((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  const updateCommune = (id: string, patch: Partial<CommuneReference>) =>
    setCommunes((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );

  return (
    <div className="mx-auto max-w-[1500px] pb-16">
      <header className="relative mb-7 overflow-hidden rounded-3xl border border-teal-200 bg-[#f7fbf8] p-7 shadow-sm">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full border-[36px] border-amber-100/70" />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-3xl">
            <div className="mb-3 flex items-center gap-3 text-teal-800">
              <BookOpenCheck size={23} />
              <p className="text-xs font-medium uppercase tracking-[.22em]">
                Dictionnaire métier
              </p>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
              Référentiels de MonPetitPro
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Une orthographe commune pour les équipes, partenaires et
              caractéristiques. Une valeur utilisée est désactivée plutôt que
              supprimée afin de préserver l’historique.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:border-teal-400"
          >
            <RefreshCw size={16} /> Actualiser
          </button>
        </div>
      </header>

      {notice && (
        <div
          role="status"
          className={`mb-5 rounded-xl border px-4 py-3 text-sm font-medium ${
            notice.kind === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-red-200 bg-red-50 text-red-900"
          }`}
        >
          {notice.text}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[270px_minmax(0,1fr)]">
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <button
            type="button"
            onClick={() => {
              setTab("communes");
              setQuery("");
            }}
            className={`mb-2 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium ${
              tab === "communes"
                ? "bg-teal-700 text-white"
                : "text-slate-700 hover:bg-teal-50"
            }`}
          >
            <MapPin size={17} /> Communes et zonage
          </button>
          <div className="my-2 border-t border-slate-100" />
          {REFERENCE_TABS.map((item) => (
            <button
              key={item.kind}
              type="button"
              onClick={() => {
                setTab(item.kind);
                setQuery("");
              }}
              className={`w-full rounded-xl px-3 py-2.5 text-left text-sm transition ${
                tab === item.kind
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
              }`}
            >
              {item.label}
            </button>
          ))}
        </aside>

        <main className="min-w-0">
          <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-medium uppercase tracking-[.18em] text-teal-700">
                {tab === "communes" ? "Territoires" : "Liste contrôlée"}
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-950">
                {tab === "communes"
                  ? "Communes et zonage"
                  : selectedDefinition?.label}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {tab === "communes"
                  ? `${communes.length} communes issues du périmètre DMO`
                  : selectedDefinition?.description}
              </p>
            </div>
            <div className="relative min-w-[280px]">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rechercher…"
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-teal-600"
              />
            </div>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">
              Chargement des référentiels…
            </div>
          ) : tab === "communes" ? (
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {canManage && (
                <div className="grid gap-2 border-b border-slate-200 bg-amber-50/60 p-4 md:grid-cols-4 xl:grid-cols-8">
                  {[
                    ["name", "Nom"],
                    ["insee_code", "Code INSEE"],
                    ["postal_code", "Code postal"],
                    ["department_code", "Dpt"],
                    ["department_name", "Département"],
                    ["region_name", "Région"],
                    ["housing_zone", "Zone ABC"],
                  ].map(([key, placeholder]) => (
                    <input
                      key={key}
                      value={
                        (communeDraft[
                          key as keyof CommuneReference
                        ] as string | null) ?? ""
                      }
                      onChange={(event) =>
                        setCommuneDraft({
                          ...communeDraft,
                          [key]: event.target.value,
                        })
                      }
                      placeholder={placeholder}
                      className="min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                    />
                  ))}
                  <button
                    disabled={busy}
                    type="button"
                    onClick={() => saveCommune(communeDraft)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-3 py-2 text-xs font-medium text-white"
                  >
                    <Plus size={14} /> Ajouter
                  </button>
                </div>
              )}
              <div className="max-h-[720px] overflow-auto">
                <table className="min-w-[1050px] w-full text-left text-xs">
                  <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-slate-500">
                    <tr>
                      {[
                        "Commune",
                        "INSEE",
                        "CP",
                        "Dpt",
                        "Département",
                        "Région",
                        "Zone",
                        "État",
                        "",
                      ].map((label) => (
                        <th key={label} className="px-3 py-3 font-medium uppercase">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCommunes.map((row) => (
                      <tr key={row.id} className="border-b border-slate-100">
                        {[
                          "name",
                          "insee_code",
                          "postal_code",
                          "department_code",
                          "department_name",
                          "region_name",
                          "housing_zone",
                        ].map((key) => (
                          <td key={key} className="p-2">
                            <input
                              disabled={!canManage}
                              value={
                                (row[
                                  key as keyof CommuneReference
                                ] as string | null) ?? ""
                              }
                              onChange={(event) =>
                                updateCommune(row.id, {
                                  [key]: event.target.value,
                                })
                              }
                              className="w-full min-w-20 rounded-lg border border-transparent bg-transparent px-2 py-1.5 disabled:opacity-100 enabled:hover:border-slate-200"
                            />
                          </td>
                        ))}
                        <td className="px-3 py-2">
                          <span
                            className={`rounded-full px-2 py-1 text-[10px] font-medium ${
                              row.is_active
                                ? "bg-emerald-100 text-emerald-900"
                                : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {row.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="p-2">
                          {canManage && (
                            <div className="flex">
                              <button
                                type="button"
                                title={row.is_active ? "Désactiver" : "Réactiver"}
                                onClick={() =>
                                  updateCommune(row.id, {
                                    is_active: !row.is_active,
                                  })
                                }
                                className="rounded-lg p-2 text-slate-400 hover:bg-amber-50 hover:text-amber-700"
                              >
                                <Power size={15} />
                              </button>
                              <button
                                type="button"
                                title="Enregistrer"
                                onClick={() => saveCommune(row)}
                                className="rounded-lg p-2 text-teal-700 hover:bg-teal-50"
                              >
                                <Save size={15} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : (
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {canManage && (
                <div className="flex gap-2 border-b border-slate-200 bg-teal-50/60 p-4">
                  <input
                    value={newLabel}
                    onChange={(event) => setNewLabel(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") addReference();
                    }}
                    placeholder={`Ajouter dans « ${selectedDefinition?.label} »`}
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm"
                  />
                  <button
                    disabled={busy}
                    type="button"
                    onClick={addReference}
                    className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-800"
                  >
                    <Plus size={16} /> Ajouter
                  </button>
                </div>
              )}
              <div className="divide-y divide-slate-100">
                {filteredReferences.map((row) => (
                  <div
                    key={row.id}
                    className="grid items-center gap-3 px-4 py-3 md:grid-cols-[80px_minmax(0,1fr)_100px_90px]"
                  >
                    <input
                      aria-label="Ordre"
                      disabled={!canManage}
                      type="number"
                      value={row.sort_order}
                      onChange={(event) =>
                        updateReference(row.id, {
                          sort_order: Number(event.target.value),
                        })
                      }
                      className="rounded-lg border border-slate-200 px-2 py-2 text-center text-xs disabled:bg-slate-50"
                    />
                    <input
                      disabled={!canManage}
                      value={row.label}
                      onChange={(event) =>
                        updateReference(row.id, { label: event.target.value })
                      }
                      className="rounded-lg border border-transparent bg-transparent px-3 py-2 text-sm font-medium text-slate-900 disabled:opacity-100 enabled:hover:border-slate-200"
                    />
                    <span
                      className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-medium ${
                        row.is_active
                          ? "bg-emerald-100 text-emerald-900"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {row.is_active ? "Active" : "Inactive"}
                    </span>
                    {canManage && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          title={row.is_active ? "Désactiver" : "Réactiver"}
                          onClick={() =>
                            updateReference(row.id, {
                              is_active: !row.is_active,
                            })
                          }
                          className="rounded-lg p-2 text-slate-400 hover:bg-amber-50 hover:text-amber-700"
                        >
                          <Power size={16} />
                        </button>
                        <button
                          type="button"
                          title="Enregistrer"
                          onClick={() => saveReference(row)}
                          className="rounded-lg p-2 text-teal-700 hover:bg-teal-50"
                        >
                          <Save size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {filteredReferences.length === 0 && (
                  <p className="p-10 text-center text-sm text-slate-400">
                    Aucune valeur ne correspond à la recherche.
                  </p>
                )}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
