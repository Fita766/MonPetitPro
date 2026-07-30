import { describe, expect, it } from 'vitest';
import { formatAuditChanges } from '../audit';

describe('formatAuditChanges', () => {
  const labels = { name: 'Nom', expected_delivery_date: 'Livraison prévisionnelle', budget: 'Budget' };

  it('n’affiche que les champs métier réellement modifiés', () => {
    expect(formatAuditChanges(
      { id: '1', name: 'Avant', expected_delivery_date: null, updated_at: '2026-01-01' },
      { id: '1', name: 'Après', expected_delivery_date: '2026-07-30', updated_at: '2026-01-02' },
      labels,
    )).toEqual([
      { key: 'name', label: 'Nom', before: 'Avant', after: 'Après' },
      { key: 'expected_delivery_date', label: 'Livraison prévisionnelle', before: '—', after: '30/07/2026' },
    ]);
  });

  it('formate insertions, suppressions, null et montants lisiblement', () => {
    expect(formatAuditChanges(null, { name: 'Créée', budget: 1200 }, labels)).toEqual([
      { key: 'name', label: 'Nom', before: '—', after: 'Créée' },
      { key: 'budget', label: 'Budget', before: '—', after: '1 200' },
    ]);
    expect(formatAuditChanges({ name: 'Supprimée' }, null, labels)[0]).toMatchObject({ before: 'Supprimée', after: '—' });
  });
});
