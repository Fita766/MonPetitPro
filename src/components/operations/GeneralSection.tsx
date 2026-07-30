import { STAGE_CONFIG } from '../../lib/stage';
import type { CommuneReference, OperationStage, ReferenceKind, ReferenceValue } from '../../types/domain';
import { FieldLabel, SectionHeading, SelectInput, TextInput } from './FormControls';
import type { OperationSectionProps } from './formTypes';
import ReferenceSelect, { type ReferenceSelectOption } from './ReferenceSelect';

interface GeneralSectionProps extends OperationSectionProps {
  references: ReferenceValue[];
  communes: CommuneReference[];
  onCommuneSelect: (commune: CommuneReference) => void;
}

export default function GeneralSection({
  form,
  onChange,
  canEditField = () => true,
  references,
  communes,
  onCommuneSelect,
}: GeneralSectionProps) {
  const referenceOptions = (kind: ReferenceKind): ReferenceSelectOption[] =>
    references.filter((row) => row.kind === kind).map((row) => ({
      id: row.label,
      label: row.label,
      isActive: row.is_active,
    }));
  const communeOptions: ReferenceSelectOption[] = communes.map((commune) => ({
    id: commune.id,
    label: commune.name,
    secondary: `${commune.department_code} — ${commune.department_name}${commune.housing_zone ? ` · zone ${commune.housing_zone}` : ''}`,
    isActive: commune.is_active,
  }));

  const referenceField = (
    label: string,
    kind: ReferenceKind,
    field: 'project_manager' | 'operations_manager' | 'assistant_name' | 'gpa_assistant_name' | 'manager_name' | 'animation_provider' | 'promoter_name' | 'program_nature',
  ) => <div>
    <FieldLabel>{label}</FieldLabel>
    <ReferenceSelect disabled={!canEditField(field)} valueId={form[field]}
      options={referenceOptions(kind)}
      onSelect={(option) => onChange(field, option.label)} />
  </div>;

  return (
    <section>
      <SectionHeading eyebrow="Identification" title="Identité, territoire et équipe"
        description="Les communes et intervenants viennent des référentiels administrés : les filtres et statistiques restent fiables." />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        <div className="md:col-span-2 xl:col-span-3">
          <FieldLabel>Nom de l’opération *</FieldLabel>
          <TextInput disabled={!canEditField('name')} required value={form.name}
            onChange={(event) => onChange('name', event.target.value)}
            placeholder="Ex. CLAIROIX — Rue du Général de Gaulle" />
        </div>
        <div>
          <FieldLabel>Stade</FieldLabel>
          <SelectInput disabled={!canEditField('stage')} value={form.stage}
            onChange={(event) => onChange('stage', event.target.value as OperationStage | '')}>
            <option value="">Non renseigné</option>
            {Object.values(STAGE_CONFIG).map((stage) =>
              <option key={stage.code} value={stage.code ?? ''}>Stade {stage.code} — {stage.label}</option>)}
          </SelectInput>
        </div>
        <div><FieldLabel>N° OF</FieldLabel><TextInput disabled={!canEditField('of_number')} value={form.of_number} onChange={(event) => onChange('of_number', event.target.value)} /></div>
        <div><FieldLabel>N° Gesprojet</FieldLabel><TextInput disabled={!canEditField('gesprojet_number')} value={form.gesprojet_number} onChange={(event) => onChange('gesprojet_number', event.target.value)} /></div>

        <div className="md:col-span-2">
          <FieldLabel>Commune officielle</FieldLabel>
          <ReferenceSelect disabled={!canEditField('commune_id')} valueId={form.commune_id}
            options={communeOptions} placeholder="Nom, code postal ou département…"
            onSelect={(option) => {
              const commune = communes.find((row) => row.id === option.id);
              if (commune) onCommuneSelect(commune);
            }} />
        </div>
        <div><FieldLabel>Département</FieldLabel><TextInput disabled value={form.department} /></div>
        <div><FieldLabel>Zonage ABC</FieldLabel><TextInput disabled value={form.zoning} /></div>
        <div className="md:col-span-2"><FieldLabel>Adresse / localisation</FieldLabel><TextInput disabled={!canEditField('address')} value={form.address} onChange={(event) => onChange('address', event.target.value)} /></div>

        <div>
          <FieldLabel>Mode de réalisation *</FieldLabel>
          <SelectInput disabled={!canEditField('operation_type')} value={form.operation_type}
            onChange={(event) => onChange('operation_type', event.target.value)}>
            <option value="MOD">MOD — Maîtrise d’ouvrage directe</option>
            <option value="VEFA">VEFA</option>
          </SelectInput>
        </div>
        {referenceField('Nature du programme', 'program_nature', 'program_nature')}
        {referenceField('CTX / conducteur de travaux *', 'ctx', 'project_manager')}
        {referenceField('COP / conducteur d’opération', 'cop', 'operations_manager')}
        {referenceField('Assistante', 'assistant', 'assistant_name')}
        {referenceField('Assistante GPA', 'gpa_assistant', 'gpa_assistant_name')}
        {referenceField('Gestionnaire', 'manager', 'manager_name')}
        {referenceField('Prestataire animation', 'animation_provider', 'animation_provider')}
        <div className="md:col-span-2 xl:col-span-3">
          {referenceField(`Promoteur${form.operation_type === 'VEFA' ? ' *' : ''}`, 'promoter', 'promoter_name')}
        </div>
      </div>
    </section>
  );
}
