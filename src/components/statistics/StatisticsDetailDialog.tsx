import { FileSpreadsheet, Printer, X } from 'lucide-react';
import ExcelJS from 'exceljs';
import { buildStatisticsDetails } from '../../lib/statisticsDrilldown';
import type { StatisticsBasis, StatisticsOperation } from '../../lib/statistics';

const currency = (value: number | null) => value == null ? '—' : value.toLocaleString('fr-FR', {
  style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
});

export default function StatisticsDetailDialog({ title, operationIds, operations, basis, onClose }: {
  title: string;
  operationIds: string[];
  operations: StatisticsOperation[];
  basis: StatisticsBasis;
  onClose: () => void;
}) {
  const rows = buildStatisticsDetails(operationIds, operations, basis);
  const exportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Détail');
    sheet.addRow(['Opération', 'Date de rattachement', 'Logements', 'Promoteur', 'CTX', 'Budget prévisionnel HT', 'Budget final HT']);
    rows.forEach((row) => sheet.addRow([row.name, row.date, row.housing, row.promoter, row.projectManager, row.initialBudget, row.finalBudget]));
    sheet.columns.forEach((column) => { column.width = 24; });
    const buffer = await workbook.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buffer]));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `detail-statistiques-${basis}.xlsx`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div><p className="text-[10px] uppercase tracking-widest text-teal-700">Composition du chiffre</p><h2 className="text-xl font-medium text-slate-950">{title}</h2></div>
          <div className="flex gap-2">
            <button type="button" onClick={() => void exportExcel()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs"><FileSpreadsheet size={15} /> Excel</button>
            <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs"><Printer size={15} /> Imprimer</button>
            <button type="button" onClick={onClose} aria-label="Fermer" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
          </div>
        </div>
        <div className="max-h-[70vh] overflow-auto p-6">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="bg-teal-50 text-teal-950"><tr>
              {['Opération', 'Date', 'Logements', 'Promoteur', 'CTX', 'Prévisionnel HT', 'Final HT'].map((label) => <th key={label} className="px-3 py-3 uppercase tracking-wide">{label}</th>)}
            </tr></thead>
            <tbody>{rows.map((row) => <tr key={row.operationId} className="border-b border-slate-100">
              <td className="px-3 py-3 font-medium">{row.name}</td>
              <td className="px-3 py-3">{row.date ? new Date(`${row.date}T12:00:00`).toLocaleDateString('fr-FR') : '—'}</td>
              <td className="px-3 py-3">{row.housing}</td>
              <td className="px-3 py-3">{row.promoter ?? '—'}</td>
              <td className="px-3 py-3">{row.projectManager ?? '—'}</td>
              <td className="px-3 py-3">{currency(row.initialBudget)}</td>
              <td className="px-3 py-3">{currency(row.finalBudget)}</td>
            </tr>)}</tbody>
          </table>
          {rows.length === 0 && <p className="p-10 text-center text-sm text-slate-400">Aucune opération dans ce total.</p>}
        </div>
      </div>
    </div>
  );
}
