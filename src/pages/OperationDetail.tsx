import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BadgeEuro, Building2, CalendarDays, Edit3, FileText, Flag, Plus, Trash2, UsersRound, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { can } from '../lib/permissions';
import { getStageConfig } from '../lib/stage';
import { buildObservationPayload, buildResolutionValidationPayload, EMPTY_OBSERVATION_FORM, getObservationStatus, normalizeObservation, type ObservationFormData, type ObservationRow } from '../lib/observationStatus';
import type { Operation, OperationSubsidy, OperationTypology, SuspensiveCondition } from '../types/domain';
import ObservationForm from '../components/observations/ObservationForm';
import ResolutionActions from '../components/observations/ResolutionActions';
import { triggerSuccessToast } from '../lib/toastUtils';

type DetailOperation = Partial<Operation> & Pick<Operation, 'id' | 'name'>;
type DetailObservation = ObservationRow & { status: string; is_dg: boolean };

function displayDate(value: unknown): string {
  return typeof value === 'string' && value ? new Date(`${value}T12:00:00`).toLocaleDateString('fr-FR') : '—';
}

function displayText(value: unknown): string {
  return value == null || value === '' ? '—' : String(value);
}

function Info({ label, value }: { label: string; value: unknown }) {
  return <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 break-words text-sm font-bold text-slate-800">{displayText(value)}</p></div>;
}

export default function OperationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const profile = useStore((state) => state.profile);
  const user = useStore((state) => state.user);
  const [operation, setOperation] = useState<DetailOperation | null>(null);
  const [observations, setObservations] = useState<DetailObservation[]>([]);
  const [typologies, setTypologies] = useState<OperationTypology[]>([]);
  const [subsidies, setSubsidies] = useState<OperationSubsidy[]>([]);
  const [conditions, setConditions] = useState<SuspensiveCondition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ObservationFormData | null>(null);
  const [editing, setEditing] = useState<DetailObservation | null>(null);
  const [saving, setSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void Promise.all([
      supabase.from('operations').select('*').eq('id', id).single(),
      supabase.from('observations').select('*').eq('operation_id', id).order('deadline_date'),
      supabase.from('operation_typologies').select('*').eq('operation_id', id),
      supabase.from('operation_subsidies').select('*').eq('operation_id', id),
      supabase.from('suspensive_conditions').select('*').eq('operation_id', id).order('deadline_date'),
    ]).then(([operationResult, observationResult, typologyResult, subsidyResult, conditionResult]) => {
      if (cancelled) return;
      const firstError = [operationResult, observationResult, typologyResult, subsidyResult, conditionResult].find((result) => result.error)?.error;
      if (firstError) setError(firstError.message);
      else {
        setOperation(operationResult.data as DetailOperation);
        setObservations(((observationResult.data ?? []) as DetailObservation[]).map(normalizeObservation));
        setTypologies((typologyResult.data as OperationTypology[] | null) ?? []);
        setSubsidies((subsidyResult.data as OperationSubsidy[] | null) ?? []);
        setConditions((conditionResult.data as SuspensiveCondition[] | null) ?? []);
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [id, refreshKey]);

  const responsibles = useMemo(() => [...new Set(observations.map((observation) => observation.responsible_person))].sort(), [observations]);
  const stage = getStageConfig(operation?.stage);

  const openEdit = (observation: DetailObservation) => {
    setEditing(observation);
    setForm({ operation_id: observation.operation_id, info_date: observation.info_date, description: observation.description, responsible_person: observation.responsible_person, deadline_date: observation.deadline_date, completion_date: observation.completion_date ?? '', resolution_date: observation.resolution_date ?? '', status: observation.status as ObservationFormData['status'], is_dg: observation.is_dg });
  };

  const saveObservation = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form || !user || !id) return;
    setSaving(true);
    const payload = buildObservationPayload(form, { userId: editing?.user_id ?? user.id, initials: editing?.author_initials ?? profile?.initials ?? user.email?.slice(0, 2).toUpperCase() ?? '??' });
    const result = editing ? await supabase.from('observations').update(payload).eq('id', editing.id) : await supabase.from('observations').insert(payload);
    if (result.error) setError(result.error.message); else { triggerSuccessToast(user.email, editing ? 'Observation modifiée.' : 'Observation ajoutée.'); setForm(null); setEditing(null); setRefreshKey((key) => key + 1); }
    setSaving(false);
  };

  const validateResolution = async (observation: DetailObservation) => {
    if (!user) return;
    const { error: updateError } = await supabase.from('observations').update(buildResolutionValidationPayload(user.id)).eq('id', observation.id);
    if (updateError) setError(updateError.message); else setRefreshKey((key) => key + 1);
  };

  const deleteObservation = async (observation: DetailObservation) => {
    if (!window.confirm('Supprimer cette observation ?')) return;
    const { error: deleteError } = await supabase.from('observations').delete().eq('id', observation.id);
    if (deleteError) setError(deleteError.message); else setRefreshKey((key) => key + 1);
  };

  const deleteOperation = async () => {
    if (!operation || !window.confirm(`Supprimer « ${operation.name} » et ses observations ?`)) return;
    const observationDelete = await supabase.from('observations').delete().eq('operation_id', operation.id);
    if (observationDelete.error) { setError(observationDelete.error.message); return; }
    const operationDelete = await supabase.from('operations').delete().eq('id', operation.id);
    if (operationDelete.error) setError(operationDelete.error.message); else navigate('/');
  };

  if (loading) return <div className="flex min-h-[55vh] items-center justify-center text-slate-500">Chargement de l’opération…</div>;
  if (!operation) return <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-red-900">{error || 'Opération introuvable.'}</div>;

  const planning: [string, unknown][] = [
    ['Contractuelle', operation.contractual_delivery_date], ['Prévisionnelle', operation.expected_delivery_date], ['Réelle', operation.actual_delivery_date],
    ['MEG prévisionnelle', operation.management_expected_date], ['MEG réelle', operation.management_actual_date], ['Fin GPA', operation.gpa_end_date],
  ];

  return (
    <div className="mx-auto max-w-[1500px] pb-16">
      <button type="button" onClick={() => navigate('/')} className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-teal-800"><ArrowLeft size={17} /> Toutes les opérations</button>
      <header className="mb-7 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div style={{ backgroundColor: stage.color, color: stage.textColor }} className="px-7 py-4"><p className="text-xs font-black uppercase tracking-[0.24em]">Stade {operation.stage ?? '—'} · {stage.label}</p></div><div className="flex flex-col justify-between gap-5 px-7 py-6 lg:flex-row lg:items-end"><div><p className="text-[10px] font-black uppercase tracking-[0.24em] text-teal-700">{operation.operation_type ?? 'Type non renseigné'} · {operation.of_number || 'N° OF —'}</p><h1 className="mt-1 max-w-5xl text-4xl font-black tracking-tight text-slate-950">{operation.name}</h1><p className="mt-2 text-sm font-semibold text-slate-500">{[operation.department, operation.commune, operation.address].filter(Boolean).join(' · ') || 'Localisation non renseignée'}</p></div><div className="flex gap-2">{can(profile?.role, 'contribute') && <button type="button" onClick={() => navigate(`/operations/${operation.id}/edit`)} className="inline-flex items-center gap-2 rounded-xl bg-teal-800 px-4 py-2.5 text-sm font-black text-white"><Edit3 size={16} /> Modifier</button>}{can(profile?.role, 'deleteOperation') && <button type="button" onClick={() => void deleteOperation()} className="rounded-xl border border-red-200 p-2.5 text-red-600 hover:bg-red-50"><Trash2 size={17} /></button>}</div></div></header>
      {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-900">{error}</div>}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-800"><UsersRound size={17} className="text-teal-700" /> Équipe</h2><div className="mt-4 grid grid-cols-2 gap-3"><Info label="CTX" value={operation.project_manager} /><Info label="COP" value={operation.operations_manager} /><Info label="Assistante" value={operation.assistant_name} /><Info label="Gestionnaire" value={operation.manager_name} /><Info label="Promoteur" value={operation.promoter_name} /><Info label="Gesprojet" value={operation.gesprojet_number} /></div></section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-800"><Building2 size={17} className="text-teal-700" /> Programme</h2><div className="mt-4 grid grid-cols-3 gap-3"><Info label="Total" value={operation.total_housing_units} /><Info label="Collectifs" value={operation.collective_housing_units} /><Info label="Individuels" value={operation.individual_housing_units} /><Info label="PLUS" value={operation.plus_units} /><Info label="PLAI" value={operation.plai_units} /><Info label="PLS" value={operation.pls_units} /></div><p className="mt-4 text-xs text-slate-500">{operation.certification || 'Certification non renseignée'} · {operation.thermal_regulation || 'Thermique non renseigné'} · {typologies.length} ligne(s) typologie</p></section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-800"><BadgeEuro size={17} className="text-teal-700" /> Finances</h2><div className="mt-4 grid grid-cols-2 gap-3"><Info label="Budget initial" value={operation.initial_budget == null ? null : Number(operation.initial_budget).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} /><Info label="Atterrissage" value={operation.final_budget == null ? null : Number(operation.final_budget).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} /></div><div className="mt-4 space-y-2">{subsidies.slice(0, 3).map((subsidy) => <div key={subsidy.id} className="flex justify-between gap-4 text-xs"><span className="font-bold text-slate-600">{subsidy.provider}</span><span className="font-black text-slate-900">{subsidy.amount?.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }) ?? '—'}</span></div>)}{subsidies.length === 0 && <p className="text-xs text-slate-400">Aucune subvention.</p>}</div></section>
      </div>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-800"><CalendarDays size={17} className="text-teal-700" /> Planning synthétique</h2><div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">{planning.map(([label, value]) => <div key={String(label)} className="rounded-xl bg-slate-950 p-4 text-white"><p className="text-[10px] font-black uppercase tracking-wider text-teal-300">{label}</p><p className="mt-2 text-sm font-black">{displayDate(value)}</p></div>)}</div></section>

      {(operation.is_objective || conditions.length > 0 || operation.synthesis_description) && <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">{operation.is_objective && <section className="rounded-2xl border border-teal-200 bg-teal-50 p-5"><h2 className="flex items-center gap-2 font-black text-teal-950"><Flag size={17} /> Objectif DMO {operation.objective_year}</h2><p className="mt-2 text-sm text-teal-800">{operation.total_housing_units ?? 0} logements rattachés à l’objectif.</p></section>}{conditions.length > 0 && <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><h2 className="font-black text-amber-950">Conditions suspensives</h2><div className="mt-3 space-y-2">{conditions.map((condition) => <p key={condition.id} className="text-xs text-amber-900"><strong>{condition.subject}</strong> · {condition.deadline_date ? displayDate(condition.deadline_date) : 'sans butoir'} {condition.completion_date ? '✓' : ''}</p>)}</div></section>}{operation.synthesis_description && <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="flex items-center gap-2 font-black text-slate-900"><FileText size={17} /> Synthèse</h2><p className="mt-3 line-clamp-6 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{operation.synthesis_description}</p></section>}</div>}

      <section className="mt-7 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between bg-slate-950 px-6 py-5 text-white"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-300">Suivi partagé</p><h2 className="text-xl font-black">Observations · {observations.length}</h2></div>{can(profile?.role, 'contribute') && <button type="button" onClick={() => { setEditing(null); setForm(EMPTY_OBSERVATION_FORM(operation.id)); }} className="inline-flex items-center gap-2 rounded-xl bg-teal-400 px-4 py-2 text-sm font-black text-slate-950"><Plus size={16} /> Ajouter</button>}</div>{observations.length === 0 ? <p className="p-10 text-center text-sm text-slate-400">Aucune observation pour cette opération.</p> : <div className="divide-y divide-slate-100">{observations.map((observation) => <div key={observation.id} className="grid grid-cols-1 items-center gap-4 px-6 py-5 md:grid-cols-[110px_minmax(250px,1fr)_130px_130px_150px]"><div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-700">{getObservationStatus(observation)}</span><p className="mt-2 text-[10px] font-bold text-slate-400">Auteur {observation.author_initials ?? '—'}</p></div><div><p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{observation.description}</p>{observation.is_dg && <span className="mt-2 inline-block rounded bg-amber-100 px-2 py-1 text-[10px] font-black text-amber-900">DG</span>}</div><Info label="Réalisateur" value={observation.responsible_person} /><div><p className="text-[10px] font-black uppercase text-slate-400">Butoir</p><p className="mt-1 text-xs font-bold">{displayDate(observation.deadline_date)}</p><p className="mt-2 text-[10px] font-black uppercase text-slate-400">Résolution</p><p className="mt-1 text-xs font-bold">{displayDate(observation.resolution_date)}</p></div><div className="flex justify-end gap-1">{can(profile?.role, 'contribute') && (!observation.resolution_validated_at || can(profile?.role, 'validateResolution')) && <button type="button" onClick={() => openEdit(observation)} className="rounded-lg p-2 text-slate-400 hover:bg-teal-50 hover:text-teal-700"><Edit3 size={16} /></button>}<ResolutionActions observation={observation} role={profile?.role} onValidate={() => void validateResolution(observation)} onDelete={() => void deleteObservation(observation)} /></div></div>)}</div>}</section>

      {form && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"><div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white"><div className="flex items-center justify-between border-b border-slate-200 px-6 py-5"><h2 className="text-xl font-black">{editing ? 'Modifier l’observation' : 'Nouvelle observation'}</h2><button type="button" onClick={() => setForm(null)} className="rounded-full p-2 text-slate-400"><X /></button></div><div className="p-6"><ObservationForm fixedOperation value={form} operations={[{ id: operation.id, name: operation.name }]} responsibles={responsibles} saving={saving} onChange={setForm} onSubmit={saveObservation} onCancel={() => setForm(null)} /></div></div></div>}
    </div>
  );
}
