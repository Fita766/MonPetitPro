import { describe, expect, it } from 'vitest';
import { buildSynthesisModel, totalSignificantWorks } from '../synthesisModel';

describe('modèle de synthèse', () => {
  const sections = [
    { id: 'collective', kind: 'collective' as const, label: 'Collectifs', enabled: true, sort_order: 0 },
    { id: 'individual', kind: 'individual' as const, label: 'Individuels', enabled: true, sort_order: 1 },
    { id: 'commercial', kind: 'commercial' as const, label: 'Locaux', enabled: true, sort_order: 2 },
  ];
  const lines = [
    { section_id: 'collective', label: 'T3', product: 'PLUS' as const, units: 20, average_surface: 65, sort_order: 0 },
    { section_id: 'individual', label: 'Maisons', product: 'LLI' as const, units: 11, average_surface: 80, sort_order: 0 },
    { section_id: 'commercial', label: 'LCR', product: null, units: 1, average_surface: 90, sort_order: 0 },
  ];
  const subsidies = [
    { provider: 'CD60', purpose: '', amount: 104500, forecast_amount: 104500, final_amount: null },
    { provider: 'DDT60', purpose: '', amount: 46914, forecast_amount: 46914, final_amount: null },
    { provider: 'Action Logement', purpose: '', amount: 26500, forecast_amount: 26500, final_amount: null },
  ];
  const works = [
    { label: 'Voirie', amount_ht: 39070.99, comment: null, sort_order: 0 },
    { label: 'Clôtures', amount_ht: 13270, comment: null, sort_order: 1 },
    { label: 'LCR', amount_ht: 134299.27, comment: null, sort_order: 2 },
  ];

  it('reprend les valeurs de la note Clairoix sans approximation', () => {
    const model = buildSynthesisModel({
      operation: { name: 'Clairoix', synthesis_description: 'Projet', thermal_regulation: 'RT 2012 -10%', certification: 'CERQUAL' },
      sections, lines, budgetLines: [], subsidies, significantWorks: works, images: [],
    });
    expect(model.program).toMatchObject({ collective: 20, individual: 11, commercial: 1 });
    expect(model.subsidyTotal).toBe(177914);
    expect(model.significantWorksTotal).toBe(186640.26);
    expect(model.productSummary).toEqual(expect.arrayContaining([
      { label: 'PLUS', units: 20 },
      { label: 'LLI', units: 11 },
    ]));
  });

  it('additionne les travaux significatifs en conservant les décimales', () => {
    expect(totalSignificantWorks(works)).toBe(186640.26);
  });

  it('signale les informations utiles manquantes sans bloquer la génération', () => {
    const model = buildSynthesisModel({
      operation: { name: 'Incomplète' }, sections: [], lines: [], budgetLines: [],
      subsidies: [], significantWorks: [], images: [],
    });
    expect(model.warnings).toEqual(expect.arrayContaining([
      'Description du projet manquante',
      'Aucune illustration',
      'Budget HT non renseigné',
    ]));
  });
});
