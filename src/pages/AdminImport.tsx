import { useRef, useState } from 'react';
import {
  CheckCircle2,
  FileSpreadsheet,
  FileUp,
  ListChecks,
  Play,
  RefreshCw,
  TriangleAlert,
  XCircle,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  isOperationSheetHeader,
  normalizeNameKey,
  parseWorkbookRows,
  prepareImport,
  type ImportSkip,
  type NormalizedImportRow,
  type RejectedRow,
} from '../lib/importWorkbook';
import { triggerErrorToast, triggerSuccessToast } from '../lib/toastUtils';
import { EMPTY_OPERATION_FORM, toOperationPayload, type OperationFormData } from '../lib/operationPayload';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';

type Phase = 'idle' | 'preview' | 'applied';
type Notice = { kind: 'ok' | 'error'; text: string };
type RowResult = { name: string; created: boolean; message: string };

const MAX_REJECTED_SHOWN = 20;

const cell = (value: unknown) => (value == null ? '' : String(value));

export default function AdminImport() {
  const user = useStore((state) => state.user);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [fileName, setFileName] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [toCreate, setToCreate] = useState<NormalizedImportRow[]>([]);
  const [skipped, setSkipped] = useState<ImportSkip[]>([]);
  const [rejected, setRejected] = useState<RejectedRow[]>([]);
  const [applying, setApplying] = useState(false);
  const [results, setResults] = useState<RowResult[]>([]);

  const reset = () => {
    setPhase('idle');
    setFileName('');
    setSheetName('');
    setNotice(null);
    setToCreate([]);
    setSkipped([]);
    setRejected([]);
    setResults([]);
  };

  const loadExistingNames = async (): Promise<Set<string>> => {
    const { data, error } = await supabase.from('operations').select('name');
    if (error) throw error;
    return new Set((data ?? []).map((row) => normalizeNameKey(cell(row.name))));
  };

  const handleFile = async (file: File | null) => {
    if (!file) return;
    reset();
    setFileName(file.name);
    setNotice(null);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });

      const shapeSheets = workbook.SheetNames.filter((name) => {
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[name], {
          header: 1,
          defval: null,
          raw: true,
        }) as unknown[][];
        return rows.slice(0, 10).some((row) => isOperationSheetHeader(row));
      });

      const selected = shapeSheets.includes('TBL BORD') ? 'TBL BORD' : shapeSheets[0];
      if (!selected) {
        setPhase('idle');
        setNotice({
          kind: 'error',
          text:
            'Aucune feuille d’opérations reconnue dans « ' +
            file.name +
            ' ». Le classeur de suivi DMO fournit ses opérations dans la feuille « TBL BORD », ' +
            'avec un en-tête contenant COMMUNE, Localisation, Nb logts et Dpt.',
        });
        return;
      }

      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[selected], {
        header: 1,
        defval: null,
        raw: true,
      }) as unknown[][];
      const headerIndex = rows.findIndex((row) => isOperationSheetHeader(row));
      const header = (rows[headerIndex] ?? []) as string[];
      const dataRows = rows.slice(headerIndex + 1);

      const existingNames = await loadExistingNames();
      const parsed = parseWorkbookRows(dataRows, header);
      const prepared = prepareImport(parsed.normalized, existingNames);

      setSheetName(selected);
      setToCreate(prepared.toCreate);
      setSkipped(prepared.skipped);
      setRejected(parsed.rejected);
      if (prepared.toCreate.length === 0) {
        setNotice({
          kind: 'error',
          text: 'Aucune nouvelle opération à créer : toutes les lignes correspondent à une opération déjà présente ou sont invalides.',
        });
      }
      setPhase('preview');
    } catch (caught) {
      setPhase('idle');
      setNotice({
        kind: 'error',
        text: 'Lecture du classeur impossible : ' +
          (caught instanceof Error ? caught.message : 'fichier inconnu'),
      });
    }
  };

  const apply = async () => {
    if (applying || toCreate.length === 0) return;
    setApplying(true);
    setNotice(null);
    const outcome: RowResult[] = [];

    for (const item of toCreate) {
      try {
        const form: OperationFormData = {
          ...EMPTY_OPERATION_FORM,
          name: item.name.trim(),
          commune: item.commune ?? '',
          department: item.department ?? '',
          promoter_name: item.promoterName ?? '',
          total_housing_units: item.totalHousingUnits == null ? '' : String(item.totalHousingUnits),
        };
        const payload = toOperationPayload(form, user?.id);
        const { error: insertError } = await supabase.from('operations').insert(payload).select('id');
        if (insertError) throw insertError;
        outcome.push({ name: item.name, created: true, message: 'Opération créée' });
      } catch (caught) {
        outcome.push({
          name: item.name,
          created: false,
          message: caught instanceof Error ? caught.message : 'Échec de la création',
        });
      }
    }

    setResults(outcome);
    setApplying(false);
    setPhase('applied');

    const created = outcome.filter((row) => row.created).length;
    if (created === outcome.length) {
      triggerSuccessToast(user?.email, `${created} opération(s) créée(s) à partir du classeur.`);
    } else {
      triggerErrorToast(`${created} opération(s) créée(s), ${outcome.length - created} en échec.`);
    }
  };

  return (
    <div className="mx-auto max-w-[1500px] pb-16">
      <header className="relative mb-7 overflow-hidden rounded-3xl border border-teal-200 bg-[#f7fbf8] p-7 shadow-sm">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full border-[36px] border-amber-100/70" />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-3xl">
            <div className="mb-3 flex items-center gap-3 text-teal-800">
              <FileSpreadsheet size={23} />
              <p className="text-xs font-medium uppercase tracking-[.22em]">
                Import administratif
              </p>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
              Importer des opérations depuis Excel
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Crée de nouvelles opérations après un aperçu, à partir de la feuille «&nbsp;TBL BORD&nbsp;»
              du classeur de suivi DMO (colonnes COMMUNE, Localisation, Nb logts, Dpt). Une opération
              déjà présente n’est jamais modifiée ni recréée.
            </p>
          </div>
          {phase !== 'idle' || fileName !== '' ? (
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:border-teal-400"
            >
              <RefreshCw size={16} /> Choisir un autre classeur
            </button>
          ) : null}
        </div>
      </header>

      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
        <TriangleAlert size={18} className="mt-0.5 shrink-0" />
        <p>
          <span className="font-semibold">Les opérations existantes ne seront jamais modifiées.</span>{' '}
          L’import ne fait que créer les nouvelles lignes présentes dans le classeur&nbsp;; aucune mise à jour,
          aucune suppression, aucun écrasement.
        </p>
      </div>

      {notice && (
        <div
          role="status"
          className={`mb-5 rounded-xl border px-4 py-3 text-sm font-medium ${
            notice.kind === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-red-200 bg-red-50 text-red-900'
          }`}
        >
          {notice.text}
        </div>
      )}

      {phase === 'idle' && (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
          <FileUp size={36} className="mx-auto text-teal-700" />
          <h2 className="mt-4 text-lg font-semibold text-slate-900">
            Déposer un classeur .xlsx à importer
          </h2>
          <p className="mx-auto mt-1 max-w-xl text-sm text-slate-500">
            L’aperçu est affiché avant toute création&nbsp;: rien n’est écrit tant que vous
            n’avez pas validé avec «&nbsp;Appliquer&nbsp;».
          </p>
          <label className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-teal-800 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-teal-900">
            <FileUp size={18} /> Parcourir…
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xlsm,.xls"
              className="sr-only"
              onChange={(event) => void handleFile(event.target.files?.[0] ?? null)}
            />
          </label>
        </section>
      )}

      {phase !== 'idle' && fileName && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">{fileName}</p>
              <p className="text-xs text-slate-500">
                Feuille reconnue : {sheetName} · {toCreate.length} à créer, {skipped.length} ignorée(s),{' '}
                {rejected.length} ligne(s) rejetée(s)
              </p>
            </div>
            <button
              type="button"
              disabled={phase !== 'preview' || toCreate.length === 0 || applying}
              onClick={() => void apply()}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-800 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-teal-900 disabled:opacity-40"
            >
              <Play size={17} />
              {applying
                ? 'Application en cours…'
                : toCreate.length > 0
                  ? `Appliquer ${toCreate.length} opération${toCreate.length > 1 ? 's' : ''}`
                  : 'Rien à appliquer'}
            </button>
          </div>

          {toCreate.length > 0 && (
            <div className="max-h-[520px] overflow-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-slate-500">
                  <tr>
                    {['Opération', 'Commune', 'Dpt', 'Promoteur', 'Logements', 'Résultat'].map((label) => (
                      <th key={label} className="px-4 py-3 font-medium uppercase">{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {toCreate.map((row) => {
                    const result = results.find((item) => item.name === row.name);
                    return (
                      <tr key={row.name} className="border-b border-slate-100">
                        <td className="px-4 py-2.5 font-medium text-slate-900">{row.name}</td>
                        <td className="px-4 py-2.5 text-slate-600">{row.commune ?? '—'}</td>
                        <td className="px-4 py-2.5 text-slate-600">{row.department ?? '—'}</td>
                        <td className="px-4 py-2.5 text-slate-600">{row.promoterName ?? '—'}</td>
                        <td className="px-4 py-2.5 text-slate-600">
                          {result ? (
                            <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                              <CheckCircle2 size={14} /> créée
                            </span>
                          ) : (
                            row.totalHousingUnits ?? '—'
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-slate-500">
                          {result && !result.created && (
                            <span className="inline-flex items-center gap-1 font-medium text-red-700">
                              <XCircle size={14} /> {result.message}
                            </span>
                          )}
                          {result && result.created && (
                            <span className="text-emerald-700">{result.message}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {(skipped.length > 0 || rejected.length > 0) && (
            <div className="grid gap-6 border-t border-slate-200 p-5 lg:grid-cols-2">
              {skipped.length > 0 && (
                <div>
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <ListChecks size={16} className="text-slate-400" /> Ignorées ({skipped.length})
                  </h3>
                  <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                    {skipped.map((row, index) => (
                      <li key={`${index}-${row.name}${row.reason}`} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                        <span className="text-slate-700">{row.name}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                          {row.reason}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {rejected.length > 0 && (
                <div>
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <XCircle size={16} className="text-red-400" /> Lignes rejetées ({rejected.length})
                  </h3>
                  <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                    {rejected.slice(0, MAX_REJECTED_SHOWN).map((row) => (
                      <li key={row.row} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                        <span className="text-slate-500">Ligne {row.row}</span>
                        <span className="text-slate-700">{row.reason}</span>
                      </li>
                    ))}
                    {rejected.length > MAX_REJECTED_SHOWN && (
                      <li className="px-3 py-2 text-xs text-slate-400">
                        … et {rejected.length - MAX_REJECTED_SHOWN} autre(s) ligne(s).
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          {phase === 'applied' && (
            <div className="border-t border-slate-200 bg-emerald-50/50 px-5 py-4 text-sm text-emerald-900">
              Application terminée : {results.filter((row) => row.created).length} opération(s) créée(s)
              {results.filter((row) => !row.created).length > 0 && (
                <span className="text-red-700">
                  {' '}
                  · {results.filter((row) => !row.created).length} en échec (détail dans le tableau)
                </span>
              )}.
            </div>
          )}
        </section>
      )}
    </div>
  );
}
