import { FileImage, FileText } from 'lucide-react';
import type { OperationSignificantWork } from '../../types/domain';
import { FieldLabel, SectionHeading, TextArea } from './FormControls';
import type { OperationSectionProps } from './formTypes';
import SignificantWorksEditor from './synthesis/SignificantWorksEditor';

export default function SynthesisSection({
  form,
  onChange,
  canEditField = () => true,
  significantWorks,
  onSignificantWorksChange,
  detailsEditable,
}: OperationSectionProps & {
  significantWorks: OperationSignificantWork[];
  onSignificantWorksChange: (rows: OperationSignificantWork[]) => void;
  detailsEditable: boolean;
}) {
  return (
    <section>
      <SectionHeading eyebrow="Fiche de synthèse" title="Enjeux, description et illustrations"
        description="Ces contenus alimentent le PDF avec le programme, les financements et le planning déjà renseignés." />
      <div><FieldLabel>Enjeux et description du projet</FieldLabel>
        <TextArea disabled={!canEditField('synthesis_description')} rows={10} value={form.synthesis_description}
          onChange={(event) => onChange('synthesis_description', event.target.value)}
          placeholder="Contexte foncier, nature de l’opération, certifications, contraintes et enjeux…" />
      </div>
      <div className="mt-6"><SignificantWorksEditor rows={significantWorks} editable={detailsEditable} onChange={onSignificantWorksChange} /></div>
      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center"><FileImage className="mx-auto text-teal-700" /><p className="mt-3 font-medium text-slate-800">Plan de l’opération</p><p className="mt-1 text-xs text-slate-500">Ajoutez et légendez les plans depuis la fiche détaillée après sauvegarde.</p></div>
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center"><FileText className="mx-auto text-teal-700" /><p className="mt-3 font-medium text-slate-800">Photos de chantier</p><p className="mt-1 text-xs text-slate-500">Les photos sont ordonnées et légendées depuis la fiche détaillée.</p></div>
      </div>
    </section>
  );
}
