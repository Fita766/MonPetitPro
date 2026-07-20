import { useEffect, useState } from "react";
import { History, ShieldCheck, UserCog } from "lucide-react";
import { supabase } from "../lib/supabase";
import {
  can,
  isSchemaMigrationError,
  SCHEMA_MIGRATION_MESSAGE,
} from "../lib/permissions";
import { useStore } from "../store/useStore";
import type { Profile, UserRole } from "../types/domain";

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrateur",
  responsable: "Responsable",
  contributeur: "Contributeur",
  lecteur: "Lecteur",
};

interface AuditRow {
  id: number;
  table_name: string;
  action: "INSERT" | "UPDATE" | "DELETE";
  changed_at: string;
  changed_by: string | null;
  profiles?: { display_name: string | null; email: string | null } | null;
}

export default function AdminUsers() {
  const currentProfile = useStore((state) => state.profile);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!can(currentProfile?.role, "administerUsers")) return;
    let cancelled = false;

    void Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, email, display_name, initials, role, created_at, updated_at",
        )
        .order("display_name", { ascending: true }),
      supabase
        .from("audit_log")
        .select(
          "id, table_name, action, changed_at, changed_by, profiles!audit_log_changed_by_fkey(display_name, email)",
        )
        .order("changed_at", { ascending: false })
        .limit(50),
    ]).then(([profileResult, auditResult]) => {
      if (cancelled) return;
      if (profileResult.error) {
        setMessage(
          isSchemaMigrationError(profileResult.error)
            ? SCHEMA_MIGRATION_MESSAGE
            : profileResult.error.message,
        );
      } else {
        setProfiles((profileResult.data as Profile[] | null) ?? []);
        setAuditRows((auditResult.data as unknown as AuditRow[] | null) ?? []);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [currentProfile?.role]);

  const updateLocalProfile = (id: string, patch: Partial<Profile>) => {
    setProfiles((current) =>
      current.map((profile) =>
        profile.id === id ? { ...profile, ...patch } : profile,
      ),
    );
  };

  const saveProfile = async (profile: Profile) => {
    setSavingId(profile.id);
    setMessage(null);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: profile.display_name,
        initials: profile.initials,
        role: profile.role,
      })
      .eq("id", profile.id);

    setMessage(
      error
        ? error.message
        : `Profil de ${profile.display_name || profile.email || "l’utilisateur"} enregistré.`,
    );
    setSavingId(null);
  };

  if (!can(currentProfile?.role, "administerUsers")) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-amber-900">
        <h1 className="text-xl font-bold">Accès réservé</h1>
        <p className="mt-2">Seul un administrateur peut attribuer les rôles.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl pb-12">
      <header className="mb-8 flex items-start gap-4">
        <div className="rounded-2xl bg-teal-950 p-3 text-white">
          <UserCog size={26} />
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-teal-700">
            Administration
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">
            Utilisateurs et permissions
          </h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Désignez les personnes autorisées à modifier les opérations, valider
            les résolutions ou administrer l’application.
          </p>
        </div>
      </header>

      {message && (
        <div className="mb-5 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
          {message}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid min-w-[720px] grid-cols-[minmax(180px,1fr)_90px_180px_110px] gap-4 border-b border-teal-200 bg-teal-50 px-5 py-3 text-xs font-black uppercase tracking-wider text-teal-900">
          <span>Utilisateur</span>
          <span>Initiales</span>
          <span>Rôle</span>
          <span className="sr-only">Action</span>
        </div>
        {loading ? (
          <p className="p-8 text-center text-slate-500">
            Chargement des profils…
          </p>
        ) : profiles.length === 0 ? (
          <p className="p-8 text-center text-slate-500">
            Aucun profil disponible.
          </p>
        ) : (
          profiles.map((profile) => (
            <div
              key={profile.id}
              className="grid min-w-[720px] grid-cols-[minmax(180px,1fr)_90px_180px_110px] items-center gap-4 border-b border-slate-100 px-5 py-4 last:border-b-0"
            >
              <div>
                <input
                  aria-label={`Nom de ${profile.email || profile.id}`}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-900 outline-none focus:border-teal-600"
                  value={profile.display_name ?? ""}
                  onChange={(event) =>
                    updateLocalProfile(profile.id, {
                      display_name: event.target.value,
                    })
                  }
                />
                <p className="mt-1 text-xs text-slate-500">{profile.email}</p>
              </div>
              <input
                aria-label={`Initiales de ${profile.email || profile.id}`}
                maxLength={6}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-center font-black uppercase outline-none focus:border-teal-600"
                value={profile.initials ?? ""}
                onChange={(event) =>
                  updateLocalProfile(profile.id, {
                    initials: event.target.value.toUpperCase(),
                  })
                }
              />
              <select
                aria-label={`Rôle de ${profile.email || profile.id}`}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 font-semibold outline-none focus:border-teal-600"
                value={profile.role}
                onChange={(event) =>
                  updateLocalProfile(profile.id, {
                    role: event.target.value as UserRole,
                  })
                }
              >
                {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(
                  ([role, label]) => (
                    <option key={role} value={role}>
                      {label}
                    </option>
                  ),
                )}
              </select>
              <button
                type="button"
                onClick={() => void saveProfile(profile)}
                disabled={savingId === profile.id}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-3 py-2 text-sm font-bold text-white transition hover:bg-teal-800 disabled:opacity-50"
              >
                <ShieldCheck size={16} />{" "}
                {savingId === profile.id ? "…" : "Valider"}
              </button>
            </div>
          ))
        )}
      </div>

      <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-teal-200 bg-teal-50 px-5 py-4 text-teal-950">
          <History size={18} className="text-teal-700" />
          <div>
            <h2 className="font-black">Historique des modifications</h2>
            <p className="text-xs text-teal-700">
              50 dernières actions enregistrées en base
            </p>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {auditRows.map((row) => (
            <div
              key={row.id}
              className="grid gap-1 px-5 py-3 text-xs sm:grid-cols-[150px_100px_1fr_180px] sm:items-center"
            >
              <span className="font-black uppercase text-slate-600">
                {row.table_name.replaceAll("_", " ")}
              </span>
              <span
                className={`w-fit rounded-full px-2 py-1 text-[10px] font-black ${row.action === "DELETE" ? "bg-red-100 text-red-800" : row.action === "INSERT" ? "bg-emerald-100 text-emerald-800" : "bg-teal-100 text-teal-800"}`}
              >
                {row.action}
              </span>
              <span className="font-semibold text-slate-600">
                {row.profiles?.display_name ||
                  row.profiles?.email ||
                  row.changed_by ||
                  "Système"}
              </span>
              <time className="text-slate-400">
                {new Date(row.changed_at).toLocaleString("fr-FR")}
              </time>
            </div>
          ))}
          {auditRows.length === 0 && (
            <p className="p-8 text-center text-sm text-slate-400">
              Aucune modification enregistrée.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
