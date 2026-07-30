import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import type { OperationProgramLine, OperationProgramSection } from '../../../types/domain';
import ProgramLineEditor from './ProgramLineEditor';

interface ProgramSectionCardProps {
  section: OperationProgramSection;
  lines: OperationProgramLine[];
  disabled?: boolean;
  canRemove?: boolean;
  onSectionChange: (patch: Partial<OperationProgramSection>) => void;
  onAddLine: () => void;
  onLineChange: (line: OperationProgramLine, patch: Partial<OperationProgramLine>) => void;
  onRemoveLine: (line: OperationProgramLine) => void;
  onMove: (direction: -1 | 1) => void;
  onRemoveSection: () => void;
}

export default function ProgramSectionCard({
  section,
  lines,
  disabled = false,
  canRemove = false,
  onSectionChange,
  onAddLine,
  onLineChange,
  onRemoveLine,
  onMove,
  onRemoveSection,
}: ProgramSectionCardProps) {
  const sectionTotal = lines.reduce((sum, line) =>
    sum + (line.units != null && Number.isFinite(line.units) && line.units >= 0 ? line.units : 0), 0);

  return (
    <article className={`overflow-hidden rounded-2xl border ${section.enabled ? 'border-teal-200 bg-teal-50/30' : 'border-slate-200 bg-slate-50 opacity-75'}`}>
      <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <input disabled={disabled} type="checkbox" checked={section.enabled}
          onChange={(event) => onSectionChange({ enabled: event.target.checked })}
          aria-label={`Activer ${section.label}`} className="h-5 w-5 rounded accent-teal-700" />
        <input disabled={disabled || section.kind !== 'custom'} value={section.label}
          onChange={(event) => onSectionChange({ label: event.target.value })}
          className="min-w-48 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 font-medium text-slate-900 enabled:hover:border-slate-200 enabled:focus:border-teal-500 enabled:focus:outline-none" />
        <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-medium text-teal-900">{sectionTotal} unité(s)</span>
        <div className="flex gap-1">
          <button disabled={disabled} type="button" onClick={() => onMove(-1)} aria-label="Monter la catégorie" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ArrowUp size={16} /></button>
          <button disabled={disabled} type="button" onClick={() => onMove(1)} aria-label="Descendre la catégorie" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ArrowDown size={16} /></button>
          {canRemove && <button disabled={disabled} type="button" onClick={onRemoveSection} aria-label="Supprimer la catégorie" className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-30"><Trash2 size={16} /></button>}
        </div>
      </header>
      {section.enabled && <div className="space-y-3 p-4">
        {lines.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-center text-sm text-slate-500">Aucune ligne dans cette catégorie.</p>}
        {lines.map((line) => <ProgramLineEditor key={line.id ?? `${line.section_id}-${line.sort_order}`}
          line={line} showProduct={section.kind !== 'commercial'} disabled={disabled}
          onChange={(patch) => onLineChange(line, patch)} onRemove={() => onRemoveLine(line)} />)}
        <button disabled={disabled} type="button" onClick={onAddLine}
          className="inline-flex items-center gap-2 rounded-lg border border-teal-200 bg-white px-3 py-2 text-xs font-medium text-teal-800 hover:bg-teal-50 disabled:opacity-40">
          <Plus size={15} /> Ajouter une ligne
        </button>
      </div>}
    </article>
  );
}
