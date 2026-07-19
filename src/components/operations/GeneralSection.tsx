import { STAGE_CONFIG } from '../../lib/stage';
import type { OperationStage } from '../../types/domain';
import { FieldLabel, SectionHeading, SelectInput, TextInput } from './FormControls';
import type { OperationSectionProps } from './formTypes';

interface GeneralSectionProps extends OperationSectionProps {
  suggestions: {
    ctx: string[];
    cop: string[];
    promoters: string[];
  };
}

const operationTypes = ['MOD', 'VEFA', 'CR/démol', 'Réhabilitation', 'Inter G', 'Étudiant', 'Béguinage', 'Autre'];

export default function GeneralSection({ form, onChange, suggestions }: GeneralSectionProps) {
  return (
    <section>
      <SectionHeading eyebrow="A → Y" title="Identité et équipe" description="Les repères indispensables pour retrouver, filtrer et attribuer l’opération sans dépendre du classeur Excel." />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        <div className="md:col-span-2 xl:col-span-3">
          <FieldLabel>Nom de l’opération *</FieldLabel>
          <TextInput required value={form.name} onChange={(event) => onChange('name', event.target.value)} placeholder="Ex. CLAIROIX — Rue du Général de Gaulle" />
        </div>
        <div>
          <FieldLabel>Stade</FieldLabel>
          <SelectInput value={form.stage} onChange={(event) => onChange('stage', event.target.value as OperationStage | '')}>
            <option value="">Non renseigné</option>
            {Object.values(STAGE_CONFIG).map((stage) => <option key={stage.code} value={stage.code ?? ''}>Stade {stage.code} — {stage.label}</option>)}
          </SelectInput>
        </div>
        <div><FieldLabel>N° OF</FieldLabel><TextInput value={form.of_number} onChange={(event) => onChange('of_number', event.target.value)} /></div>
        <div><FieldLabel>N° Gesprojet</FieldLabel><TextInput value={form.gesprojet_number} onChange={(event) => onChange('gesprojet_number', event.target.value)} /></div>
        <div><FieldLabel>Département</FieldLabel><TextInput value={form.department} onChange={(event) => onChange('department', event.target.value)} placeholder="60 — Oise" /></div>
        <div><FieldLabel>Commune</FieldLabel><TextInput value={form.commune} onChange={(event) => onChange('commune', event.target.value)} /></div>
        <div><FieldLabel>Adresse / localisation</FieldLabel><TextInput value={form.address} onChange={(event) => onChange('address', event.target.value)} /></div>
        <div>
          <FieldLabel>Type d’opération *</FieldLabel>
          <SelectInput value={form.operation_type} onChange={(event) => onChange('operation_type', event.target.value)}>
            {operationTypes.map((type) => <option key={type}>{type}</option>)}
          </SelectInput>
        </div>
        <div>
          <FieldLabel>CTX / conducteur de travaux *</FieldLabel>
          <TextInput required list="ctx-list" value={form.project_manager} onChange={(event) => onChange('project_manager', event.target.value)} />
          <datalist id="ctx-list">{suggestions.ctx.map((item) => <option key={item} value={item} />)}</datalist>
        </div>
        <div>
          <FieldLabel>COP / conducteur d’opération</FieldLabel>
          <TextInput list="cop-list" value={form.operations_manager} onChange={(event) => onChange('operations_manager', event.target.value)} />
          <datalist id="cop-list">{suggestions.cop.map((item) => <option key={item} value={item} />)}</datalist>
        </div>
        <div><FieldLabel>Assistante</FieldLabel><TextInput value={form.assistant_name} onChange={(event) => onChange('assistant_name', event.target.value)} /></div>
        <div><FieldLabel>Assistante GPA</FieldLabel><TextInput value={form.gpa_assistant_name} onChange={(event) => onChange('gpa_assistant_name', event.target.value)} /></div>
        <div><FieldLabel>Gestionnaire</FieldLabel><TextInput value={form.manager_name} onChange={(event) => onChange('manager_name', event.target.value)} /></div>
        <div><FieldLabel>Prestataire animation</FieldLabel><TextInput value={form.animation_provider} onChange={(event) => onChange('animation_provider', event.target.value)} /></div>
        <div className="md:col-span-2 xl:col-span-3">
          <FieldLabel>Promoteur {form.operation_type === 'VEFA' ? '*' : ''}</FieldLabel>
          <TextInput required={form.operation_type === 'VEFA'} list="promoter-list" value={form.promoter_name} onChange={(event) => onChange('promoter_name', event.target.value)} />
          <datalist id="promoter-list">{suggestions.promoters.map((item) => <option key={item} value={item} />)}</datalist>
        </div>
      </div>
    </section>
  );
}
