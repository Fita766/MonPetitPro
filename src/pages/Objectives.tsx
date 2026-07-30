import { useEffect, useMemo, useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { permissionGranted } from '../lib/accessControl';
import {
  buildObjectiveReport,
  type ObjectiveReportOperation,
} from '../lib/objectiveRecords';
import type { ObjectiveKind, OperationObjective } from '../types/domain';

const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
const displayDate = (value: string | null) =>
  value ? new Date(`${value}T12:00:00`).toLocaleDateString('fr-FR') : '—';

export default function Objectives() {
  const permissions = useStore((state) => state.permissions);
  const [operations, setOperations] = useState<ObjectiveReportOperation[]>([]);
  const [records, setRecords] = useState<OperationObjective[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [kind, setKind] = useState<ObjectiveKind>('management');
  const [includeOutside, setIncludeOutside] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      supabase.from('operations').select(
        'id,name,of_number,department,commune,address,total_housing_units,works_order_expected_date,works_order_actual_date,management_expected_date,management_actual_date',
      ).order('name'),
      supabase.from('operation_objectives').select('*').order('objective_year', { ascending: false }),
    ]).then(([operationResult, objectiveResult]) => {
      if (cancelled) return;
      const firstError = operationResult.error ?? objectiveResult.error;
      if (firstError) setError(firstError.message);
      else {
        setOperations((operationResult.data as ObjectiveReportOperation[] | null) ?? []);
        setRecords((objectiveResult.data as OperationObjective[] | null) ?? []);
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const availableYears = useMemo(() => {
    const values = new Set<number>([new Date().getFullYear()]);
    records.forEach((record) => values.add(record.objective_year));
    operations.forEach((operation) => {
      for (const date of [operation.works_order_actual_date, operation.management_actual_date]) {
        if (date) values.add(Number(date.slice(0, 4)));
      }
    });
    return [...values].sort((left, right) => right - left);
  }, [operations, records]);
  const report = useMemo(
    () => buildObjectiveReport(records, operations, year, kind),
    [kind, operations, records, year],
  );
  const rows = includeOutside ? report.rows : [...report.initialRows, ...report.supplementaryRows];
  const monthlyActual = months.map((_, month) => rows
    .filter((row) => row.actualDate && Number(row.actualDate.slice(0, 4)) === year
      && Number(row.actualDate.slice(5, 7)) <= month + 1)
    .reduce((total, row) => total + row.realizedUnits, 0));

  const exportRows = rows.map((row) => [
    row.source === 'initial' ? 'Initial' : row.source === 'supplementary' ? 'Complément' : 'Réel hors objectif',
    operations.find((operation) => operation.id === row.operationId)?.of_number ?? '',
    row.operationName,
    row.department ?? '',
    row.commune ?? '',
    displayDate(row.objectiveDate),
    displayDate(row.actualDate),
    row.housingUnits,
    row.realizedUnits,
    row.gainLoss ?? '',
  ]);
  const headers = ['Source', 'N° OF', 'Opération', 'Dpt', 'Commune', 'Date objectif', 'Date réelle', 'Logements objectif', 'Logements réalisés', 'Logements-mois'];

  const exportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(`Objectifs ${year}`);
    sheet.addRow([`${kind === 'management' ? 'MISE EN GESTION' : 'OS TRAVAUX'} · ${year}`]);
    sheet.mergeCells(1, 1, 1, headers.length);
    sheet.getCell('A1').font = { bold: true, size: 15, color: { argb: 'FFFFFFFF' } };
    sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
    sheet.addRow(headers);
    exportRows.forEach((row) => sheet.addRow(row));
    sheet.columns.forEach((column) => { column.width = 18; });
    sheet.getColumn(3).width = 34;
    const buffer = await workbook.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buffer]));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `objectifs-${kind}-${year}.xlsx`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    const document = new jsPDF({ orientation: 'landscape', format: 'a3' });
    document.setFontSize(17);
    document.text(`Objectifs ${kind === 'management' ? 'mise en gestion' : 'OS travaux'} · ${year}`, 14, 16);
    autoTable(document, {
      startY: 22,
      head: [headers],
      body: exportRows,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [15, 118, 110] },
    });
    document.save(`objectifs-${kind}-${year}.pdf`);
  };

  if (loading) return <div className="flex min-h-[55vh] items-center justify-center text-slate-500">Chargement des objectifs…</div>;
  return (
    <div className="mx-auto max-w-[1800px] pb-12">
      <header className="mb-7 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-teal-700">Atterrissage annuel</p>
          <h1 className="mt-1 text-4xl font-semibold tracking-tight text-slate-950">Objectifs DMO</h1>
          <p className="mt-2 text-sm text-slate-500">Base initiale immuable, compléments et réalisations hors objectif sont toujours distingués.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={kind} onChange={(event) => setKind(event.target.value as ObjectiveKind)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium">
            <option value="management">Mise en gestion</option>
            <option value="works_order">OS travaux</option>
          </select>
          <select value={year} onChange={(event) => setYear(Number(event.target.value))}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium">
            {availableYears.map((item) => <option key={item}>{item}</option>)}
          </select>
          {permissionGranted(permissions, 'objectives.export') && <>
            <button type="button" onClick={() => void exportExcel()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium"><FileSpreadsheet size={15} /> Excel</button>
            <button type="button" onClick={exportPdf} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium"><Download size={15} /> PDF</button>
          </>}
        </div>
      </header>
      {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</div>}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          ['Objectif initial', report.summary.initialUnits, 'bg-teal-50 border-teal-200'],
          ['Compléments', report.summary.supplementaryUnits, 'bg-stone-50 border-stone-200'],
          ['Réalisé initial', report.summary.realizedInitialUnits, 'bg-emerald-50 border-emerald-200'],
          ['Réalisé complément', report.summary.realizedSupplementaryUnits, 'bg-lime-50 border-lime-200'],
          ['Réel hors objectif', report.summary.realizedOutsideUnits, 'bg-amber-50 border-amber-200'],
        ].map(([label, value, style]) => (
          <div key={String(label)} className={`rounded-2xl border p-5 ${style}`}>
            <p className="text-[10px] font-medium uppercase tracking-widest text-slate-600">{label}</p>
            <p className="mt-2 text-3xl font-medium text-slate-950">{Number(value).toLocaleString('fr-FR')}</p>
            <p className="text-xs text-slate-500">logements</p>
          </div>
        ))}
      </div>
      {kind === 'management' && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-700">
          Logements-mois gagnés / perdus : <span className={report.summary.gainLoss >= 0 ? 'text-teal-700' : 'text-rose-700'}>
            {report.summary.gainLoss > 0 ? '+' : ''}{report.summary.gainLoss.toLocaleString('fr-FR')}
          </span>
        </div>
      )}
      <label className="mb-5 inline-flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={includeOutside} onChange={(event) => setIncludeOutside(event.target.checked)} />
        Inclure les réalisations hors objectif
      </label>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-[1200px] w-full text-left text-xs">
          <thead className="border-b border-teal-200 bg-teal-50 text-teal-950">
            <tr>{[...headers, ...months].map((header) => <th key={header} className="whitespace-nowrap px-3 py-3 font-medium uppercase tracking-wider">{header}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.source}-${row.operationId}`} className="border-b border-slate-100">
                <td className="px-3 py-3"><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px]">
                  {row.source === 'initial' ? 'INITIAL' : row.source === 'supplementary' ? 'COMPLÉMENT' : 'RÉEL +'}
                </span></td>
                <td className="px-3 py-3">{operations.find((operation) => operation.id === row.operationId)?.of_number ?? '—'}</td>
                <td className="px-3 py-3 font-medium text-slate-950">{row.operationName}</td>
                <td className="px-3 py-3">{row.department ?? '—'}</td>
                <td className="px-3 py-3">{row.commune ?? '—'}</td>
                <td className="px-3 py-3">{displayDate(row.objectiveDate)}</td>
                <td className="px-3 py-3">{displayDate(row.actualDate)}</td>
                <td className="px-3 py-3 text-center">{row.housingUnits || '—'}</td>
                <td className="px-3 py-3 text-center">{row.realizedUnits || '—'}</td>
                <td className="px-3 py-3 text-center">{row.gainLoss ?? '—'}</td>
                {months.map((_, month) => {
                  const realized = row.actualDate && Number(row.actualDate.slice(0, 4)) === year && Number(row.actualDate.slice(5, 7)) <= month + 1;
                  return <td key={month} className={`px-2 py-3 text-center ${realized ? 'bg-emerald-50 text-emerald-800' : 'text-slate-300'}`}>{realized ? row.realizedUnits : '—'}</td>;
                })}
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={22} className="p-12 text-center text-slate-400">Aucune donnée pour {year}.</td></tr>}
          </tbody>
          <tfoot><tr className="bg-slate-100 font-medium"><td colSpan={10} className="px-3 py-3 text-right">RÉEL CUMULÉ</td>
            {monthlyActual.map((total, month) => <td key={month} className="px-2 py-3 text-center text-emerald-800">{total}</td>)}
          </tr></tfoot>
        </table>
      </div>
    </div>
  );
}
