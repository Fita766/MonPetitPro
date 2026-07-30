import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
const edge = readFileSync(resolve(process.cwd(), 'supabase/functions/admin-users/index.ts'), 'utf8');
const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/202607300001_july_feedback_rework.sql'),
  'utf8',
);

describe('first login password change', () => {
  it('marks directly created accounts as requiring a password change', () => {
    expect(edge).toContain('must_change_password: true');
  });

  it('gates authenticated navigation behind the password change page', () => {
    expect(app).toMatch(/profile\?*\.must_change_password/);
    expect(app).toContain('path="/change-password"');
  });

  it('exposes a completion RPC to the authenticated user', () => {
    expect(migration).toContain('complete_password_change');
    expect(migration).toContain('grant execute on function public.complete_password_change() to authenticated');
  });
});
