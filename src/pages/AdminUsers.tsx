import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ChevronRight, KeyRound, RefreshCw, Send, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PERMISSION_GROUPS, ROLE_COLORS, permissionGranted } from '../lib/accessControl';
import { buildRolePermissionRows, validateNewUser } from '../lib/roleAdministration';
import { useStore } from '../store/useStore';
import type { CustomRole, PermissionKey, Profile } from '../types/domain';

type Tab = 'users' | 'roles' | 'transfer';
type RoleRow = CustomRole & { permissions: PermissionKey[] };

const emptyRole = (): RoleRow => ({
  id: '', name: '', description: '', color_key: 'teal', is_active: true, is_system: false, permissions: [],
});

async function invokeAdmin(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('admin-users', { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error as string);
  return data;
}

export default function AdminUsers() {
  const currentUser = useStore((state) => state.user);
  const permissions = useStore((state) => state.permissions);
  const [tab, setTab] = useState<Tab>('users');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [roleDraft, setRoleDraft] = useState<RoleRow>(emptyRole);
  const [newUser, setNewUser] = useState({ mode: 'invite' as 'invite' | 'create', email: '', displayName: '', initials: '', roleId: '', password: '' });
  const [confirmTransfer, setConfirmTransfer] = useState(false);

  const canViewUsers = permissionGranted(permissions, 'admin.users.view');
  const canManageUsers = permissionGranted(permissions, 'admin.users.manage');
  const canInvite = permissionGranted(permissions, 'admin.users.invite');
  const canSuspend = permissionGranted(permissions, 'admin.users.suspend');
  const canManageRoles = permissionGranted(permissions, 'admin.roles.manage');
  const canTransfer = permissionGranted(permissions, 'admin.demo_transfer');

  const load = useCallback(async () => {
    setLoading(true);
    const [profileResult, roleResult, permissionResult] = await Promise.all([
      supabase.from('profiles').select('id,email,display_name,initials,role,custom_role_id,status,is_owner,created_at,updated_at').order('display_name'),
      supabase.from('custom_roles').select('id,name,description,color_key,is_active,is_system,created_at,updated_at').order('name'),
      supabase.from('custom_role_permissions').select('role_id,permission_key'),
    ]);
    const error = profileResult.error ?? roleResult.error ?? permissionResult.error;
    if (error) setNotice({ kind: 'error', text: error.message });
    else {
      const permissionRows = (permissionResult.data ?? []) as Array<{ role_id: string; permission_key: PermissionKey }>;
      setProfiles((profileResult.data as Profile[] | null) ?? []);
      setRoles(((roleResult.data as CustomRole[] | null) ?? []).map((role) => ({
        ...role,
        permissions: permissionRows.filter((row) => row.role_id === role.id).map((row) => row.permission_key),
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const run = async (action: () => Promise<void>, success: string) => {
    setBusy(true); setNotice(null);
    try { await action(); setNotice({ kind: 'ok', text: success }); await load(); }
    catch (error) { setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Une erreur est survenue.' }); }
    finally { setBusy(false); }
  };

  const roleById = useMemo(() => new Map(roles.map((role) => [role.id, role])), [roles]);
  const roleColor = (key: string | undefined) => ROLE_COLORS.find((color) => color.key === key) ?? ROLE_COLORS[0];

  const saveRole = () => run(async () => {
    if (!roleDraft.name.trim()) throw new Error('Le nom du rôle est obligatoire.');
    let roleId = roleDraft.id;
    if (roleId) {
      const { error } = await supabase.from('custom_roles').update({
        name: roleDraft.name.trim(), description: roleDraft.description?.trim() || null,
        color_key: roleDraft.color_key, is_active: roleDraft.is_active,
      }).eq('id', roleId);
      if (error) throw error;
      const { error: deleteError } = await supabase.from('custom_role_permissions').delete().eq('role_id', roleId);
      if (deleteError) throw deleteError;
    } else {
      const { data, error } = await supabase.from('custom_roles').insert({
        name: roleDraft.name.trim(), description: roleDraft.description?.trim() || null,
        color_key: roleDraft.color_key, created_by: currentUser?.id,
      }).select('id').single();
      if (error) throw error;
      roleId = data.id as string;
    }
    const rows = buildRolePermissionRows(roleId, roleDraft.permissions);
    if (rows.length) {
      const { error } = await supabase.from('custom_role_permissions').insert(rows);
      if (error) throw error;
    }
    setRoleDraft(emptyRole());
  }, roleDraft.id ? 'Rôle mis à jour.' : 'Rôle créé et disponible pour les utilisateurs.');

  const createUser = () => {
    const validation = validateNewUser(newUser);
    if (validation) { setNotice({ kind: 'error', text: validation }); return; }
    void run(async () => {
      await invokeAdmin({ action: newUser.mode, email: newUser.email, password: newUser.password,
        displayName: newUser.displayName, initials: newUser.initials, roleId: newUser.roleId || null });
      setNewUser({ mode: 'invite', email: '', displayName: '', initials: '', roleId: '', password: '' });
    }, newUser.mode === 'invite' ? 'Invitation envoyée.' : 'Compte créé et activé.');
  };

  const updateProfile = (id: string, patch: Partial<Profile>) => {
    setProfiles((current) => current.map((profile) => profile.id === id ? { ...profile, ...patch } : profile));
  };

  const tabs: Array<{ id: Tab; label: string; visible: boolean }> = [
    { id: 'users', label: 'Utilisateurs', visible: canViewUsers },
    { id: 'roles', label: 'Rôles et autorisations', visible: permissionGranted(permissions, 'admin.roles.view') },
    { id: 'transfer', label: 'Sécuriser la démo', visible: canTransfer },
  ];

  return (
    <div className="mx-auto max-w-7xl pb-16">
      <header className="mb-7 overflow-hidden rounded-3xl border border-teal-200 bg-[linear-gradient(120deg,#f0fdfa_0%,#ffffff_55%,#fefce8_100%)] p-7 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-teal-700 p-3 text-white"><ShieldCheck size={28} /></div>
            <div><p className="text-xs font-black uppercase tracking-[.22em] text-teal-700">Administration sécurisée</p>
              <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Équipe et droits d’accès</h1>
              <p className="mt-1 text-sm text-slate-600">Chaque personne reçoit un rôle précis. Les changements sont conservés dans la base.</p></div>
          </div>
          <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:border-teal-400">
            <RefreshCw size={16} /> Actualiser
          </button>
        </div>
      </header>

      <nav className="mb-6 flex flex-wrap gap-2" aria-label="Sections d’administration">
        {tabs.filter((item) => item.visible).map((item) => <button key={item.id} type="button" onClick={() => setTab(item.id)}
          className={`rounded-full px-5 py-2.5 text-sm font-black transition ${tab === item.id ? 'bg-teal-700 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-600 hover:border-teal-300'}`}>{item.label}</button>)}
      </nav>

      {notice && <div role="status" className={`mb-6 rounded-xl border px-4 py-3 text-sm font-semibold ${notice.kind === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-red-200 bg-red-50 text-red-900'}`}>{notice.text}</div>}
      {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">Chargement de l’administration…</div> : null}

      {!loading && tab === 'users' && canViewUsers && <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4"><Users size={20} className="text-teal-700" /><div><h2 className="font-black text-slate-950">Comptes autorisés</h2><p className="text-xs text-slate-500">{profiles.length} compte(s)</p></div></div>
          <div className="divide-y divide-slate-100">
            {profiles.map((profile) => {
              const color = roleColor(roleById.get(profile.custom_role_id ?? '')?.color_key);
              return <div key={profile.id} className="grid gap-3 p-5 lg:grid-cols-[minmax(190px,1fr)_110px_210px_130px] lg:items-center">
                <div><input disabled={!canManageUsers} value={profile.display_name ?? ''} onChange={(event) => updateProfile(profile.id, { display_name: event.target.value })} className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 font-bold text-slate-900 hover:border-slate-200 disabled:opacity-100" />
                  <p className="px-2 text-xs text-slate-500">{profile.email}</p>{profile.is_owner && <span className="ml-2 mt-2 inline-block rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black uppercase text-amber-900">Propriétaire</span>}</div>
                <input disabled={!canManageUsers} aria-label="Initiales" maxLength={6} value={profile.initials ?? ''} onChange={(event) => updateProfile(profile.id, { initials: event.target.value.toUpperCase() })} className="rounded-lg border border-slate-200 px-3 py-2 text-center font-black uppercase disabled:bg-slate-50" />
                <select disabled={!canManageUsers} value={profile.custom_role_id ?? ''} onChange={(event) => updateProfile(profile.id, { custom_role_id: event.target.value || null })} className={`rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold ${color.badgeClass}`}><option value="">Sans rôle</option>{roles.filter((role) => role.is_active).map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select>
                <div className="flex flex-col gap-2">{canManageUsers && <button disabled={busy} type="button" onClick={() => void run(async () => { await invokeAdmin({ action: 'update', targetUserId: profile.id, displayName: profile.display_name, initials: profile.initials, roleId: profile.custom_role_id }); }, 'Utilisateur mis à jour.')} className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-black text-white hover:bg-teal-800">Enregistrer</button>}
                  {canSuspend && profile.id !== currentUser?.id && <button disabled={busy} type="button" onClick={() => void run(async () => { await invokeAdmin({ action: profile.status === 'suspended' ? 'reactivate' : 'suspend', targetUserId: profile.id }); }, profile.status === 'suspended' ? 'Compte réactivé.' : 'Compte suspendu.')} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:border-amber-400">{profile.status === 'suspended' ? 'Réactiver' : 'Suspendre'}</button>}</div>
              </div>;
            })}
          </div>
        </section>

        {canInvite && <aside className="h-fit rounded-2xl border border-teal-200 bg-teal-50/60 p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-3"><UserPlus className="text-teal-700" /><div><h2 className="font-black text-slate-950">Ajouter une personne</h2><p className="text-xs text-slate-500">Invitation recommandée</p></div></div>
          <div className="mb-4 grid grid-cols-2 rounded-xl bg-white p-1"><button type="button" onClick={() => setNewUser({ ...newUser, mode: 'invite' })} className={`rounded-lg p-2 text-xs font-black ${newUser.mode === 'invite' ? 'bg-teal-700 text-white' : 'text-slate-500'}`}>Inviter</button><button type="button" onClick={() => setNewUser({ ...newUser, mode: 'create' })} className={`rounded-lg p-2 text-xs font-black ${newUser.mode === 'create' ? 'bg-teal-700 text-white' : 'text-slate-500'}`}>Créer directement</button></div>
          <div className="space-y-3"><input type="email" placeholder="adresse@entreprise.fr" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" /><input placeholder="Nom affiché" value={newUser.displayName} onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" /><div className="grid grid-cols-[90px_1fr] gap-2"><input placeholder="Initiales" maxLength={6} value={newUser.initials} onChange={(e) => setNewUser({ ...newUser, initials: e.target.value.toUpperCase() })} className="rounded-xl border border-slate-200 px-3 py-2.5 uppercase" /><select value={newUser.roleId} onChange={(e) => setNewUser({ ...newUser, roleId: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2.5"><option value="">Rôle à choisir</option>{roles.filter((role) => role.is_active).map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></div>{newUser.mode === 'create' && <input type="password" placeholder="Mot de passe temporaire (12+)" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />}
            <button disabled={busy} type="button" onClick={createUser} className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3 font-black text-white hover:bg-teal-800">{newUser.mode === 'invite' ? <Send size={17} /> : <KeyRound size={17} />}{newUser.mode === 'invite' ? 'Envoyer l’invitation' : 'Créer le compte'}</button></div>
        </aside>}
      </div>}

      {!loading && tab === 'roles' && <div className="grid gap-6 lg:grid-cols-[310px_1fr]">
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-3 flex items-center justify-between px-2"><h2 className="font-black">Rôles enregistrés</h2>{canManageRoles && <button type="button" onClick={() => setRoleDraft(emptyRole())} className="rounded-lg bg-teal-50 px-3 py-2 text-xs font-black text-teal-800">+ Nouveau</button>}</div><div className="space-y-2">{roles.map((role) => { const color = roleColor(role.color_key); return <button key={role.id} type="button" onClick={() => setRoleDraft({ ...role, permissions: [...role.permissions] })} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${roleDraft.id === role.id ? 'border-teal-500 bg-teal-50' : 'border-slate-100 hover:border-slate-300'}`}><span className={`h-3 w-3 rounded-full ${color.swatchClass}`} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-black">{role.name}</span><span className="text-xs text-slate-500">{role.permissions.length} autorisation(s)</span></span><ChevronRight size={16} /></button>; })}</div></aside>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="grid gap-4 md:grid-cols-[1fr_220px]"><div><label className="text-xs font-black uppercase tracking-wider text-slate-500">Nom du rôle</label><input disabled={!canManageRoles || roleDraft.is_system} value={roleDraft.name} onChange={(e) => setRoleDraft({ ...roleDraft, name: e.target.value })} placeholder="Ex. Responsable de secteur" className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-lg font-black" /></div><div><label className="text-xs font-black uppercase tracking-wider text-slate-500">Couleur</label><div className="mt-2 flex flex-wrap gap-2">{ROLE_COLORS.map((color) => <button disabled={!canManageRoles || roleDraft.is_system} aria-label={color.label} title={color.label} key={color.key} type="button" onClick={() => setRoleDraft({ ...roleDraft, color_key: color.key })} className={`h-7 w-7 rounded-full ${color.swatchClass} ${roleDraft.color_key === color.key ? 'ring-2 ring-slate-800 ring-offset-2' : ''}`} />)}</div></div></div><textarea disabled={!canManageRoles || roleDraft.is_system} value={roleDraft.description ?? ''} onChange={(e) => setRoleDraft({ ...roleDraft, description: e.target.value })} placeholder="En une phrase, à qui sert ce rôle ?" className="mt-4 min-h-20 w-full rounded-xl border border-slate-200 px-4 py-3" />
          {roleDraft.is_system && <div className="mt-4 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">Rôle historique protégé. Créez un nouveau rôle pour personnaliser les droits.</div>}
          <div className="mt-6 space-y-5">{PERMISSION_GROUPS.map((group) => <fieldset key={group.key} className="rounded-2xl border border-slate-200 p-4"><legend className="px-2 font-black text-teal-900">{group.label}</legend><div className="grid gap-2 md:grid-cols-2">{group.permissions.map((permission) => { const checked = roleDraft.permissions.includes(permission.key); return <label key={permission.key} className={`flex cursor-pointer gap-3 rounded-xl border p-3 ${checked ? 'border-teal-300 bg-teal-50' : 'border-slate-100 bg-slate-50/60'}`}><input disabled={!canManageRoles || roleDraft.is_system} type="checkbox" checked={checked} onChange={() => setRoleDraft({ ...roleDraft, permissions: checked ? roleDraft.permissions.filter((key) => key !== permission.key) : [...roleDraft.permissions, permission.key] })} className="mt-1 h-4 w-4 accent-teal-700" /><span><span className="block text-sm font-black text-slate-800">{permission.label}</span><span className="block text-xs leading-relaxed text-slate-500">{permission.description}</span></span></label>; })}</div></fieldset>)}</div>
          {canManageRoles && !roleDraft.is_system && <div className="mt-6 flex justify-end"><button disabled={busy} type="button" onClick={() => void saveRole()} className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-6 py-3 font-black text-white hover:bg-teal-800"><Check size={18} />{roleDraft.id ? 'Enregistrer le rôle' : 'Créer ce rôle'}</button></div>}
        </section>
      </div>}

      {!loading && tab === 'transfer' && canTransfer && <section className="mx-auto max-w-2xl rounded-3xl border border-amber-200 bg-white p-7 shadow-sm"><p className="text-xs font-black uppercase tracking-[.2em] text-amber-700">Opération unique et contrôlée</p><h2 className="mt-2 text-2xl font-black text-slate-950">Rattacher les données démo au compte de votre père</h2><p className="mt-3 leading-relaxed text-slate-600">Les opérations, observations et événements de <strong>demo@papa-immo.fr</strong> seront réattribués à <strong>sd@familleducastel.com</strong>. Les lignes ne sont ni copiées ni supprimées, ce qui évite les doublons. Le compte démo sera ensuite suspendu.</p><label className="mt-6 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 font-semibold text-amber-950"><input type="checkbox" checked={confirmTransfer} onChange={(e) => setConfirmTransfer(e.target.checked)} className="mt-1 h-4 w-4 accent-amber-700" />J’ai vérifié que le compte sd@familleducastel.com existe, fonctionne et doit recevoir toutes les données démo.</label><button disabled={busy || !confirmTransfer} type="button" onClick={() => void run(async () => { await invokeAdmin({ action: 'transfer-demo', sourceEmail: 'demo@papa-immo.fr', targetEmail: 'sd@familleducastel.com', initials: 'SD' }); setConfirmTransfer(false); }, 'Transfert terminé et compte démo suspendu.')} className="mt-5 w-full rounded-xl bg-amber-600 px-5 py-3 font-black text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-40">Transférer et sécuriser le compte démo</button></section>}
    </div>
  );
}
