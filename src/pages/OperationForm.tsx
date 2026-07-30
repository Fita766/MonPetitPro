import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BriefcaseBusiness, Building2, CalendarClock, CircleDollarSign, FileText, Flag, ListChecks, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { triggerSuccessToast } from '../lib/toastUtils';
import { isSchemaMigrationError, SCHEMA_MIGRATION_MESSAGE } from '../lib/permissions';
import { permissionGranted } from '../lib/accessControl';
import {
  OPERATION_FIELD_PERMISSION_DEFINITIONS,
  canEditOperationField,
} from '../lib/operationFieldPermissions';
import { calculateProgramTotals, createDefaultProgram } from '../lib/program';
import { selectCommune } from '../lib/references';
import { EMPTY_OPERATION_FORM, fromOperationRow, toOperationPayload, type OperationFormData } from '../lib/operationPayload';
import type { CommuneReference, OperationBudgetLine, OperationProgramLine, OperationProgramSection, OperationSubsidy, ReferenceValue, SuspensiveCondition } from '../types/domain';
import OperationTabs, { type OperationTab } from '../components/operations/OperationTabs';
import GeneralSection from '../components/operations/GeneralSection';
import ProgramSection from '../components/operations/ProgramSection';
import PlanningSection from '../components/operations/PlanningSection';
import BudgetSection from '../components/operations/BudgetSection';
import ConditionsSection from '../components/operations/ConditionsSection';
import ObjectivesSection from '../components/operations/ObjectivesSection';
import SynthesisSection from '../components/operations/SynthesisSection';

const tabs: OperationTab[] = [
  { id: 'general', label: 'Général', shortLabel: 'Général', icon: Building2 },
  { id: 'program', label: 'Programme', shortLabel: 'Programme', icon: BriefcaseBusiness },
  { id: 'planning', label: 'Planning', shortLabel: 'Planning', icon: CalendarClock },
  { id: 'budget', label: 'Budget & subventions', shortLabel: 'Budget', icon: CircleDollarSign },
  { id: 'conditions', label: 'Conditions suspensives', shortLabel: 'Conditions', icon: ListChecks },
  { id: 'objectives', label: 'Objectifs DMO', shortLabel: 'Objectifs', icon: Flag },
  { id: 'synthesis', label: 'Synthèse', shortLabel: 'Synthèse', icon: FileText },
];

export default function OperationForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const permissions = useStore((state) => state.permissions);
  const user = useStore((state) => state.user);
  const [activeTab, setActiveTab] = useState('general');
  const [form, setForm] = useState<OperationFormData>({ ...EMPTY_OPERATION_FORM });
  const [programSections, setProgramSections] = useState<OperationProgramSection[]>(() => createDefaultProgram().sections);
  const [programLines, setProgramLines] = useState<OperationProgramLine[]>([]);
  const [budgetLines, setBudgetLines] = useState<OperationBudgetLine[]>([]);
  const [subsidies, setSubsidies] = useState<OperationSubsidy[]>([]);
  const [conditions, setConditions] = useState<SuspensiveCondition[]>([]);
  const [loadedIds, setLoadedIds] = useState({
    programSections: [] as string[],
    programLines: [] as string[],
    conditions: [] as string[],
  });
  const [references, setReferences] = useState<ReferenceValue[]>([]);
  const [communes, setCommunes] = useState<CommuneReference[]>([]);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tabGroupKeys: Record<string, string[]> = {
    general: ['operation_fields_identity', 'operation_fields_team'],
    program: ['operation_fields_program'],
    planning: ['operation_fields_planning'],
    budget: ['operation_fields_budget'],
    objectives: ['operation_fields_objectives'],
    synthesis: ['operation_fields_synthesis'],
  };
  const exactTabPermission = OPERATION_FIELD_PERMISSION_DEFINITIONS.some((definition) =>
    tabGroupKeys[activeTab]?.includes(definition.groupKey) && permissions.includes(definition.key));
  const tabPermission = exactTabPermission || ({
    general: permissionGranted(permissions, 'operations.edit_identity') || permissionGranted(permissions, 'operations.edit_team'),
    program: permissionGranted(permissions, 'operations.edit_program'),
    planning: permissionGranted(permissions, 'operations.edit_planning'),
    budget: permissionGranted(permissions, 'operations.edit_budget'),
    conditions: permissionGranted(permissions, 'operations.edit_conditions'),
    objectives: permissionGranted(permissions, 'operations.edit_objectives') || permissionGranted(permissions, 'objectives.manage'),
    synthesis: permissionGranted(permissions, 'operations.edit_synthesis'),
  }[activeTab] ?? false);
  const editable = id ? tabPermission : permissionGranted(permissions, 'operations.create');
  const canEditField = useCallback((field: keyof OperationFormData) =>
    canEditOperationField(permissions, field, !id), [id, permissions]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const referenceRequest = supabase.from('reference_values')
      .select('id,kind,label,is_active,sort_order').order('sort_order').order('label');
    const communeRequest = supabase.from('communes')
      .select('id,name,insee_code,postal_code,department_code,department_name,region_name,housing_zone,is_active')
      .order('name');
    const requests = id ? [
      supabase.from('operations').select('*').eq('id', id).single(),
      supabase.from('operation_program_sections').select('*').eq('operation_id', id).order('sort_order'),
      supabase.from('operation_program_lines').select('*').eq('operation_id', id).order('sort_order'),
      supabase.from('operation_budget_lines').select('*').eq('operation_id', id).order('sort_order'),
      supabase.from('operation_subsidies').select('*').eq('operation_id', id).order('created_at'),
      supabase.from('suspensive_conditions').select('*').eq('operation_id', id).order('deadline_date'),
    ] : [];

    const [referenceResult, communeResult, results] = await Promise.all([
      referenceRequest,
      communeRequest,
      Promise.all(requests),
    ]);
    if (referenceResult.data) setReferences(referenceResult.data as ReferenceValue[]);
    if (communeResult.data) setCommunes(communeResult.data as CommuneReference[]);
    const referenceError = referenceResult.error ?? communeResult.error;
    if (referenceError) setError(referenceError.message);

    if (id) {
      const firstError = results.find((result) => result.error)?.error;
      if (firstError) {
        setError(isSchemaMigrationError(firstError) ? SCHEMA_MIGRATION_MESSAGE : firstError.message);
      } else {
        const operation = results[0].data as Record<string, unknown>;
        const loadedSections = (results[1].data ?? []) as OperationProgramSection[];
        const loadedLines = (results[2].data ?? []) as OperationProgramLine[];
        const loadedBudgetLines = (results[3].data ?? []) as OperationBudgetLine[];
        const loadedSubsidies = (results[4].data ?? []) as OperationSubsidy[];
        const loadedConditions = (results[5].data ?? []) as SuspensiveCondition[];
        setForm(fromOperationRow(operation));
        if (loadedSections.length) {
          setProgramSections(loadedSections);
          setProgramLines(loadedLines);
        } else {
          const fallback = createDefaultProgram();
          setProgramSections(fallback.sections);
          setProgramLines(fallback.lines);
        }
        setBudgetLines(loadedBudgetLines);
        setSubsidies(loadedSubsidies);
        setConditions(loadedConditions);
        setLoadedIds({
          programSections: loadedSections.flatMap((row) => row.id ? [row.id] : []),
          programLines: loadedLines.flatMap((row) => row.id ? [row.id] : []),
          conditions: loadedConditions.flatMap((row) => row.id ? [row.id] : []),
        });
      }
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const changeField = useCallback(<K extends keyof OperationFormData>(key: K, value: OperationFormData[K]) => {
    if (!canEditField(key)) return;
    setForm((current) => ({ ...current, [key]: value }));
  }, [canEditField]);
  const chooseCommune = useCallback((commune: CommuneReference) => {
    if (!canEditField('commune_id')) return;
    const selected = selectCommune(commune);
    setForm((current) => ({
      ...current,
      commune_id: selected.communeId,
      commune: selected.commune,
      department: selected.department,
      zoning: selected.zoning,
    }));
  }, [canEditField]);

  const syncProgram = async (operationId: string) => {
    const sectionRows = programSections.map((section) => ({
      id: section.id ?? crypto.randomUUID(),
      operation_id: operationId,
      kind: section.kind,
      label: section.label.trim() || 'Catégorie sans nom',
      enabled: section.enabled,
      sort_order: section.sort_order,
    }));
    const { data: savedSections, error: sectionError } = await supabase
      .from('operation_program_sections').upsert(sectionRows).select('id');
    if (sectionError) throw sectionError;
    const sectionIds = (savedSections ?? []).map((row) => row.id as string);

    const lineRows = programLines
      .filter((line) => line.label.trim() || line.units != null || line.average_surface != null)
      .map((line) => ({
        id: line.id ?? crypto.randomUUID(),
        operation_id: operationId,
        section_id: line.section_id,
        label: line.label.trim() || 'Sans désignation',
        product: line.product,
        units: line.units,
        average_surface: line.average_surface,
        sort_order: line.sort_order,
      }));
    const lineIds: string[] = [];
    if (lineRows.length) {
      const { data, error: lineError } = await supabase
        .from('operation_program_lines').upsert(lineRows).select('id');
      if (lineError) throw lineError;
      lineIds.push(...(data ?? []).map((row) => row.id as string));
    }

    const removedLines = loadedIds.programLines.filter((rowId) => !lineIds.includes(rowId));
    if (removedLines.length) {
      const { error } = await supabase.from('operation_program_lines').delete().in('id', removedLines);
      if (error) throw error;
    }
    const removedSections = loadedIds.programSections.filter((rowId) => !sectionIds.includes(rowId));
    if (removedSections.length) {
      const { error } = await supabase.from('operation_program_sections').delete().in('id', removedSections);
      if (error) throw error;
    }
    setLoadedIds((current) => ({ ...current, programSections: sectionIds, programLines: lineIds }));
  };

  const syncFinance = async (operationId: string) => {
    const normalizedBudget = budgetLines.map((row, index) => ({
      ...row,
      id: row.id ?? crypto.randomUUID(),
      operation_id: operationId,
      sort_order: index,
    }));
    const normalizedSubsidies = subsidies
      .filter((row) => row.provider.trim())
      .map((row) => ({
        ...row,
        id: row.id ?? crypto.randomUUID(),
        operation_id: operationId,
        provider: row.provider.trim(),
        purpose: row.purpose.trim(),
        forecast_amount: row.forecast_amount ?? row.amount ?? null,
        final_amount: row.final_amount ?? null,
        comment: row.comment?.trim() || null,
      }));
    const { error: financeError } = await supabase.rpc('save_operation_finance', {
      p_operation_id: operationId,
      p_budget: normalizedBudget,
      p_subsidies: normalizedSubsidies,
    });
    if (financeError) throw financeError;
    setBudgetLines(normalizedBudget);
    setSubsidies(normalizedSubsidies);
  };

  const syncConditions = async (operationId: string) => {
    const rows = conditions.filter((row) => row.subject.trim()).map((row) => ({
      ...(row.id ? { id: row.id } : {}), operation_id: operationId, subject: row.subject.trim(), deadline_date: row.deadline_date, completion_date: row.completion_date,
    }));
    const savedIds: string[] = [];
    if (rows.length) {
      const { data, error: saveError } = await supabase.from('suspensive_conditions').upsert(rows).select('id');
      if (saveError) throw saveError;
      savedIds.push(...(data ?? []).map((row) => row.id));
    }
    const removed = loadedIds.conditions.filter((rowId) => !savedIds.includes(rowId));
    if (removed.length) {
      const { error: deleteError } = await supabase.from('suspensive_conditions').delete().in('id', removed);
      if (deleteError) throw deleteError;
    }
    setLoadedIds((current) => ({ ...current, conditions: savedIds }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editable) return;
    if (form.is_objective && !form.objective_year) {
      setError('Indiquez l’année de l’objectif DMO.');
      setActiveTab('objectives');
      return;
    }
    setSaving(true);
    setError(null);

    try {
      const totals = calculateProgramTotals(programSections, programLines);
      const calculatedProgramForm: OperationFormData = {
        ...form,
        total_housing_units: String(totals.total),
        collective_housing_units: String(totals.collective),
        individual_housing_units: String(totals.individual),
        commercial_units: String(totals.commercial),
        other_units: String(totals.other),
        plus_units: String(totals.byProduct.PLUS),
        plai_units: String(totals.byProduct.PLAI),
        pls_units: String(totals.byProduct.PLS),
        lli_units: String(totals.byProduct.LLI),
        brs_units: String(totals.byProduct.BRS),
        psla_units: String(totals.byProduct.PSLA),
        lls_units: String(totals.byProduct.PLUS + totals.byProduct.PLAI + totals.byProduct.PLS),
      };
      const formWithProgramTotals = !id || permissionGranted(permissions, 'operations.edit_program')
        ? calculatedProgramForm
        : form;
      const payload = toOperationPayload(formWithProgramTotals, user?.id);
      const query = id
        ? supabase.from('operations').update(payload).eq('id', id).select('id').single()
        : supabase.from('operations').insert(payload).select('id').single();
      const { data, error: operationError } = await query;
      if (operationError) throw operationError;
      const operationId = data.id as string;
      if (!id || permissionGranted(permissions, 'operations.edit_program')) await syncProgram(operationId);
      if (!id || permissionGranted(permissions, 'operations.edit_budget')) await syncFinance(operationId);
      if (!id || permissionGranted(permissions, 'operations.edit_conditions')) await syncConditions(operationId);
      triggerSuccessToast(user?.email, 'Opération et données DMO enregistrées.');
      navigate(`/operations/${operationId}`);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Une partie de la fiche n’a pas pu être enregistrée.';
      setError(isSchemaMigrationError(caught) ? SCHEMA_MIGRATION_MESSAGE : `Enregistrement interrompu : ${message}`);
    } finally {
      setSaving(false);
    }
  };

  const activeContent = useMemo(() => {
    const common = { form, onChange: changeField, canEditField };
    switch (activeTab) {
      case 'program': return <ProgramSection {...common}
        detailsEditable={!id || permissionGranted(permissions, 'operations.edit_program')}
        sections={programSections} lines={programLines}
        onSectionsChange={setProgramSections} onLinesChange={setProgramLines}
        references={references} />;
      case 'planning': return <PlanningSection {...common} />;
      case 'budget': return <BudgetSection {...common} detailsEditable={!id || permissionGranted(permissions, 'operations.edit_budget')}
        budgetLines={budgetLines} onBudgetLinesChange={setBudgetLines}
        subsidies={subsidies} onSubsidiesChange={setSubsidies} />;
      case 'conditions': return <ConditionsSection {...common} conditions={conditions} onConditionsChange={setConditions} />;
      case 'objectives': return <ObjectivesSection {...common} />;
      case 'synthesis': return <SynthesisSection {...common} />;
      default: return <GeneralSection {...common} references={references} communes={communes} onCommuneSelect={chooseCommune} />;
    }
  }, [activeTab, budgetLines, canEditField, changeField, chooseCommune, communes, conditions, form, id, permissions, programLines, programSections, references, subsidies]);

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center text-slate-500">Chargement de la fiche opération…</div>;

  return (
    <div className="mx-auto max-w-[1500px] pb-28">
      <header className="mb-7 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <button type="button" onClick={() => navigate(id ? `/operations/${id}` : '/')} className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-teal-800"><ArrowLeft size={17} /> Retour</button>
          <p className="text-[10px] font-medium uppercase tracking-[0.26em] text-teal-700">Fiche opération DMO</p>
          <h1 className="mt-1 max-w-4xl text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">{id ? form.name || 'Modifier l’opération' : 'Créer une opération complète'}</h1>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right shadow-sm"><p className="text-[10px] font-medium uppercase tracking-widest text-slate-400">Avancement</p><p className="mt-1 text-sm font-medium text-slate-700">Section {tabs.findIndex((tab) => tab.id === activeTab) + 1} sur {tabs.length}</p></div>
      </header>

      {error && <div role="alert" className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-900">{error}</div>}
      {!editable && <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-900">Votre rôle permet la consultation, mais pas la modification.</div>}

      <OperationTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      <form onSubmit={handleSubmit}>
        <fieldset disabled={!editable || saving} className="rounded-3xl border border-slate-200 bg-[#fbfcfa] p-5 shadow-sm md:p-8">{activeContent}</fieldset>
        <div className="fixed bottom-0 left-64 right-0 z-30 border-t border-slate-200 bg-white/95 px-8 py-4 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4">
            <p className="hidden text-xs font-medium text-slate-500 md:block">Les champs calculés seront mis à jour à l’enregistrement.</p>
            <button disabled={!editable || saving} type="submit" className="ml-auto inline-flex items-center gap-2 rounded-xl bg-teal-800 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-teal-900/15 transition hover:-translate-y-0.5 hover:bg-teal-900 disabled:translate-y-0 disabled:opacity-50"><Save size={18} /> {saving ? 'Enregistrement…' : 'Enregistrer la fiche'}</button>
          </div>
        </div>
      </form>
    </div>
  );
}
