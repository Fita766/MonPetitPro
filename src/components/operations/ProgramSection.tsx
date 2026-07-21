import { Plus, Trash2 } from "lucide-react";
import type {
  HousingProduct,
  HousingTypology,
  OperationTypology,
} from "../../types/domain";
import {
  CheckField,
  FieldLabel,
  SectionHeading,
  SelectInput,
  TextInput,
} from "./FormControls";
import type { OperationSectionProps } from "./formTypes";

interface ProgramSectionProps extends OperationSectionProps {
  typologies: OperationTypology[];
  onTypologiesChange: (rows: OperationTypology[]) => void;
}

const products: HousingProduct[] = [
  "PLUS",
  "PLAI",
  "PLS",
  "LLI",
  "BRS",
  "PSLA",
];
const typologyNames: HousingTypology[] = ["T1", "T2", "T3", "T4", "Global"];
const unitFields = [
  ["total_housing_units", "Nombre total"],
  ["individual_housing_units", "Individuels"],
  ["collective_housing_units", "Collectifs"],
  ["plus_units", "PLUS"],
  ["plai_units", "PLAI"],
  ["pls_units", "PLS"],
  ["lli_units", "LLI"],
  ["brs_units", "BRS"],
  ["psla_units", "PSLA"],
  ["student_units", "Étudiants"],
  ["specific_units", "Spécifiques"],
  ["anru_units", "ANRU"],
  ["acv_units", "ACV"],
  ["commercial_units", "Commerces"],
  ["other_units", "Autres"],
] as const;

const certifications = [
  "PASSIVHAUS",
  "NF HABITAT",
  "NF Habitat HQE",
  "BEE+",
  "BEE",
  "SO",
  "BBCA",
  "Autres",
];
const thermalValues = [
  "RT 2012",
  "RT 2012 - 10%",
  "RT 2012 - 20%",
  "RT2012 - E3C2 - Bbio niv 2",
  "RE 2020",
  "RE 2020 - 10%",
  "RE 2020 - 20%",
  "RE 2020 Palier 25",
  "RE 2020 Palier 28",
  "RE 2020 Palier 31",
  "RE 2020 Bbio",
];

function valueFor(
  rows: OperationTypology[],
  typology: HousingTypology,
  product: HousingProduct,
) {
  return rows.find(
    (row) => row.typology === typology && row.product === product,
  );
}

export default function ProgramSection({
  form,
  onChange,
  typologies,
  onTypologiesChange,
}: ProgramSectionProps) {
  const updateTypology = (
    typology: HousingTypology,
    product: HousingProduct,
    key: "units" | "average_surface",
    value: string,
  ) => {
    const parsed = value === "" ? null : Number(value);
    const existing = valueFor(typologies, typology, product);
    if (existing) {
      onTypologiesChange(
        typologies.map((row) =>
          row === existing
            ? { ...row, [key]: Number.isFinite(parsed) ? parsed : null }
            : row,
        ),
      );
    } else {
      onTypologiesChange([
        ...typologies,
        {
          typology,
          product,
          units: null,
          average_surface: null,
          [key]: Number.isFinite(parsed) ? parsed : null,
        },
      ]);
    }
  };

  const clearTypologies = () => onTypologiesChange([]);

  return (
    <section>
      <SectionHeading
        eyebrow="G → AG"
        title="Programme et performances"
        description="Répartition des logements, surfaces moyennes et engagements techniques de l’opération."
      />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {unitFields.map(([key, label]) => (
          <div key={key}>
            <FieldLabel>{label}</FieldLabel>
            <TextInput
              min="0"
              type="number"
              value={form[key]}
              onChange={(event) => onChange(key, event.target.value)}
            />
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <FieldLabel>Certification</FieldLabel>
          <SelectInput
            value={form.certification}
            onChange={(event) => onChange("certification", event.target.value)}
          >
            <option value="">Non renseignée</option>
            {certifications.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </SelectInput>
        </div>
        <div>
          <FieldLabel>Réglementation thermique</FieldLabel>
          <SelectInput
            value={form.thermal_regulation}
            onChange={(event) =>
              onChange("thermal_regulation", event.target.value)
            }
          >
            <option value="">Non renseignée</option>
            {thermalValues.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </SelectInput>
        </div>
        <div>
          <FieldLabel>Zonage</FieldLabel>
          <TextInput
            value={form.zoning}
            onChange={(event) => onChange("zoning", event.target.value)}
          />
        </div>
        <div>
          <FieldLabel>Catégorie</FieldLabel>
          <TextInput
            value={form.category}
            onChange={(event) => onChange("category", event.target.value)}
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <CheckField
          checked={form.clesence_bbca}
          onChange={(value) => onChange("clesence_bbca", value)}
        >
          Clesence 2030 — BBCA
        </CheckField>
        <CheckField
          checked={form.clesence_reversible}
          onChange={(value) => onChange("clesence_reversible", value)}
        >
          Réversibilité
        </CheckField>
        <CheckField
          checked={form.clesence_land_sobriety}
          onChange={(value) => onChange("clesence_land_sobriety", value)}
        >
          Sobriété foncière
        </CheckField>
        <CheckField
          checked={form.clesence_green_space}
          onChange={(value) => onChange("clesence_green_space", value)}
        >
          Espace vert
        </CheckField>
      </div>

      <div className="mt-10 overflow-hidden rounded-2xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-teal-200 bg-teal-50 px-5 py-4 text-teal-950">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-teal-700">
              Tableau détaillé
            </p>
            <h3 className="font-medium">Typologies par financement</h3>
          </div>
          <button
            type="button"
            onClick={clearTypologies}
            className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/10"
          >
            <Trash2 size={14} /> Réinitialiser
          </button>
        </div>
        <div className="overflow-x-auto bg-white p-4">
          <table className="min-w-[1050px] w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="border border-slate-200 bg-slate-100 p-2 text-left">
                  Typologie
                </th>
                {products.map((product) => (
                  <th
                    key={product}
                    colSpan={2}
                    className="border border-slate-200 bg-slate-100 p-2 text-center font-medium"
                  >
                    {product}
                  </th>
                ))}
              </tr>
              <tr>
                <th className="border border-slate-200 p-2" />
                {products.flatMap((product) => [
                  <th
                    key={`${product}-n`}
                    className="border border-slate-200 p-2 text-slate-500"
                  >
                    Nbre
                  </th>,
                  <th
                    key={`${product}-s`}
                    className="border border-slate-200 p-2 text-slate-500"
                  >
                    S. moy.
                  </th>,
                ])}
              </tr>
            </thead>
            <tbody>
              {typologyNames.map((typology) => (
                <tr key={typology}>
                  <th className="border border-slate-200 bg-slate-50 p-2 text-left font-medium">
                    {typology}
                  </th>
                  {products.flatMap((product) => {
                    const row = valueFor(typologies, typology, product);
                    return [
                      <td
                        key={`${typology}-${product}-n`}
                        className="border border-slate-200 p-1"
                      >
                        <input
                          aria-label={`${typology} ${product} nombre`}
                          min="0"
                          type="number"
                          value={row?.units ?? ""}
                          onChange={(event) =>
                            updateTypology(
                              typology,
                              product,
                              "units",
                              event.target.value,
                            )
                          }
                          className="w-16 rounded border-0 px-2 py-1.5 text-center outline-none focus:ring-2 focus:ring-teal-600"
                        />
                      </td>,
                      <td
                        key={`${typology}-${product}-s`}
                        className="border border-slate-200 p-1"
                      >
                        <input
                          aria-label={`${typology} ${product} surface moyenne`}
                          min="0"
                          step="0.01"
                          type="number"
                          value={row?.average_surface ?? ""}
                          onChange={(event) =>
                            updateTypology(
                              typology,
                              product,
                              "average_surface",
                              event.target.value,
                            )
                          }
                          className="w-20 rounded border-0 px-2 py-1.5 text-center outline-none focus:ring-2 focus:ring-teal-600"
                        />
                      </td>,
                    ];
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <Plus size={13} /> Les cellules vides ne sont pas enregistrées en
            base.
          </p>
        </div>
      </div>
    </section>
  );
}
