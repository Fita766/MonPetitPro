import { useEffect, useMemo, useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../lib/supabase';
import { buildObjectiveRows, mergeActualOutsideObjectives, type ObjectiveOperation } from '../lib/objectives';

function displayDate(value: string | null) {
  return value ? new Date(`${value}T12:00:00`).toLocaleDateString('fr-FR') : '—';
}

export default function Objectives() {
  const [operations, setOperations] = useState<ObjectiveOperation[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [mode, setMode] = useState<'objectives' | 'objective-actual'>('objectives');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void supabase.from('operations').select('id, name, of_number, department, commune, address, total_housing_units, is_objective, objective_year, objective_housing_units, objective_management_date, contractual_delivery_date, management_expected_date, management_actual_date').order('name').then(({ data, error: fetchError }) => {
      if (cancelled) return;
      if (fetchError) setError(fetchError.message); else setOperations((data as ObjectiveOperation[] | null) ?? []);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const availableYears = useMemo(() => {
    const years = new Set<number>([new Date().getFullYear()]);
    operations.forEach((operation) => { if (operation.objective_year) years.add(operation.objective_year); if (operation.management_actual_date) years.add(Number(operation.management_actual_date.slice(0, 4))); });
    return [...years].sort((left, right) => right - left);
  }, [operations]);

  const objectiveRows = useMemo(() => buildObjectiveRows(operations, year), [operations, year]);
  const rows = useMemo(() => mode === 'objectives' ? objectiveRows : mergeActualOutsideObjectives(objectiveRows, operations, year), [mode, objectiveRows, operations, year]);
  const objectiveTotal = objectiveRows.reduce((sum, row) => sum + row.objectiveHousingUnits, 0);
  const actualTotal = rows.reduce((sum, row) => sum + row.actualHousingUnits, 0);
  const gainLossTotal = objectiveRows.reduce((sum, row) => sum + (row.gainLoss ?? 0), 0);
  const monthlyActual = Array.from({ length: 12 }, (_, month) => rows.filter((row) => row.actualManagementDate && Number(row.actualManagementDate.slice(5, 7)) - 1 <= month).reduce((sum, row) => sum + row.actualHousingUnits, 0));

  const exportExcel = async () => {
    const workbook = new ExcelJS.Workbook(); const sheet = workbook.addWorksheet(`Objectifs ${year}`);
    const headers = ['N° OF', 'Département', 'Commune', 'Adresse', 'Logements objectif', 'AZ', 'BZ', 'CA', ...['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'], 'Gagné / perdu'];
    sheet.addRow([`OBJECTIFS DMO ${year}`]); sheet.mergeCells(1, 1, 1, headers.length); sheet.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } }; sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    sheet.addRow(headers); sheet.getRow(2).font = { bold: true, color: { argb: 'FFFFFFFF' } }; sheet.getRow(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
    rows.forEach((row) => { const source = operations.find((operation) => operation.id === row.id); const excelRow = sheet.addRow([(source as ObjectiveOperation & { of_number?: string | null })?.of_number ?? '', row.department, row.commune, row.address, row.objectiveHousingUnits, row.contractualDeliveryDate, row.expectedManagementDate, row.actualManagementDate, ...row.months.map((month) => month.value), row.gainLoss]); row.months.forEach((month, index) => { if (month.realized) excelRow.getCell(9 + index).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } }; }); });
    sheet.addRow(['', '', '', 'RÉEL CUMULÉ', '', '', '', '', ...monthlyActual]); sheet.columns.forEach((column) => { column.width = 16; }); sheet.getColumn(4).width = 34;
    const buffer = await workbook.xlsx.writeBuffer(); const url = URL.createObjectURL(new Blob([buffer])); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `objectifs-dmo-${year}.xlsx`; anchor.click(); URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    const document = new jsPDF({ orientation: 'landscape', format: 'a3' }); document.setFontSize(17); document.text(`Objectifs DMO ${year}`, 14, 16);
    autoTable(document, { startY: 22, head: [['Commune', 'Adresse', 'Objectif', 'AZ', 'BZ', 'CA', ...['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'], 'Gain/perte']], body: rows.map((row) => [row.commune ?? '', row.address ?? '', row.objectiveHousingUnits, displayDate(row.contractualDeliveryDate), displayDate(row.expectedManagementDate), displayDate(row.actualManagementDate), ...row.months.map((month) => month.realized ? '✓' : displayDate(month.value)), row.gainLoss ?? '']), styles: { fontSize: 6, cellPadding: 1.4 }, headStyles: { fillColor: [15, 118, 110] } }); document.save(`objectifs-dmo-${year}.pdf`);
  };

  if (loading) return <div className="flex min-h-[55vh] items-center justify-center text-slate-500">Chargement des objectifs…</div>;

  return (
    <div className="mx-auto max-w-[1800px] pb-12">
      <header className="mb-7 flex flex-col justify-between gap-5 xl:flex-row xl:items-end"><div><p className="text-[10px] font-black uppercase tracking-[0.28em] text-teal-700">Atterrissage annuel</p><h1 className="mt-1 text-4xl font-black tracking-tight text-slate-950">Objectifs DMO</h1><p className="mt-2 text-sm text-slate-500">Objectif figé, mise en gestion réelle et logements-mois gagnés ou perdus.</p></div><div className="flex flex-wrap gap-2"><select value={year} onChange={(event) => setYear(Number(event.target.value))} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black">{availableYears.map((item) => <option key={item}>{item}</option>)}</select><button type="button" onClick={() => void exportExcel()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold"><FileSpreadsheet size={15} /> Excel</button><button type="button" onClick={exportPdf} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold"><Download size={15} /> PDF</button></div></header>
      {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-900">{error}</div>}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3"><div className="rounded-2xl bg-slate-950 p-5 text-white"><p className="text-[10px] font-black uppercase tracking-widest text-teal-300">Objectif immuable</p><p className="mt-2 text-3xl font-black">{objectiveTotal.toLocaleString('fr-FR')}</p><p className="text-xs text-slate-400">logements</p></div><div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Réel comptabilisé</p><p className="mt-2 text-3xl font-black text-emerald-950">{actualTotal.toLocaleString('fr-FR')}</p><p className="text-xs text-emerald-700">logements mis en gestion</p></div><div className={`rounded-2xl border p-5 ${gainLossTotal >= 0 ? 'border-sky-200 bg-sky-50' : 'border-rose-200 bg-rose-50'}`}><p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Logements-mois gagnés / perdus</p><p className="mt-2 text-3xl font-black text-slate-950">{gainLossTotal > 0 ? '+' : ''}{gainLossTotal.toLocaleString('fr-FR')}</p></div></div>
      <div className="mb-5 flex w-fit rounded-xl bg-slate-100 p-1"><button type="button" onClick={() => setMode('objectives')} className={`rounded-lg px-4 py-2 text-xs font-black ${mode === 'objectives' ? 'bg-white shadow-sm' : 'text-slate-500'}`}>Objectif</button><button type="button" onClick={() => setMode('objective-actual')} className={`rounded-lg px-4 py-2 text-xs font-black ${mode === 'objective-actual' ? 'bg-white shadow-sm' : 'text-slate-500'}`}>Objectif + réel hors objectif</button></div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm"><table className="min-w-[1900px] w-full text-left text-[11px]"><thead className="bg-slate-950 text-slate-200"><tr>{['Source', 'Opération', 'Dpt', 'Commune', 'Adresse', 'Objectif', 'AZ', 'BZ', 'CA', ...['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'], 'Gagné / perdu'].map((header) => <th key={header} className="whitespace-nowrap px-3 py-3 font-black uppercase tracking-wider">{header}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-b border-slate-100"><td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-[9px] font-black ${row.source === 'objective' ? 'bg-teal-100 text-teal-900' : 'bg-sky-100 text-sky-900'}`}>{row.source === 'objective' ? 'OBJECTIF' : 'RÉEL +'}</span></td><td className="px-3 py-3 font-black text-slate-950">{row.name}</td><td className="px-3 py-3">{row.department}</td><td className="px-3 py-3">{row.commune}</td><td className="max-w-52 px-3 py-3">{row.address}</td><td className="px-3 py-3 text-center font-black">{row.objectiveHousingUnits || '—'}</td><td className="px-3 py-3">{displayDate(row.contractualDeliveryDate)}</td><td className="px-3 py-3">{displayDate(row.expectedManagementDate)}</td><td className="px-3 py-3 font-bold text-emerald-700">{displayDate(row.actualManagementDate)}</td>{row.months.map((month) => <td key={month.month} className={`px-2 py-3 text-center font-bold ${month.realized ? 'bg-emerald-100 text-emerald-900' : 'text-slate-400'}`}>{month.realized ? '✓' : month.value ? new Date(`${month.value}T12:00:00`).toLocaleDateString('fr-FR', { month: '2-digit', year: '2-digit' }) : '—'}</td>)}<td className={`px-3 py-3 text-center text-sm font-black ${(row.gainLoss ?? 0) >= 0 ? 'text-sky-700' : 'text-rose-700'}`}>{row.gainLoss == null ? '—' : `${row.gainLoss > 0 ? '+' : ''}${row.gainLoss}`}</td></tr>)}{rows.length === 0 && <tr><td colSpan={22} className="p-12 text-center text-slate-400">Aucune opération objectif pour {year}.</td></tr>}</tbody><tfoot><tr className="bg-slate-100 font-black"><td colSpan={9} className="px-3 py-3 text-right">RÉEL CUMULÉ</td>{monthlyActual.map((total, month) => <td key={month} className="px-2 py-3 text-center text-emerald-800">{total}</td>)}<td /></tr></tfoot></table></div>
    </div>
  );
}
