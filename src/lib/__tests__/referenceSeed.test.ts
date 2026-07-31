import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const seed = readFileSync('supabase/seed/july_feedback_references.sql', 'utf8');

describe('seed des référentiels du 29 juillet', () => {
  it('ne contient aucun doublon insensible à la casse dans un même référentiel', () => {
    const referencePart = seed.split('insert into public.communes', 1)[0];
    const rows = [...referencePart.matchAll(
      /^\('([^']+)', '((?:[^']|'')+)', \d+\),?$/gm,
    )].map((match) => ({
      kind: match[1],
      label: match[2].replaceAll("''", "'"),
    }));
    const keys = rows.map(({ kind, label }) =>
      `${kind}:${label.trim().replace(/\s+/g, ' ').toLocaleLowerCase('fr')}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(rows.length).toBeGreaterThan(200);
  });

  it('n’importe aucune opération et protège le zonage des communes', () => {
    expect(seed).not.toContain('insert into public.operations');
    expect(seed).toContain("on conflict (insee_code) do update");
    expect(seed).toContain("référentiel communes incomplet");
  });
});
