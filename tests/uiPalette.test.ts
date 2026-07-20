import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const UI_FILES = [
  'src/pages/AdminUsers.tsx',
  'src/pages/CalendarView.tsx',
  'src/pages/Dashboard.tsx',
  'src/pages/Objectives.tsx',
  'src/pages/Observations.tsx',
  'src/pages/OperationDetail.tsx',
  'src/pages/Statistics.tsx',
  'src/components/calendar/CalendarLegend.tsx',
  'src/components/operations/BudgetSection.tsx',
  'src/components/operations/ConditionsSection.tsx',
  'src/components/operations/DocumentsSection.tsx',
  'src/components/operations/OperationTabs.tsx',
  'src/components/operations/PlanningSection.tsx',
  'src/components/operations/ProgramSection.tsx',
  'src/components/statistics/BudgetStats.tsx',
  'src/components/statistics/CtxStats.tsx',
  'src/components/statistics/DeliveryStats.tsx',
  'src/components/statistics/PromoterStats.tsx',
];

describe('palette claire MonPetitPro', () => {
  it.each(UI_FILES)('%s ne contient plus de surface noire', (file) => {
    const source = readFileSync(resolve(process.cwd(), file), 'utf8');
    expect(source).not.toContain('bg-slate-950');
  });

  it.each(UI_FILES)('%s ne contient plus d’accent bleu vif', (file) => {
    const source = readFileSync(resolve(process.cwd(), file), 'utf8');
    expect(source).not.toMatch(/(?:bg|text|border)-sky-/);
  });
});
