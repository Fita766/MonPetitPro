import { Plus, Trash2 } from "lucide-react";
import type { SuspensiveCondition } from "../../types/domain";
import { FieldLabel, SectionHeading, TextInput } from "./FormControls";
import type { OperationSectionProps } from "./formTypes";

interface ConditionsSectionProps extends OperationSectionProps {
  conditions: SuspensiveCondition[];
  onConditionsChange: (rows: SuspensiveCondition[]) => void;
}

export default function ConditionsSection({
  conditions,
  onConditionsChange,
}: ConditionsSectionProps) {
  const update = (index: number, patch: Partial<SuspensiveCondition>) =>
    onConditionsChange(
      conditions.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row,
      ),
    );
  const add = () =>
    onConditionsChange([
      ...conditions,
      { subject: "", deadline_date: null, completion_date: null },
    ]);

  return (
    <section>
      <SectionHeading
        eyebrow="Échéances contractuelles"
        title="Conditions suspensives"
        description="Chaque condition alimente automatiquement le calendrier dédié, avec sa date butoir et sa réalisation effective."
      />
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-teal-200 bg-teal-50 px-5 py-4 text-teal-950">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-700">
              CONDITIONS SUSPENSIVES
            </p>
            <h3 className="font-black">Éléments à lever avant échéance</h3>
          </div>
          <button
            type="button"
            onClick={add}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-3 py-2 text-xs font-black text-white hover:bg-teal-800"
          >
            <Plus size={14} /> Ajouter
          </button>
        </div>
        {conditions.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-400">
            Aucune condition suspensive.
          </p>
        ) : (
          conditions.map((condition, index) => (
            <div
              key={condition.id ?? index}
              className="grid grid-cols-1 items-end gap-4 border-b border-slate-100 p-4 last:border-b-0 md:grid-cols-[1fr_180px_180px_40px]"
            >
              <div>
                <FieldLabel>Quoi</FieldLabel>
                <TextInput
                  value={condition.subject}
                  onChange={(event) =>
                    update(index, { subject: event.target.value })
                  }
                />
              </div>
              <div>
                <FieldLabel>Date butoir</FieldLabel>
                <TextInput
                  type="date"
                  value={condition.deadline_date ?? ""}
                  onChange={(event) =>
                    update(index, { deadline_date: event.target.value || null })
                  }
                />
              </div>
              <div>
                <FieldLabel>Réalisation</FieldLabel>
                <TextInput
                  type="date"
                  value={condition.completion_date ?? ""}
                  onChange={(event) =>
                    update(index, {
                      completion_date: event.target.value || null,
                    })
                  }
                />
              </div>
              <button
                type="button"
                onClick={() =>
                  onConditionsChange(
                    conditions.filter((_, rowIndex) => rowIndex !== index),
                  )
                }
                aria-label="Supprimer la condition"
                className="mb-1 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
