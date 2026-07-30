import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { SynthesisModel } from './synthesisModel';

export interface SynthesisImage {
  caption: string | null;
  dataUrl: string;
}

const shown = (value: unknown) => value == null || value === '' ? '—' : String(value);
const money = (value: number | null) => value == null ? '—' : value.toLocaleString('fr-FR', {
  style: 'currency', currency: 'EUR',
});
const date = (value: unknown) => typeof value === 'string' && value
  ? new Date(`${value}T12:00:00`).toLocaleDateString('fr-FR')
  : '—';

export function generateSynthesisPdf(model: SynthesisModel): void {
  const { operation } = model;
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const finalY = () => (pdf as typeof pdf & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 20;
  const ensure = (height = 30) => {
    if (finalY() + height > 280) pdf.addPage();
  };
  const heading = (title: string, subtitle?: string) => {
    ensure(25);
    const y = finalY() + 8;
    pdf.setFillColor(236, 253, 245);
    pdf.roundedRect(14, y, 182, subtitle ? 18 : 13, 2, 2, 'F');
    pdf.setTextColor(15, 118, 110);
    pdf.setFontSize(13);
    pdf.text(title, 18, y + 8);
    if (subtitle) {
      pdf.setTextColor(71, 85, 105);
      pdf.setFontSize(8);
      pdf.text(subtitle, 18, y + 14);
    }
  };

  pdf.setFillColor(15, 118, 110);
  pdf.rect(0, 0, 210, 38, 'F');
  pdf.setTextColor(204, 251, 241);
  pdf.setFontSize(9);
  pdf.text('MONPETITPRO · FICHE DE SYNTHÈSE', 14, 12);
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(20);
  pdf.text(operation.name, 14, 25, { maxWidth: 180 });
  pdf.setTextColor(15, 23, 42);

  heading('1. Données principales du programme');
  autoTable(pdf, {
    startY: finalY() + 24,
    head: [['Localisation', 'Équipe', 'Programme', 'Performance']],
    body: [[
      `${shown(operation.department)} · ${shown(operation.commune)}\n${shown(operation.address)}`,
      `CTX ${shown(operation.project_manager)}\nCOP ${shown(operation.operations_manager)}\nPromoteur ${shown(operation.promoter_name)}`,
      `${model.program.collective} collectifs\n${model.program.individual} individuels\n${model.program.commercial} locaux`,
      `${shown(operation.thermal_regulation)}\n${shown(operation.certification)}`,
    ]],
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [15, 118, 110] },
  });
  autoTable(pdf, {
    startY: finalY() + 5,
    head: [['Typologies', 'Logements', 'Financement', 'Logements']],
    body: Array.from({ length: Math.max(model.typologySummary.length, model.productSummary.length, 1) }, (_, index) => [
      model.typologySummary[index]?.label ?? '',
      model.typologySummary[index]?.units ?? '',
      model.productSummary[index]?.label ?? '',
      model.productSummary[index]?.units ?? '',
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [51, 65, 85] },
  });

  heading('2. Financements et subventions');
  autoTable(pdf, {
    startY: finalY() + 24,
    head: [['Élément', 'Prévisionnel', 'Final / obtenu']],
    body: [
      ['Coût global HT', money(model.budget.global.forecast.ht ?? operation.initial_budget ?? null), money(model.budget.global.final.ht ?? operation.final_budget ?? null)],
      ['Prix au m² SHAB', '', model.pricePerSquareMeter == null ? '—' : `${Math.round(model.pricePerSquareMeter).toLocaleString('fr-FR')} €/m²`],
      ...model.subsidyRows.map((row) => [row.provider, money(row.forecast_amount ?? row.amount), money(row.final_amount ?? row.forecast_amount ?? row.amount)]),
      ['TOTAL SUBVENTIONS', '', money(model.subsidyTotal)],
    ],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [15, 118, 110] },
  });

  heading('3. Travaux supplémentaires significatifs');
  autoTable(pdf, {
    startY: finalY() + 19,
    head: [['Libellé', 'Montant HT', 'Commentaire']],
    body: [
      ...model.significantWorks.map((row) => [row.label, money(row.amount_ht), row.comment ?? '']),
      ['TOTAL', money(model.significantWorksTotal), ''],
    ],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [15, 118, 110] },
  });

  heading('4. Enjeux et description du projet');
  ensure(45);
  const descriptionY = finalY() + 24;
  pdf.setFontSize(9);
  pdf.setTextColor(51, 65, 85);
  pdf.text(pdf.splitTextToSize(shown(operation.synthesis_description), 174), 18, descriptionY);

  pdf.addPage();
  pdf.setFillColor(236, 253, 245);
  pdf.roundedRect(14, 10, 182, 13, 2, 2, 'F');
  pdf.setTextColor(15, 118, 110);
  pdf.setFontSize(13);
  pdf.text('5. Planning prévisionnel', 18, 18);
  autoTable(pdf, {
    startY: 30,
    head: [['Jalon', 'Prévisionnel', 'Réel']],
    body: [
      ['Permis de construire', date(operation.permit_expected_date), date(operation.permit_order_date)],
      ['OS travaux', date(operation.works_order_expected_date), date(operation.works_order_actual_date)],
      ['Livraison', date(operation.expected_delivery_date), date(operation.actual_delivery_date)],
      ['Mise en gestion', date(operation.management_expected_date), date(operation.management_actual_date)],
    ],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [15, 118, 110] },
  });

  heading('6. Illustrations');
  if (!model.images.length) {
    pdf.setFontSize(9);
    pdf.setTextColor(100, 116, 139);
    pdf.text('Aucune illustration disponible.', 18, finalY() + 25);
  }
  for (const image of model.images.slice(0, 8)) {
    pdf.addPage();
    pdf.setFontSize(12);
    pdf.setTextColor(15, 23, 42);
    pdf.text(image.caption || 'Illustration de l’opération', 14, 16);
    try {
      pdf.addImage(image.dataUrl, 'JPEG', 14, 24, 182, 245, undefined, 'FAST');
    } catch {
      pdf.setFontSize(9);
      pdf.text('Image non compatible avec le PDF.', 14, 28);
    }
  }
  pdf.save(`fiche-operation-${operation.name.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}.pdf`);
}
