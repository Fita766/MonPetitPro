import { FileImage, FileText } from 'lucide-react';
import { FieldLabel, SectionHeading, TextArea } from './FormControls';
import type { OperationSectionProps } from './formTypes';

export default function SynthesisSection({ form, onChange }: OperationSectionProps) {
  return (
    <section>
      <SectionHeading eyebrow="Fiche de synthèse" title="Enjeux, description et illustrations" description="Ces contenus alimenteront le PDF de synthèse avec les données programme, budget et planning déjà renseignées." />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div><FieldLabel>Enjeux et description du projet</FieldLabel><TextArea rows={12} value={form.synthesis_description} onChange={(event) => onChange('synthesis_description', event.target.value)} placeholder="Contexte foncier, nature de l’opération, certification, contraintes et enjeux…" /></div>
        <div><FieldLabel>Travaux supplémentaires significatifs</FieldLabel><TextArea rows={12} value={form.significant_works} onChange={(event) => onChange('significant_works', event.target.value)} placeholder="Une ligne par intervention, avec montant si nécessaire…" /></div>
      </div>
      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center"><FileImage className="mx-auto text-teal-700" /><p className="mt-3 font-black text-slate-800">Plan de l’opération</p><p className="mt-1 text-xs text-slate-500">L’ajout de fichier sera disponible dans la fiche détaillée après la première sauvegarde.</p></div>
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center"><FileText className="mx-auto text-teal-700" /><p className="mt-3 font-black text-slate-800">Photos de chantier</p><p className="mt-1 text-xs text-slate-500">Les photos seront ordonnées et légendées depuis la fiche détaillée.</p></div>
      </div>
    </section>
  );
}
