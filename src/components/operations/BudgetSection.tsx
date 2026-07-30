import { Plus, Trash2 } from "lucide-react";
import type { OperationBudgetLine, OperationSubsidy } from "../../types/domain";
import { FieldLabel, SectionHeading, TextArea, TextInput } from "./FormControls";
import type { OperationSectionProps } from "./formTypes";
import BudgetMatrix from "./budget/BudgetMatrix";

interface BudgetSectionProps extends OperationSectionProps {
  subsidies: OperationSubsidy[];
  budgetLines: OperationBudgetLine[];
  onSubsidiesChange: (rows: OperationSubsidy[]) => void;
  onBudgetLinesChange: (rows: OperationBudgetLine[]) => void;
  detailsEditable?: boolean;
}

export default function BudgetSection({
  form,
  onChange,
  canEditField = () => true,
  subsidies,
  budgetLines,
  onSubsidiesChange,
  onBudgetLinesChange,
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
      { provider: "", purpose: "", amount: null, forecast_amount: null, final_amount: null, comment: "" },
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
      <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2">
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
      <BudgetMatrix rows={budgetLines} editable={detailsEditable} onChange={onBudgetLinesChange} />

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
              className="grid grid-cols-1 items-end gap-4 p-4 md:grid-cols-2 xl:grid-cols-[1fr_1.2fr_150px_150px_1.2fr_40px]"
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
                <FieldLabel>Prévisionnel</FieldLabel>
                <TextInput
                  disabled={!detailsEditable}
                  min="0"
                  step="0.01"
                  type="number"
                  value={subsidy.forecast_amount ?? subsidy.amount ?? ""}
                  onChange={(event) =>
                    update(index, {
                      forecast_amount:
                        event.target.value === ""
                          ? null
                          : Number(event.target.value),
                    })
                  }
                />
              </div>
              <div>
                <FieldLabel>Final / obtenu</FieldLabel>
                <TextInput disabled={!detailsEditable} min="0" step="0.01" type="number"
                  value={subsidy.final_amount ?? ""}
                  onChange={(event) => update(index, { final_amount: event.target.value === "" ? null : Number(event.target.value) })} />
              </div>
              <div>
                <FieldLabel>Commentaire</FieldLabel>
                <TextArea disabled={!detailsEditable} rows={1} value={subsidy.comment ?? ""}
                  onChange={(event) => update(index, { comment: event.target.value })} />
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
