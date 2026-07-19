import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type {
  Operation,
  OperationSubsidy,
  OperationTypology,
  SuspensiveCondition,
} from "../types/domain";

export interface SynthesisImage {
  caption: string | null;
  dataUrl: string;
}

interface SynthesisPdfInput {
  operation: Partial<Operation> & Pick<Operation, "name">;
  typologies: OperationTypology[];
  subsidies: OperationSubsidy[];
  conditions: SuspensiveCondition[];
  images?: SynthesisImage[];
}

const shown = (value: unknown) =>
  value == null || value === "" ? "—" : String(value);
const money = (value: unknown) =>
  value == null
    ? "—"
    : Number(value).toLocaleString("fr-FR", {
        style: "currency",
        currency: "EUR",
      });

export function generateSynthesisPdf({
  operation,
  typologies,
  subsidies,
  conditions,
  images = [],
}: SynthesisPdfInput): void {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  pdf.setFillColor(15, 23, 42);
  pdf.rect(0, 0, 210, 38, "F");
  pdf.setTextColor(94, 234, 212);
  pdf.setFontSize(9);
  pdf.text("MONPETITPRO · FICHE OPÉRATION", 14, 13);
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(20);
  pdf.text(operation.name, 14, 26, { maxWidth: 182 });
  pdf.setTextColor(15, 23, 42);

  autoTable(pdf, {
    startY: 45,
    head: [["Identification", "Localisation", "Équipe", "Programme"]],
    body: [
      [
        `OF ${shown(operation.of_number)}\nGesprojet ${shown(operation.gesprojet_number)}\nStade ${shown(operation.stage)}`,
        `${shown(operation.department)} · ${shown(operation.commune)}\n${shown(operation.address)}`,
        `CTX ${shown(operation.project_manager)}\nCOP ${shown(operation.operations_manager)}\nPromoteur ${shown(operation.promoter_name)}`,
        `${shown(operation.total_housing_units)} logements\n${shown(operation.operation_type)}\n${shown(operation.certification)}`,
      ],
    ],
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [15, 118, 110] },
  });

  autoTable(pdf, {
    startY:
      (pdf as typeof pdf & { lastAutoTable: { finalY: number } }).lastAutoTable
        .finalY + 6,
    head: [["Planning", "Date"]],
    body: [
      ["Livraison contractuelle", shown(operation.contractual_delivery_date)],
      ["Livraison prévisionnelle", shown(operation.expected_delivery_date)],
      ["Livraison réelle", shown(operation.actual_delivery_date)],
      [
        "Mise en gestion prévisionnelle",
        shown(operation.management_expected_date),
      ],
      ["Mise en gestion réelle", shown(operation.management_actual_date)],
      ["DAACT", shown(operation.daact_date)],
    ],
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [51, 65, 85] },
  });

  const sectionY = () =>
    (pdf as typeof pdf & { lastAutoTable: { finalY: number } }).lastAutoTable
      .finalY + 6;
  if (typologies.length)
    autoTable(pdf, {
      startY: sectionY(),
      head: [["Produit", "Typologie", "Logements", "Surface moyenne"]],
      body: typologies.map((item) => [
        item.product,
        item.typology,
        shown(item.units),
        item.average_surface == null ? "—" : `${item.average_surface} m²`,
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [15, 118, 110] },
    });
  autoTable(pdf, {
    startY: sectionY(),
    head: [["Financement", "Objet", "Montant"]],
    body: [
      ["Budget initial", "", money(operation.initial_budget)],
      ["Atterrissage", "", money(operation.final_budget)],
      ...subsidies.map((item) => [
        item.provider,
        item.purpose,
        money(item.amount),
      ]),
    ],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [51, 65, 85] },
  });

  if (conditions.length)
    autoTable(pdf, {
      startY: sectionY(),
      head: [["Conditions suspensives", "Date butoir", "Levée le"]],
      body: conditions.map((item) => [
        item.subject,
        shown(item.deadline_date),
        shown(item.completion_date),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [180, 83, 9] },
    });

  const textBlocks = [
    ["Synthèse", operation.synthesis_description],
    ["Travaux significatifs", operation.significant_works],
  ].filter((item) => item[1]);
  for (const [title, value] of textBlocks) {
    pdf.addPage();
    pdf.setFontSize(15);
    pdf.setTextColor(15, 118, 110);
    pdf.text(String(title), 14, 18);
    pdf.setFontSize(10);
    pdf.setTextColor(51, 65, 85);
    pdf.text(pdf.splitTextToSize(String(value), 182), 14, 27);
  }

  for (const image of images.slice(0, 8)) {
    pdf.addPage();
    pdf.setFontSize(13);
    pdf.setTextColor(15, 23, 42);
    pdf.text(image.caption || "Illustration de l’opération", 14, 16);
    try {
      pdf.addImage(image.dataUrl, "JPEG", 14, 24, 182, 245, undefined, "FAST");
    } catch {
      /* Le document reste exploitable si un format image est incompatible. */
    }
  }

  pdf.save(
    `fiche-operation-${operation.name.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}.pdf`,
  );
}
