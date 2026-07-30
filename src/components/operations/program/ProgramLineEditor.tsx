import { GripVertical, Trash2 } from 'lucide-react';
import type { HousingProduct, OperationProgramLine } from '../../../types/domain';
import { SelectInput, TextInput } from '../FormControls';

const PRODUCTS: HousingProduct[] = ['PLUS', 'PLAI', 'PLS', 'LLI', 'BRS', 'PSLA'];
const TYPOLOGIES = ['T1', 'T2', 'T3', 'T4', 'T5', 'Studio', 'Global'];

interface ProgramLineEditorProps {
  line: OperationProgramLine;
  showProduct: boolean;
  disabled?: boolean;
  onChange: (patch: Partial<OperationProgramLine>) => void;
  onRemove: () => void;
}

export default function ProgramLineEditor({
  line,
  showProduct,
  disabled = false,
  onChange,
  onRemove,
}: ProgramLineEditorProps) {
  return (
    <div className={`grid items-end gap-3 rounded-xl border border-slate-200 bg-white p-3 ${showProduct ? 'md:grid-cols-[24px_1fr_130px_110px_130px_40px]' : 'md:grid-cols-[24px_1fr_110px_130px_40px]'}`}>
      <GripVertical aria-hidden className="mb-2 hidden text-slate-300 md:block" size={18} />
      <label className="text-xs text-slate-500">
        Désignation
        <TextInput disabled={disabled} list="program-typologies" value={line.label}
          onChange={(event) => onChange({ label: event.target.value })} placeholder="Ex. T2 ou Local 1" />
        <datalist id="program-typologies">{TYPOLOGIES.map((item) => <option key={item} value={item} />)}</datalist>
      </label>
      {showProduct && <label className="text-xs text-slate-500">
        Produit
        <SelectInput disabled={disabled} value={line.product ?? ''}
          onChange={(event) => onChange({ product: event.target.value ? event.target.value as HousingProduct : null })}>
          <option value="">Non affecté</option>
          {PRODUCTS.map((product) => <option key={product}>{product}</option>)}
        </SelectInput>
      </label>}
      <label className="text-xs text-slate-500">
        Nombre
        <TextInput disabled={disabled} min="0" type="number" value={line.units ?? ''}
          onChange={(event) => onChange({ units: event.target.value === '' ? null : Number(event.target.value) })} />
      </label>
      <label className="text-xs text-slate-500">
        Surface moyenne
        <TextInput disabled={disabled} min="0" step="0.01" type="number" value={line.average_surface ?? ''}
          onChange={(event) => onChange({ average_surface: event.target.value === '' ? null : Number(event.target.value) })} />
      </label>
      <button disabled={disabled} type="button" onClick={onRemove} aria-label={`Supprimer ${line.label || 'la ligne'}`}
        className="mb-1 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-700 disabled:opacity-40">
        <Trash2 size={18} />
      </button>
    </div>
  );
}
