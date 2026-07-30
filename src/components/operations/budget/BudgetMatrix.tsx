import { Plus, Trash2 } from 'lucide-react';
import { aggregateOperationBudget } from '../../../lib/budget';
import type { BudgetFamily, OperationBudgetLine, RealizationMode } from '../../../types/domain';
import { FieldLabel, SelectInput, TextInput } from '../FormControls';

const familyOptions: { value: Exclude<BudgetFamily, 'general'>; label: string }[] = [
  { value: 'LLS', label: 'LLS' },
  { value: 'LLI', label: 'LLI' },
  { value: 'managed', label: 'Logements gérés' },
];
const modeOptions: RealizationMode[] = ['MOD', 'VEFA'];
const money = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

function amount(value: number | null) {
  return value == null ? '—' : money.format(value);
}

export default function BudgetMatrix({ rows, editable, onChange }: {
  rows: OperationBudgetLine[];
  editable: boolean;
  onChange: (rows: OperationBudgetLine[]) => void;
}) {
  const totals = aggregateOperationBudget(rows);
  const missingPairs = familyOptions.flatMap((family) =>
    modeOptions
      .filter((mode) => !rows.some((row) => row.family === family.value && row.realization_mode === mode))
      .map((mode) => ({ family: family.value, mode, label: `${family.label} · ${mode}` })));

  const update = (index: number, patch: Partial<OperationBudgetLine>) =>
    onChange(rows.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row));
  const add = (pairKey: string) => {
    const [family, realizationMode] = pairKey.split('|') as [Exclude<BudgetFamily, 'general'>, RealizationMode];
    onChange([...rows, {
      family,
      realization_mode: realizationMode,
      forecast_ht: null,
      forecast_ttc: null,
      forecast_equity: null,
      final_ht: null,
      final_ttc: null,
      final_equity: null,
      sort_order: rows.length,
    }]);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-teal-200 bg-teal-50 px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-teal-700">Matrice budgétaire</p>
          <h3 className="font-medium text-slate-900">Prévisionnel et final par activité</h3>
        </div>
        {editable && missingPairs.length > 0 && (
          <div className="flex items-end gap-2">
            <div>
              <FieldLabel>Ajouter une ligne</FieldLabel>
              <SelectInput defaultValue="" onChange={(event) => {
                if (event.target.value) add(event.target.value);
                event.target.value = '';
              }}>
                <option value="">Choisir…</option>
                {missingPairs.map((pair) => (
                  <option key={`${pair.family}|${pair.mode}`} value={`${pair.family}|${pair.mode}`}>{pair.label}</option>
                ))}
              </SelectInput>
            </div>
            <span className="mb-2 text-teal-700"><Plus size={18} /></span>
          </div>
        )}
      </div>
      {rows.length === 0 ? (
        <p className="p-6 text-center text-sm text-slate-400">Aucune ligne budgétaire renseignée.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-sm">
            <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th rowSpan={2} className="px-4 py-3">Famille</th>
                <th rowSpan={2} className="px-4 py-3">Mode</th>
                <th colSpan={3} className="border-l border-slate-200 px-4 py-2 text-center">Prévisionnel</th>
                <th colSpan={3} className="border-l border-slate-200 px-4 py-2 text-center">Final</th>
                <th rowSpan={2} className="w-12" />
              </tr>
              <tr>
                {['HT', 'TTC', 'Fonds propres', 'HT', 'TTC', 'Fonds propres'].map((label, index) => (
                  <th key={`${label}-${index}`} className={`px-3 py-2 ${index === 0 || index === 3 ? 'border-l border-slate-200' : ''}`}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, index) => (
                <tr key={row.id ?? `${row.family}-${row.realization_mode}`}>
                  <td className="px-4 py-3 font-medium">{familyOptions.find((item) => item.value === row.family)?.label ?? row.family}</td>
                  <td className="px-4 py-3">{row.realization_mode}</td>
                  {(['forecast_ht', 'forecast_ttc', 'forecast_equity', 'final_ht', 'final_ttc', 'final_equity'] as const).map((key, amountIndex) => (
                    <td key={key} className={`px-2 py-2 ${amountIndex === 0 || amountIndex === 3 ? 'border-l border-slate-200' : ''}`}>
                      <TextInput disabled={!editable} aria-label={`${row.family} ${row.realization_mode} ${key}`} min="0" step="0.01" type="number"
                        value={row[key] ?? ''} onChange={(event) => update(index, { [key]: event.target.value === '' ? null : Number(event.target.value) })} />
                    </td>
                  ))}
                  <td className="px-2">
                    <button disabled={!editable} type="button" aria-label="Supprimer la ligne budgétaire" onClick={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index))}
                      className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"><Trash2 size={17} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-teal-100 bg-teal-50 text-slate-800">
              <tr>
                <th colSpan={2} className="px-4 py-3 text-left">Total</th>
                <td className="border-l border-teal-100 px-3 py-3">{amount(totals.global.forecast.ht)}</td>
                <td className="px-3 py-3">{amount(totals.global.forecast.ttc)}</td>
                <td className="px-3 py-3">{amount(totals.global.forecast.equity)}</td>
                <td className="border-l border-teal-100 px-3 py-3">{amount(totals.global.final.ht)}</td>
                <td className="px-3 py-3">{amount(totals.global.final.ttc)}</td>
                <td className="px-3 py-3">{amount(totals.global.final.equity)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      {totals.warnings.length > 0 && (
        <div className="border-t border-amber-200 bg-amber-50 px-5 py-3 text-xs text-amber-900">
          {totals.warnings.length} information{totals.warnings.length > 1 ? 's' : ''} à compléter. La saisie reste enregistrable.
        </div>
      )}
    </div>
  );
}
