import { useEffect, useState } from 'react';
import { ShieldCheck, UserCog } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { can, isSchemaMigrationError, SCHEMA_MIGRATION_MESSAGE } from '../lib/permissions';
import { useStore } from '../store/useStore';
import type { Profile, UserRole } from '../types/domain';

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrateur',
  responsable: 'Responsable',
  contributeur: 'Contributeur',
  lecteur: 'Lecteur',
};

export default function AdminUsers() {
  const currentProfile = useStore((state) => state.profile);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!can(currentProfile?.role, 'administerUsers')) return;
    let cancelled = false;

    void supabase
      .from('profiles')
      .select('id, email, display_name, initials, role, created_at, updated_at')
      .order('display_name', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setMessage(isSchemaMigrationError(error) ? SCHEMA_MIGRATION_MESSAGE : error.message);
        } else {
          setProfiles((data as Profile[] | null) ?? []);
        }
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentProfile?.role]);

  const updateLocalProfile = (id: string, patch: Partial<Profile>) => {
    setProfiles((current) => current.map((profile) => (
      profile.id === id ? { ...profile, ...patch } : profile
    )));
  };

  const saveProfile = async (profile: Profile) => {
    setSavingId(profile.id);
    setMessage(null);
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: profile.display_name,
        initials: profile.initials,
        role: profile.role,
      })
      .eq('id', profile.id);

    setMessage(error ? error.message : `Profil de ${profile.display_name || profile.email || 'l’utilisateur'} enregistré.`);
    setSavingId(null);
  };

  if (!can(currentProfile?.role, 'administerUsers')) {
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
        <div className="rounded-2xl bg-teal-950 p-3 text-white"><UserCog size={26} /></div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-teal-700">Administration</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Utilisateurs et permissions</h1>
          <p className="mt-2 max-w-2xl text-slate-600">Désignez les personnes autorisées à modifier les opérations, valider les résolutions ou administrer l’application.</p>
        </div>
      </header>

      {message && <div className="mb-5 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">{message}</div>}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[minmax(180px,1fr)_90px_180px_110px] gap-4 border-b border-slate-200 bg-slate-950 px-5 py-3 text-xs font-black uppercase tracking-wider text-slate-200">
          <span>Utilisateur</span><span>Initiales</span><span>Rôle</span><span className="sr-only">Action</span>
        </div>
        {loading ? (
          <p className="p-8 text-center text-slate-500">Chargement des profils…</p>
        ) : profiles.length === 0 ? (
          <p className="p-8 text-center text-slate-500">Aucun profil disponible.</p>
        ) : profiles.map((profile) => (
          <div key={profile.id} className="grid grid-cols-[minmax(180px,1fr)_90px_180px_110px] items-center gap-4 border-b border-slate-100 px-5 py-4 last:border-b-0">
            <div>
              <input
                aria-label={`Nom de ${profile.email || profile.id}`}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-900 outline-none focus:border-teal-600"
                value={profile.display_name ?? ''}
                onChange={(event) => updateLocalProfile(profile.id, { display_name: event.target.value })}
              />
              <p className="mt-1 text-xs text-slate-500">{profile.email}</p>
            </div>
            <input
              aria-label={`Initiales de ${profile.email || profile.id}`}
              maxLength={6}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-center font-black uppercase outline-none focus:border-teal-600"
              value={profile.initials ?? ''}
              onChange={(event) => updateLocalProfile(profile.id, { initials: event.target.value.toUpperCase() })}
            />
            <select
              aria-label={`Rôle de ${profile.email || profile.id}`}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 font-semibold outline-none focus:border-teal-600"
              value={profile.role}
              onChange={(event) => updateLocalProfile(profile.id, { role: event.target.value as UserRole })}
            >
              {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(([role, label]) => <option key={role} value={role}>{label}</option>)}
            </select>
            <button
              type="button"
              onClick={() => void saveProfile(profile)}
              disabled={savingId === profile.id}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-3 py-2 text-sm font-bold text-white transition hover:bg-teal-800 disabled:opacity-50"
            >
              <ShieldCheck size={16} /> {savingId === profile.id ? '…' : 'Valider'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
