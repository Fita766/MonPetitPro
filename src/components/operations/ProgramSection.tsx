import { Plus } from 'lucide-react';
import { calculateProgramTotals, reorderProgramLine } from '../../lib/program';
import type { OperationProgramLine, OperationProgramSection, ReferenceValue } from '../../types/domain';
import { CheckField, FieldLabel, SectionHeading } from './FormControls';
import type { OperationSectionProps } from './formTypes';
import ProgramSectionCard from './program/ProgramSectionCard';
import ReferenceSelect from './ReferenceSelect';

interface ProgramSectionProps extends OperationSectionProps {
  sections: OperationProgramSection[];
  lines: OperationProgramLine[];
  onSectionsChange: (rows: OperationProgramSection[]) => void;
  onLinesChange: (rows: OperationProgramLine[]) => void;
  detailsEditable?: boolean;
  references: ReferenceValue[];
}

export default function ProgramSection({
  form,
  onChange,
  canEditField = () => true,
  sections,
  lines,
  onSectionsChange,
  onLinesChange,
  detailsEditable = true,
  references,
}: ProgramSectionProps) {
  const totals = calculateProgramTotals(sections, lines);

  const updateSection = (target: OperationProgramSection, patch: Partial<OperationProgramSection>) =>
    onSectionsChange(sections.map((section) => section === target ? { ...section, ...patch } : section));

  const addLine = (section: OperationProgramSection) => {
    if (!section.id) return;
    const sectionLines = lines.filter((line) => line.section_id === section.id);
    onLinesChange([...lines, {
      id: crypto.randomUUID(),
      section_id: section.id,
      label: '',
      product: section.kind === 'commercial' ? null : 'PLUS',
      units: null,
      average_surface: null,
      sort_order: sectionLines.length * 10,
    }]);
  };

  const updateLine = (target: OperationProgramLine, patch: Partial<OperationProgramLine>) =>
    onLinesChange(lines.map((line) => line === target ? { ...line, ...patch } : line));

  const moveSection = (target: OperationProgramSection, direction: -1 | 1) => {
    const ordered = [...sections].sort((a, b) => a.sort_order - b.sort_order);
    const index = ordered.indexOf(target);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= ordered.length) return;
    [ordered[index], ordered[nextIndex]] = [ordered[nextIndex], ordered[index]];
    onSectionsChange(ordered.map((section, order) => ({ ...section, sort_order: order * 10 })));
  };

  const addCustomSection = () => {
    const id = crypto.randomUUID();
    onSectionsChange([...sections, {
      id,
      kind: 'custom',
      label: 'Nouvelle catégorie',
      enabled: true,
      sort_order: sections.length * 10,
    }]);
  };

  const summary = [
    ['Total programme', totals.total],
    ['Collectifs', totals.collective],
    ['Individuels', totals.individual],
    ['Commerces / locaux', totals.commercial],
    ['Autres', totals.other],
  ] as const;

  return (
    <section>
      <SectionHeading eyebrow="Programme calculé" title="Programme et performances"
        description="Saisissez le détail une seule fois : tous les totaux de logements et de produits sont recalculés automatiquement." />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {summary.map(([label, value]) => <div key={label} className="rounded-2xl border border-teal-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-medium text-slate-950">{value}</p>
        </div>)}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {Object.entries(totals.byProduct).map(([product, units]) =>
          <span key={product} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-700">{product} : {units}</span>)}
      </div>

      <div className="mt-8 space-y-4">
        {[...sections].sort((a, b) => a.sort_order - b.sort_order).map((section) =>
          <ProgramSectionCard key={section.id} section={section}
            lines={lines.filter((line) => line.section_id === section.id).sort((a, b) => a.sort_order - b.sort_order)}
            disabled={!detailsEditable} canRemove={section.kind === 'custom'}
            onSectionChange={(patch) => updateSection(section, patch)}
            onAddLine={() => addLine(section)}
            onLineChange={updateLine}
            onMoveLine={(line, direction) => line.id && onLinesChange(reorderProgramLine(lines, line.id, direction))}
            onRemoveLine={(target) => onLinesChange(lines.filter((line) => line !== target))}
            onMove={(direction) => moveSection(section, direction)}
            onRemoveSection={() => {
              onSectionsChange(sections.filter((item) => item !== section));
              onLinesChange(lines.filter((line) => line.section_id !== section.id));
            }} />)}
        <button disabled={!detailsEditable} type="button" onClick={addCustomSection}
          className="inline-flex items-center gap-2 rounded-xl border border-dashed border-teal-300 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-900 hover:bg-teal-100 disabled:opacity-40">
          <Plus size={17} /> Ajouter une catégorie
        </button>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        <div>
          <FieldLabel>Certification</FieldLabel>
          <ReferenceSelect disabled={!canEditField('certification')} valueId={form.certification}
            options={references.filter((row) => row.kind === 'certification').map((row) => ({ id: row.label, label: row.label, isActive: row.is_active }))}
            onSelect={(option) => onChange('certification', option.label)} />
        </div>
        <div>
          <FieldLabel>Réglementation thermique</FieldLabel>
          <ReferenceSelect disabled={!canEditField('thermal_regulation')} valueId={form.thermal_regulation}
            options={references.filter((row) => row.kind === 'thermal_regulation').map((row) => ({ id: row.label, label: row.label, isActive: row.is_active }))}
            onSelect={(option) => onChange('thermal_regulation', option.label)} />
        </div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <CheckField disabled={!canEditField('clesence_bbca')} checked={form.clesence_bbca}
          onChange={(value) => onChange('clesence_bbca', value)}>Clesence 2030 — BBCA</CheckField>
        <CheckField disabled={!canEditField('clesence_reversible')} checked={form.clesence_reversible}
          onChange={(value) => onChange('clesence_reversible', value)}>Réversibilité</CheckField>
        <CheckField disabled={!canEditField('clesence_land_sobriety')} checked={form.clesence_land_sobriety}
          onChange={(value) => onChange('clesence_land_sobriety', value)}>Sobriété foncière</CheckField>
        <CheckField disabled={!canEditField('clesence_green_space')} checked={form.clesence_green_space}
          onChange={(value) => onChange('clesence_green_space', value)}>Espace vert</CheckField>
      </div>
    </section>
  );
}
