import { describe, expect, it } from "vitest";
import {
  buildDocumentReviewTemplate,
  calculateReviewExpectedDate,
} from "../documentReview";

describe("calculateReviewExpectedDate", () => {
  it("borne les fins de mois lors des décalages", () => {
    expect(calculateReviewExpectedDate("2026-03-31", -1)).toBe("2026-02-28");
  });

  it("retourne null sans date d’ancrage", () => {
    expect(calculateReviewExpectedDate(null, -4)).toBeNull();
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
