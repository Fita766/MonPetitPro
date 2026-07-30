import { Plus, Trash2 } from "lucide-react";
import type { OperationSubsidy } from "../../types/domain";
import { FieldLabel, SectionHeading, TextInput } from "./FormControls";
import type { OperationSectionProps } from "./formTypes";

interface BudgetSectionProps extends OperationSectionProps {
  subsidies: OperationSubsidy[];
  onSubsidiesChange: (rows: OperationSubsidy[]) => void;
  detailsEditable?: boolean;
}

export default function BudgetSection({
  form,
  onChange,
  canEditField = () => true,
  subsidies,
  onSubsidiesChange,
  detailsEditable = true,
}: BudgetSectionProps) {
  const update = (index: number, patch: Partial<OperationSubsidy>) =>
    onSubsidiesChange(
      subsidies.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row,
      ),
    );
  const add = () =>
    onSubsidiesChange([
      ...subsidies,
      { provider: "", purpose: "", amount: null },
    ]);
  const remove = (index: number) =>
    onSubsidiesChange(subsidies.filter((_, rowIndex) => rowIndex !== index));

  return (
    <section>
      <SectionHeading
        eyebrow="Finances"
        title="Budget et subventions"
        description="Montants de référence et financements mobilisés pour la fiche de synthèse et les statistiques budgétaires."
      />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <FieldLabel>Budget initial</FieldLabel>
          <TextInput
            disabled={!canEditField("initial_budget")}
            min="0"
            step="0.01"
            type="number"
            value={form.initial_budget}
            onChange={(event) => onChange("initial_budget", event.target.value)}
          />
        </div>
        <div>
          <FieldLabel>Budget final / atterrissage</FieldLabel>
          <TextInput
            disabled={!canEditField("final_budget")}
            min="0"
            step="0.01"
            type="number"
            value={form.final_budget}
            onChange={(event) => onChange("final_budget", event.target.value)}
          />
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-teal-200 bg-teal-50 px-5 py-4 text-teal-950">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-teal-700">
              SUBVENTIONS
            </p>
            <h3 className="font-medium">Qui finance quoi, et combien ?</h3>
          </div>
          <button
            disabled={!detailsEditable}
            type="button"
            onClick={add}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-3 py-2 text-xs font-medium text-white hover:bg-teal-800"
          >
            <Plus size={14} /> Ajouter
          </button>
        </div>
        <div className="divide-y divide-slate-100">
          {subsidies.length === 0 && (
            <p className="p-6 text-center text-sm text-slate-400">
              Aucune subvention renseignée.
            </p>
          )}
          {subsidies.map((subsidy, index) => (
            <div
              key={subsidy.id ?? index}
              className="grid grid-cols-1 items-end gap-4 p-4 md:grid-cols-[1fr_1.4fr_180px_40px]"
            >
              <div>
                <FieldLabel>Qui</FieldLabel>
                <TextInput
                  disabled={!detailsEditable}
                  value={subsidy.provider}
                  onChange={(event) =>
                    update(index, { provider: event.target.value })
                  }
                />
              </div>
              <div>
                <FieldLabel>Quoi</FieldLabel>
                <TextInput
                  disabled={!detailsEditable}
                  value={subsidy.purpose}
                  onChange={(event) =>
                    update(index, { purpose: event.target.value })
                  }
                />
              </div>
              <div>
                <FieldLabel>Combien</FieldLabel>
                <TextInput
                  disabled={!detailsEditable}
                  min="0"
                  step="0.01"
                  type="number"
                  value={subsidy.amount ?? ""}
                  onChange={(event) =>
                    update(index, {
                      amount:
                        event.target.value === ""
                          ? null
                          : Number(event.target.value),
                    })
                  }
                />
              </div>
              <button
                disabled={!detailsEditable}
                type="button"
                onClick={() => remove(index)}
                aria-label="Supprimer la subvention"
                className="mb-1 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
