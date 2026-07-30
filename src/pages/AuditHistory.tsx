import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, History } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatAuditChanges } from '../lib/audit';
import { OPERATION_FIELD_PERMISSION_DEFINITIONS } from '../lib/operationFieldPermissions';
import type { Profile } from '../types/domain';

interface AuditRecord {
  id: number;
  table_name: string;
  record_id: string | null;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  changed_by: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  changed_at: string;
}

const PAGE_SIZE = 50;
const fieldLabels = Object.fromEntries(OPERATION_FIELD_PERMISSION_DEFINITIONS.map((definition) => [
  definition.field,
  definition.label.replace(/^Modifier [«"]?|[»"]?$/g, ''),
]));
const tableLabels: Record<string, string> = {
  operations: 'Opérations', observations: 'Observations', profiles: 'Utilisateurs',
  operation_program_sections: 'Sections programme', operation_program_lines: 'Lignes programme',
  operation_budget_lines: 'Budgets', operation_subsidies: 'Subventions',
  operation_objectives: 'Objectifs', operation_significant_works: 'Travaux significatifs',
  documents: 'Documents',
};

export default function AuditHistory() {
  const [rows, setRows] = useState<AuditRecord[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [filters, setFilters] = useState({ from: '', to: '', user: '', table: '', action: '' });

  const load = useCallback(async () => {
    let query = supabase.from('audit_log').select('*').order('changed_at', { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    if (filters.from) query = query.gte('changed_at', `${filters.from}T00:00:00`);
    if (filters.to) query = query.lte('changed_at', `${filters.to}T23:59:59`);
    if (filters.user) query = query.eq('changed_by', filters.user);
    if (filters.table) query = query.eq('table_name', filters.table);
    if (filters.action) query = query.eq('action', filters.action);
    const [auditResult, profileResult] = await Promise.all([
      query,
      supabase.from('profiles').select('id,email,display_name,initials,status').order('display_name'),
    ]);
    const firstError = auditResult.error ?? profileResult.error;
    if (firstError) setError(firstError.message);
    else {
      setRows((auditResult.data as AuditRecord[] | null) ?? []);
      setProfiles((profileResult.data as Profile[] | null) ?? []);
    }
    setLoading(false);
  }, [filters, page]);
  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [load]);
  const profileById = useMemo(() => new Map(profiles.map((profile) => [profile.id, profile])), [profiles]);
  const tables = [...new Set(rows.map((row) => row.table_name))].sort();
  const recordName = (row: AuditRecord) => String(
    row.new_values?.name ?? row.old_values?.name
    ?? row.new_values?.label ?? row.old_values?.label
    ?? row.new_values?.description ?? row.old_values?.description
    ?? row.record_id ?? '—',
  );

  return <div className="mx-auto max-w-[1500px] pb-12">
    <header className="mb-7"><p className="text-[10px] uppercase tracking-[0.28em] text-teal-700">Administration</p>
      <h1 className="mt-1 flex items-center gap-3 text-4xl font-semibold tracking-tight text-slate-950"><History className="text-teal-700" /> Historique des modifications</h1>
      <p className="mt-2 text-sm text-slate-500">Qui a créé, modifié ou supprimé chaque donnée métier.</p>
    </header>
    <div className="mb-5 grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-white p-4 lg:grid-cols-5">
      <input aria-label="Depuis" type="date" value={filters.from} onChange={(event) => { setPage(0); setFilters({ ...filters, from: event.target.value }); }} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
      <input aria-label="Jusqu’au" type="date" value={filters.to} onChange={(event) => { setPage(0); setFilters({ ...filters, to: event.target.value }); }} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
      <select aria-label="Utilisateur" value={filters.user} onChange={(event) => { setPage(0); setFilters({ ...filters, user: event.target.value }); }} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
        <option value="">Tous les utilisateurs</option>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.display_name || profile.email}</option>)}
      </select>
      <select aria-label="Type de donnée" value={filters.table} onChange={(event) => { setPage(0); setFilters({ ...filters, table: event.target.value }); }} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
        <option value="">Toutes les données</option>{tables.map((table) => <option key={table} value={table}>{tableLabels[table] ?? table}</option>)}
      </select>
      <select aria-label="Action" value={filters.action} onChange={(event) => { setPage(0); setFilters({ ...filters, action: event.target.value }); }} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
        <option value="">Toutes les actions</option><option value="INSERT">Création</option><option value="UPDATE">Modification</option><option value="DELETE">Suppression</option>
      </select>
    </div>
    {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</div>}
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {loading ? <p className="p-10 text-center text-sm text-slate-400">Chargement de l’historique…</p> : rows.map((row) => {
        const actor = row.changed_by ? profileById.get(row.changed_by) : null;
        const changes = formatAuditChanges(row.old_values, row.new_values, fieldLabels);
        return <div key={row.id} className="border-b border-slate-100">
          <button type="button" onClick={() => setExpanded(expanded === row.id ? null : row.id)} className="grid w-full grid-cols-[24px_130px_1fr_180px_170px] items-center gap-3 px-4 py-4 text-left text-xs hover:bg-slate-50">
            {expanded === row.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <span className={`w-fit rounded-full px-2 py-1 ${row.action === 'INSERT' ? 'bg-emerald-100 text-emerald-800' : row.action === 'DELETE' ? 'bg-rose-100 text-rose-800' : 'bg-stone-100 text-stone-800'}`}>
              {row.action === 'INSERT' ? 'CRÉATION' : row.action === 'DELETE' ? 'SUPPRESSION' : 'MODIFICATION'}
            </span>
            <span><strong>{tableLabels[row.table_name] ?? row.table_name}</strong> · {recordName(row)}</span>
            <span>{actor?.display_name || actor?.email || 'Système'}</span>
            <span>{new Date(row.changed_at).toLocaleString('fr-FR')}</span>
          </button>
          {expanded === row.id && <div className="bg-slate-50 px-12 py-4">
            <table className="w-full text-xs"><thead><tr className="text-left text-slate-500"><th className="py-2">Champ</th><th>Avant</th><th>Après</th></tr></thead>
              <tbody>{changes.map((change) => <tr key={change.key} className="border-t border-slate-200"><td className="py-2 font-medium">{change.label}</td><td className="pr-4 text-slate-600">{change.before}</td><td className="text-slate-900">{change.after}</td></tr>)}</tbody>
            </table>
            {!changes.length && <p className="text-slate-400">Aucune différence métier affichable.</p>}
          </div>}
        </div>;
      })}
      {!loading && !rows.length && <p className="p-10 text-center text-sm text-slate-400">Aucun événement pour ces filtres.</p>}
    </div>
    <div className="mt-4 flex justify-end gap-2"><button disabled={page === 0} onClick={() => setPage((value) => value - 1)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs disabled:opacity-40">Précédent</button>
      <button disabled={rows.length < PAGE_SIZE} onClick={() => setPage((value) => value + 1)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs disabled:opacity-40">Suivant</button></div>
  </div>;
}
