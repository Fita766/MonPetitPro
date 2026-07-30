import { describe, expect, it } from "vitest";
import {
  buildDocumentReviewTemplate,
  calculateReviewExpectedDate,
  reconcileDocumentReviewItems,
} from "../documentReview";

describe("calculateReviewExpectedDate", () => {
  it("borne les fins de mois lors des décalages", () => {
    expect(calculateReviewExpectedDate("2026-03-31", -1)).toBe("2026-02-28");
  });

  it("retourne null sans date d’ancrage", () => {
    expect(calculateReviewExpectedDate(null, -4)).toBeNull();
  });
  it("recalcule les dates attendues sans écraser une date reçue", () => {
    const [generated] = buildDocumentReviewTemplate({
      works_order_actual_date: "2025-01-15",
      expected_delivery_date: "2026-07-31",
    });
    expect(reconcileDocumentReviewItems([
      { id: "existing", operation_id: "op", category: generated.category, label: generated.label, offset_months: 1, expected_date: "2020-01-01", received_date: "2025-03-20", sort_order: 99 },
    ], [generated])[0]).toMatchObject({
      id: "existing",
      expected_date: generated.expected_date,
      received_date: "2025-03-20",
      sort_order: generated.sort_order,
    });
  });
});

describe("buildDocumentReviewTemplate", () => {
  const operation = {
    works_order_actual_date: "2025-01-15",
    contractual_delivery_date: "2026-06-30",
    expected_delivery_date: "2026-07-31",
    actual_delivery_date: null,
    daact_date: "2026-06-15",
  };

  it("calcule les documents de démarrage depuis l’OS travaux", () => {
    const rows = buildDocumentReviewTemplate(operation);
    expect(rows.find((row) => row.label === "Plans de synthèse")).toMatchObject(
      { expected_date: "2025-03-15", offset_months: 2 },
    );
  });

  it("calcule les jalons avant livraison depuis la date de référence", () => {
    const rows = buildDocumentReviewTemplate(operation);
    expect(
      rows.find(
        (row) => row.label === "Notification de la date de livraison par LRAR",
      ),
    ).toMatchObject({ expected_date: "2026-03-31", offset_months: -4 });
  });

  it("calcule les échéances post-DAACT et post-livraison", () => {
    const rows = buildDocumentReviewTemplate(operation);
    expect(
      rows.find((row) => row.label === "Attestation de conformité"),
    ).toMatchObject({ expected_date: "2026-08-15", offset_months: 2 });
    expect(
      rows.find((row) => row.label === "PV de levée des réserves de livraison"),
    ).toMatchObject({ expected_date: "2026-09-30", offset_months: 2 });
  });
});
