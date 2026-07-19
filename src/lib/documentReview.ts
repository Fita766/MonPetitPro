import { addMonthsSafe } from "./operationCalculations";

export type ReviewAnchor =
  "works" | "delivery" | "daact" | "post-delivery" | "daact-or-delivery";

export interface DocumentReviewOperation {
  works_order_expected_date?: string | null;
  works_order_actual_date?: string | null;
  contractual_delivery_date?: string | null;
  expected_delivery_date?: string | null;
  actual_delivery_date?: string | null;
  daact_date?: string | null;
}

interface TemplateDefinition {
  category: string;
  label: string;
  offset_months: number;
  anchor: ReviewAnchor;
}

export interface GeneratedReviewItem extends TemplateDefinition {
  expected_date: string | null;
  received_date: null;
  sort_order: number;
}

const rows = (
  category: string,
  offset_months: number,
  anchor: ReviewAnchor,
  labels: string[],
): TemplateDefinition[] =>
  labels.map((label) => ({ category, label, offset_months, anchor }));

export const DOCUMENT_REVIEW_TEMPLATE: TemplateDefinition[] = [
  ...rows("Dans les 2 mois suivant le démarrage du chantier", 2, "works", [
    "Plans de synthèse",
  ]),
  ...rows("Dans les 4 mois suivant le démarrage du chantier", 4, "works", [
    "Dossier chaufferie collective",
    "Dossier chaufferie individuelle",
  ]),
  ...rows("1 an avant la livraison", -12, "delivery", [
    "Notification du trimestre prévisionnel de livraison",
  ]),
  ...rows("9 mois avant la livraison", -9, "delivery", [
    "Rapport définitif du label",
    "Dossier Vigik",
    "Dossier ascenseur",
    "Échantillons des logements",
    "Réunion de validation des échantillons",
    "Adressage de l’opération",
  ]),
  ...rows("6 mois avant la livraison", -6, "delivery", [
    "Notification du mois prévisionnel de livraison",
    "Essais acoustiques et de perméabilité à l’air",
  ]),
  ...rows("5 mois avant la livraison", -5, "delivery", [
    "Liste des équipements à entretenir",
    "Perspective photographique de l’opération",
    "Plans de vente définitifs",
    "Tableau définitif des surfaces",
    "Plans des parkings et annexes",
    "Réunion échantillons des parties communes",
    "Logement témoin",
    "Projet de DOE",
    "Décompte des places de stationnement",
    "Notification de la quinzaine prévisionnelle de livraison",
  ]),
  ...rows("4 mois avant la livraison", -4, "delivery", [
    "Notification de la date de livraison par LRAR",
    "DPE prévisionnels",
  ]),
  ...rows("2 mois avant la livraison", -2, "delivery", [
    "OPL concessionnaires et réseaux",
    "DPE définitifs",
    "État des risques et pollutions",
    "Liste des PDL et PCE",
    "CONSUEL",
    "QUALIGAZ",
    "Contrats d’abonnement",
    "Repérage des compteurs d’eau",
    "Conformité gaz et chauffage",
    "Test de perméabilité à l’air",
  ]),
  ...rows("1 mois avant la livraison", -1, "delivery", [
    "Désinfection des réseaux d’eau",
    "RFCT",
    "Attestations acoustique et thermique",
    "Attestation PMR",
    "Mise en service des ascenseurs",
    "Mise en service des portes de parking",
    "Assemblée générale de copropriété",
    "Essais COPREC",
    "Mise en service de la chaufferie",
    "Essais d’étanchéité des terrasses",
    "DIUO provisoire",
    "Attestation de certification",
    "Attestation BBCA",
    "Analyses d’eau",
    "Avis du bureau de contrôle",
    "Attestation CERQUAL",
    "Notices des équipements",
    "Notices des matériaux",
  ]),
  ...rows("Au plus tard à la livraison", 0, "daact-or-delivery", [
    "Formulaires H1 / H2",
    "Règlement de copropriété et état descriptif de division",
    "Plans conformes à l’exécution",
  ]),
  ...rows("À la livraison", 0, "delivery", [
    "PV de livraison et liste des réserves",
    "Remise des clés et organigrammes",
    "Copie de la DAACT",
    "Liste des entreprises",
    "Liste des travaux restant à réaliser",
    "Attestations d’assurance",
    "Plans de sécurité",
    "Notes de calcul et rapports d’essais",
    "Relevés des compteurs",
  ]),
  ...rows("Dans les 60 jours suivant la livraison", 2, "post-delivery", [
    "PV de levée des réserves de livraison",
    "DIUO définitif",
    "DOE définitif",
  ]),
  ...rows("Dans les 60 jours suivant la DAACT", 2, "daact", [
    "Attestation de conformité",
  ]),
  ...rows("Dans les 120 jours suivant la DAACT", 4, "daact", [
    "Attestation de non-opposition à la conformité",
    "Clôture des référés préventifs",
  ]),
];

export function calculateReviewExpectedDate(
  anchorDate: string | null | undefined,
  offsetMonths: number,
): string | null {
  return addMonthsSafe(anchorDate, offsetMonths);
}

function earliestDate(
  ...dates: Array<string | null | undefined>
): string | null {
  return (
    dates.filter((date): date is string => Boolean(date)).sort()[0] ?? null
  );
}

function resolveAnchor(
  operation: DocumentReviewOperation,
  anchor: ReviewAnchor,
): string | null {
  const works =
    operation.works_order_actual_date ||
    operation.works_order_expected_date ||
    null;
  const delivery =
    operation.actual_delivery_date ||
    operation.expected_delivery_date ||
    operation.contractual_delivery_date ||
    null;

  if (anchor === "works") return works;
  if (anchor === "daact") return operation.daact_date || null;
  if (anchor === "daact-or-delivery")
    return earliestDate(
      operation.daact_date && addMonthsSafe(operation.daact_date, 2),
      delivery,
    );
  return delivery;
}

export function buildDocumentReviewTemplate(
  operation: DocumentReviewOperation,
): GeneratedReviewItem[] {
  return DOCUMENT_REVIEW_TEMPLATE.map((item, index) => ({
    ...item,
    expected_date: calculateReviewExpectedDate(
      resolveAnchor(operation, item.anchor),
      item.anchor === "daact-or-delivery" ? 0 : item.offset_months,
    ),
    received_date: null,
    sort_order: index,
  }));
}
