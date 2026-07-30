# MonPetitPro July 29 Platform Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the complete July 29 user-feedback redesign without losing existing Supabase data.

**Architecture:** Keep the React/Vite/Supabase application and add an additive PostgreSQL migration that introduces reference data, granular field permissions, account first-login state, user-linked observation assignments, flexible program/budget/objective records, and migration journals. Move business calculations into focused TypeScript libraries, keep pages as orchestration layers, and enforce every sensitive rule both in React and PostgreSQL RLS/triggers.

**Tech Stack:** React 19, TypeScript 5.9, Vite 8, Tailwind CSS 4, Zustand, Supabase Auth/Postgres/Storage/Edge Functions, Vitest, Testing Library, ExcelJS, jsPDF, date-fns, ICS text generation.

## Global Constraints

- Do not commit the pre-existing local changes to `package.json` or `package-lock.json`.
- Do not import Excel operation rows; use the workbook only to seed reference values.
- Preserve every existing operation, observation, event, document, typology, subsidy, condition, objective, profile, and audit row.
- Use additive, transaction-safe SQL with count assertions and a migration journal.
- No e-mail provider is required: administrators create users with a temporary password.
- A user with `must_change_password = true` cannot access business routes.
- Granular permissions must be enforced in PostgreSQL, not only by disabled form controls.
- A standard user can read only observations assigned to their account.
- A user without the DG permission must not receive DG observations from PostgreSQL.
- All exports must use the same filtered records and selected columns shown by the interface.
- Complete each task with focused tests, then run the full suite before its commit.

---

### Task 1: Authoritative migration schema and migration contract

**Files:**
- Create: `supabase/migrations/202607300001_july_feedback_rework.sql`
- Create: `src/lib/__tests__/julyFeedbackMigration.test.ts`
- Modify: `src/types/domain.ts`

**Interfaces:**
- Produces tables `reference_values`, `communes`, `operation_program_sections`, `operation_program_lines`, `operation_budget_lines`, `operation_objectives`, `operation_significant_works`, and `platform_migration_journal`.
- Produces profile columns `must_change_password boolean not null default false`.
- Produces observation column `assignee_user_id uuid references auth.users(id)`.
- Produces operation columns `program_nature text`, `commune_id uuid`, and the missing proposed planning dates named in the design.
- Later tasks consume the new row types from `src/types/domain.ts`.

- [ ] **Step 1: Write the migration contract test**

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync('supabase/migrations/202607300001_july_feedback_rework.sql', 'utf8');

describe('migration retours du 29 juillet', () => {
  it('crée tous les nouveaux modèles sans supprimer les anciens', () => {
    for (const table of [
      'reference_values', 'communes', 'operation_program_sections',
      'operation_program_lines', 'operation_budget_lines',
      'operation_objectives', 'operation_significant_works',
      'platform_migration_journal',
    ]) expect(sql).toContain(`public.${table}`);
    expect(sql).not.toMatch(/drop table\s+public\.(operations|observations|profiles)/i);
  });

  it('prévoit les affectations utilisateur et la première connexion', () => {
    expect(sql).toContain('must_change_password');
    expect(sql).toContain('assignee_user_id');
    expect(sql).toContain('references auth.users(id)');
  });

  it('termine par des assertions de comptage', () => {
    expect(sql).toContain('platform_migration_journal');
    expect(sql).toMatch(/raise exception[\s\S]*migration/i);
  });
});
```

- [ ] **Step 2: Run the contract test and verify it fails**

Run: `npm test -- --run src/lib/__tests__/julyFeedbackMigration.test.ts`

Expected: FAIL because the migration file does not exist.

- [ ] **Step 3: Add the schema in one transaction**

The migration must:

```sql
begin;

alter table public.profiles
  add column if not exists must_change_password boolean not null default false;

alter table public.observations
  add column if not exists assignee_user_id uuid references auth.users(id);

alter table public.operations
  add column if not exists commune_id uuid,
  add column if not exists program_nature text,
  add column if not exists approvals_expected_date date,
  add column if not exists permit_expected_date date,
  add column if not exists tender_expected_date date,
  add column if not exists cpr_expected_date date;
```

Create the tables with UUID primary keys, `operation_id ... on delete cascade`, nonnegative amount/unit checks, `sort_order`, timestamps, and indexes on every foreign key and filter column. Add foreign key `operations.commune_id` only after `communes` exists. Finish with assertions comparing source and migrated row counts, journal the counts, then `commit`.

- [ ] **Step 4: Add exact TypeScript row types**

Add:

```ts
export type ReferenceKind =
  | 'ctx' | 'cop' | 'assistant' | 'gpa_assistant' | 'manager'
  | 'animation_provider' | 'promoter' | 'certification'
  | 'thermal_regulation' | 'program_nature';

export interface ReferenceValue {
  id: string;
  kind: ReferenceKind;
  label: string;
  is_active: boolean;
  sort_order: number;
}

export interface CommuneReference {
  id: string;
  name: string;
  insee_code: string;
  postal_code: string | null;
  department_code: string;
  department_name: string;
  region_name: string | null;
  housing_zone: string | null;
  is_active: boolean;
}
```

Define equally explicit interfaces for the five operation child tables and add `must_change_password` to `Profile`, `assignee_user_id` to `Observation`.

- [ ] **Step 5: Run focused and full tests**

Run:

```powershell
npm test -- --run src/lib/__tests__/julyFeedbackMigration.test.ts
npm test -- --run
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```powershell
git add supabase/migrations/202607300001_july_feedback_rework.sql src/lib/__tests__/julyFeedbackMigration.test.ts src/types/domain.ts
git commit -m "feat: add July feedback data foundations"
```

---

### Task 2: Seed and administer business references

**Files:**
- Create: `supabase/seed/july_feedback_references.sql`
- Create: `scripts/extract_reference_seed.py`
- Create: `src/lib/references.ts`
- Create: `src/lib/__tests__/references.test.ts`
- Create: `src/pages/AdminReferences.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/lib/accessControl.ts`
- Modify: `src/types/domain.ts`

**Interfaces:**
- `normalizeReferenceLabel(value: string): string`
- `selectCommune(commune: CommuneReference): { communeId: string; commune: string; department: string; zoning: string }`
- Administration writes `reference_values` and `communes`.

- [ ] **Step 1: Write failing normalization and commune-selection tests**

```ts
import { describe, expect, it } from 'vitest';
import { normalizeReferenceLabel, selectCommune } from '../references';

it('normalise les espaces sans détruire les accents', () => {
  expect(normalizeReferenceLabel('  SAINT   QUENTIN ')).toBe('SAINT QUENTIN');
});

it('remplit département et zonage depuis la commune', () => {
  expect(selectCommune({
    id: 'c1', name: 'CLAIROIX', insee_code: '60156', postal_code: '60280',
    department_code: '60', department_name: 'Oise', region_name: 'Hauts-de-France',
    housing_zone: 'B2', is_active: true,
  })).toEqual({ communeId: 'c1', commune: 'CLAIROIX', department: '60', zoning: 'B2' });
});
```

- [ ] **Step 2: Run and observe failure**

Run: `npm test -- --run src/lib/__tests__/references.test.ts`

Expected: FAIL because `references.ts` does not exist.

- [ ] **Step 3: Implement the pure reference helpers**

Use whitespace normalization only; do not strip accents or punctuation. `selectCommune` must copy authoritative values without user-entered fallbacks.

- [ ] **Step 4: Create the deterministic workbook extractor**

`scripts/extract_reference_seed.py` reads only:

- `Listes!R:X` for communes;
- `BD!A`, `C`, `E`, `L`, `N`, `P` for stage/certification/thermal/COP/CTX/promoter;
- distinct existing values from `TBL BORD` for missing team references.

It emits SQL `insert ... on conflict ... do update` in stable alphabetical order, restricted to departments `02,59,60,62,77,80,93,94,95`. It must never emit operation inserts.

- [ ] **Step 5: Generate and inspect the seed**

Run:

```powershell
python scripts/extract_reference_seed.py "dossiers modifs/TBX SUIVI DMO actuel.xlsx" "supabase/seed/july_feedback_references.sql"
rg -n "insert into public.operations" supabase/seed/july_feedback_references.sql
```

Expected: the second command returns no match.

- [ ] **Step 6: Add reference permissions**

Add `references.view` and `references.manage` to the TypeScript catalog and SQL permission definitions. Add corresponding RLS policies: authenticated users with `references.view` can select; `references.manage` can insert/update; referenced rows are deactivated rather than deleted.

- [ ] **Step 7: Build the administration page**

Create tabs for each `ReferenceKind` plus communes. Each tab supports search, create, rename, reorder, activate/deactivate. Commune editing includes department and housing zone. There is no raw SQL, UUID, or color code in the UI.

- [ ] **Step 8: Route and navigation**

Add `/admin/references`, guarded by `references.view`. Show it under Administration only when authorized.

- [ ] **Step 9: Verify**

Run:

```powershell
npm test -- --run src/lib/__tests__/references.test.ts src/lib/__tests__/accessControl.test.ts
npm run build
npm run lint
```

Expected: all commands pass.

- [ ] **Step 10: Commit**

```powershell
git add supabase/seed/july_feedback_references.sql scripts/extract_reference_seed.py src/lib/references.ts src/lib/__tests__/references.test.ts src/pages/AdminReferences.tsx src/App.tsx src/components/layout/Sidebar.tsx src/lib/accessControl.ts src/types/domain.ts supabase/migrations/202607300001_july_feedback_rework.sql
git commit -m "feat: add administrable DMO references"
```

---

### Task 3: Granular field permissions and first-login password change

**Files:**
- Create: `src/lib/operationFieldPermissions.ts`
- Create: `src/lib/__tests__/operationFieldPermissions.test.ts`
- Create: `src/pages/ChangePassword.tsx`
- Modify: `src/App.tsx`
- Modify: `src/pages/AdminUsers.tsx`
- Modify: `src/lib/accessControl.ts`
- Modify: `supabase/functions/admin-users/index.ts`
- Modify: `supabase/migrations/202607300001_july_feedback_rework.sql`

**Interfaces:**
- `operationFieldPermission(field: keyof OperationFormData): PermissionKey`
- `canEditOperationField(permissions: readonly string[], field: keyof OperationFormData): boolean`
- Edge action `create` sets `profiles.must_change_password = true`.
- Route `/change-password` updates Auth password and clears the profile flag through `complete_password_change()`.

- [ ] **Step 1: Write failing permission-mapping tests**

```ts
it('maps every persisted operation form field to one permission', () => {
  for (const field of PERSISTED_OPERATION_FIELDS) {
    expect(operationFieldPermission(field)).toBe(`operations.field.${field}.edit`);
  }
});

it('does not grant one field from another field permission', () => {
  expect(canEditOperationField(['operations.field.commune.edit'], 'commune')).toBe(true);
  expect(canEditOperationField(['operations.field.commune.edit'], 'actual_delivery_date')).toBe(false);
});
```

- [ ] **Step 2: Run and observe failure**

Run: `npm test -- --run src/lib/__tests__/operationFieldPermissions.test.ts`

- [ ] **Step 3: Generate permission definitions from one field registry**

`operationFieldPermissions.ts` is the sole registry containing field key, label, group, and legacy bundle. Both the admin role UI and form controls consume it. SQL inserts one permission definition per registry entry using the same naming convention.

- [ ] **Step 4: Replace section-wide form disabling**

Remove the single `fieldset disabled={!editable}` behavior. Each control receives `disabled={!canEditOperationField(permissions, key)}`. A create permission allows initial fields only until the operation exists; subsequent edits obey individual keys.

- [ ] **Step 5: Enforce the same mapping in PostgreSQL**

Replace the broad trigger arrays with one map of column name to `operations.field.<field>.edit`. On update, iterate changed JSONB keys and raise an exception for the first missing permission. Preserve service-role bypass.

- [ ] **Step 6: Force password change**

In the Edge `create` action, update:

```ts
{
  display_name: ...,
  initials: ...,
  custom_role_id: payload.roleId || null,
  status: 'active',
  must_change_password: true,
}
```

Create `complete_password_change()` as a security-definer function that can only clear the flag for `auth.uid()`. `ChangePassword.tsx` requires 12 characters and matching confirmation, calls `supabase.auth.updateUser({ password })`, then the RPC.

- [ ] **Step 7: Add route gate**

After profile loading, redirect every authenticated user with `must_change_password` to `/change-password`. Prevent navigating away until successful. Owners already active keep `false`.

- [ ] **Step 8: Update role administration UX**

Group field permissions by Identity, Team, Program, Planning, Budget, Objectives, Synthesis. Add search and per-group select all. Keep predefined role colors.

- [ ] **Step 9: Verify**

Run:

```powershell
npm test -- --run src/lib/__tests__/operationFieldPermissions.test.ts src/lib/__tests__/adminUsersEdgeFunction.test.ts src/lib/__tests__/accessControlMigration.test.ts
npm run build
npm run lint
```

- [ ] **Step 10: Commit**

```powershell
git add src/lib/operationFieldPermissions.ts src/lib/__tests__/operationFieldPermissions.test.ts src/pages/ChangePassword.tsx src/App.tsx src/pages/AdminUsers.tsx src/lib/accessControl.ts supabase/functions/admin-users/index.ts supabase/migrations/202607300001_july_feedback_rework.sql
git commit -m "feat: enforce field permissions and first login reset"
```

---

### Task 4: User-linked private observations

**Files:**
- Create: `src/lib/observationAccess.ts`
- Create: `src/lib/__tests__/observationAccess.test.ts`
- Modify: `src/lib/observationStatus.ts`
- Modify: `src/components/observations/ObservationForm.tsx`
- Modify: `src/pages/Observations.tsx`
- Modify: `src/pages/OperationDetail.tsx`
- Modify: `supabase/migrations/202607300001_july_feedback_rework.sql`

**Interfaces:**
- `buildObservationDraft(profile, canAssign): ObservationFormData`
- `editableObservationFields(permissions): Set<keyof ObservationFormData>`
- Observations use `assignee_user_id`; `responsible_person` remains a compatibility display snapshot.

- [ ] **Step 1: Write failing workflow tests**

```ts
it('self-assigns a standard creator', () => {
  expect(buildObservationDraft({ id: 'u1', display_name: 'Alice' }, false))
    .toMatchObject({ assignee_user_id: 'u1', responsible_person: 'Alice' });
});

it('hides privileged fields from a conductor', () => {
  const fields = editableObservationFields(['observations.create', 'observations.edit_assigned']);
  expect(fields.has('description')).toBe(true);
  expect(fields.has('resolution_date')).toBe(true);
  expect(fields.has('completion_date')).toBe(false);
  expect(fields.has('status')).toBe(false);
  expect(fields.has('is_dg')).toBe(false);
});
```

- [ ] **Step 2: Run and observe failure**

Run: `npm test -- --run src/lib/__tests__/observationAccess.test.ts`

- [ ] **Step 3: Add explicit observation permissions**

Add:

```text
observations.view_assigned
observations.view_all
observations.edit_assigned
observations.assign
observations.reassign
observations.set_completion
observations.set_status
observations.view_dg
observations.set_dg
```

Map legacy permissions to the corresponding system role seeds, but do not use legacy broad keys for new authorization checks.

- [ ] **Step 4: Implement RLS**

Select policy:

```sql
using (
  (
    public.has_permission('observations.view_all')
    or (
      assignee_user_id = (select auth.uid())
      and public.has_permission('observations.view_assigned')
    )
  )
  and (not is_dg or public.has_permission('observations.view_dg'))
);
```

Insert requires `assignee_user_id = auth.uid()` unless the caller has `observations.assign`. The update trigger checks each sensitive field independently. Validation permission can change only validation columns.

- [ ] **Step 5: Migrate existing assignments safely**

Match `responsible_person` against profile display name, initials, or email prefix only when exactly one active profile matches. Leave ambiguous observations with `assignee_user_id = null`; only `view_all` users can see them. Journal matched, unmatched, and ambiguous counts.

- [ ] **Step 6: Update forms**

Fetch active profiles as assignee options only for users with `assign`/`reassign`. Standard users see their own name as a disabled field. Completion and status remain visible but disabled without permission. Do not render the DG block at all without `view_dg`; render its checkbox only with `set_dg`.

- [ ] **Step 7: Update lists and exports**

The page no longer filters private observations client-side as a security mechanism; Supabase returns only authorized rows. Exports operate on those same rows. Add an administrative “Sans affectation” filter for `view_all`.

- [ ] **Step 8: Verify**

Run:

```powershell
npm test -- --run src/lib/__tests__/observationAccess.test.ts src/lib/__tests__/observationStatus.test.ts src/lib/__tests__/accessControlMigration.test.ts
npm run build
npm run lint
```

- [ ] **Step 9: Commit**

```powershell
git add src/lib/observationAccess.ts src/lib/__tests__/observationAccess.test.ts src/lib/observationStatus.ts src/components/observations/ObservationForm.tsx src/pages/Observations.tsx src/pages/OperationDetail.tsx src/lib/accessControl.ts src/types/domain.ts supabase/migrations/202607300001_july_feedback_rework.sql
git commit -m "feat: make observations private and user assigned"
```

---

### Task 5: Flexible program sections and calculated totals

**Files:**
- Create: `src/lib/program.ts`
- Create: `src/lib/__tests__/program.test.ts`
- Create: `src/components/operations/program/ProgramSectionCard.tsx`
- Create: `src/components/operations/program/ProgramLineEditor.tsx`
- Modify: `src/components/operations/ProgramSection.tsx`
- Modify: `src/pages/OperationForm.tsx`
- Modify: `src/lib/operationPayload.ts`
- Modify: `src/types/domain.ts`
- Modify: `supabase/migrations/202607300001_july_feedback_rework.sql`

**Interfaces:**
- `calculateProgramTotals(sections, lines): ProgramTotals`
- `ProgramTotals` contains `total`, `collective`, `individual`, `commercial`, and `byProduct`.

- [ ] **Step 1: Write failing calculation tests**

```ts
it('calculates totals once from active detailed lines', () => {
  const totals = calculateProgramTotals(
    [
      { id: 'collective', kind: 'collective', enabled: true },
      { id: 'individual', kind: 'individual', enabled: true },
      { id: 'commerce', kind: 'commercial', enabled: true },
    ],
    [
      { section_id: 'collective', label: 'T2', product: 'PLUS', units: 4, average_surface: 52 },
      { section_id: 'individual', label: 'T4', product: 'PLAI', units: 3, average_surface: 80 },
      { section_id: 'commerce', label: 'Local 1', product: null, units: 1, average_surface: 95 },
    ],
  );
  expect(totals).toMatchObject({
    total: 8, collective: 4, individual: 3, commercial: 1,
    byProduct: { PLUS: 4, PLAI: 3, PLS: 0, LLI: 0, BRS: 0, PSLA: 0 },
  });
});
```

- [ ] **Step 2: Run and observe failure**

Run: `npm test -- --run src/lib/__tests__/program.test.ts`

- [ ] **Step 3: Implement pure totals**

Ignore disabled sections and null units. Reject negative or non-finite units. Commercial/custom lines count toward the total but not a housing product unless a product is explicitly present.

- [ ] **Step 4: Build section and line editors**

The main Program page offers toggles for collective, individual, commercial, and “Ajouter une catégorie”. Each card supports add, remove, and reorder. Housing rows offer typology suggestion plus product; commercial rows omit product.

- [ ] **Step 5: Replace duplicate manual totals**

Show totals as read-only summary cards. On save, calculate totals and write legacy operation aggregate columns for compatibility. Remove Student/Specific inputs from the UI without dropping their legacy columns.

- [ ] **Step 6: Migrate legacy typologies**

Create one collective section per operation with existing `operation_typologies` rows. If legacy individual/collective totals exist but detailed lines cannot explain them, create clearly labeled compatibility lines so totals do not change.

- [ ] **Step 7: Verify**

Run:

```powershell
npm test -- --run src/lib/__tests__/program.test.ts src/lib/__tests__/operationPayload.test.ts
npm run build
npm run lint
```

- [ ] **Step 8: Commit**

```powershell
git add src/lib/program.ts src/lib/__tests__/program.test.ts src/components/operations/program src/components/operations/ProgramSection.tsx src/pages/OperationForm.tsx src/lib/operationPayload.ts src/types/domain.ts supabase/migrations/202607300001_july_feedback_rework.sql
git commit -m "feat: add flexible calculated operation programs"
```

---

### Task 6: Reference-driven operation identity

**Files:**
- Create: `src/components/operations/ReferenceSelect.tsx`
- Modify: `src/components/operations/GeneralSection.tsx`
- Modify: `src/pages/OperationForm.tsx`
- Modify: `src/lib/operationPayload.ts`
- Modify: `src/lib/__tests__/operationPayload.test.ts`

**Interfaces:**
- `ReferenceSelect` accepts `{ valueId, options, disabled, onSelect }`.
- Commune selection sets `commune_id`, `commune`, `department`, and `zoning` atomically.

- [ ] **Step 1: Add failing payload tests**

Test that `operation_type` accepts only `MOD|VEFA`, `program_nature` is independent, and commune selection persists the authoritative snapshot plus `commune_id`.

- [ ] **Step 2: Run and observe failure**

Run: `npm test -- --run src/lib/__tests__/operationPayload.test.ts`

- [ ] **Step 3: Implement searchable selects**

Use native accessible combobox behavior with filtering, keyboard navigation, inactive badges, and no free text committed for standard users.

- [ ] **Step 4: Split mode and nature**

`Mode de réalisation` contains only MOD and VEFA. `Nature du programme` consumes active references. Team, promoter, certification, and thermal regulation consume their respective references.

- [ ] **Step 5: Verify and commit**

Run full focused tests, build, and lint; commit as:

```powershell
git commit -m "feat: drive operation identity from references"
```

---

### Task 7: Thematic planning, expected/actual pairs, and delays

**Files:**
- Create: `src/lib/planningMilestones.ts`
- Create: `src/lib/__tests__/planningMilestones.test.ts`
- Create: `src/components/operations/planning/MilestoneGroup.tsx`
- Create: `src/components/operations/planning/MilestoneRow.tsx`
- Modify: `src/components/operations/PlanningSection.tsx`
- Modify: `src/lib/operationCalculations.ts`
- Modify: `src/lib/operationPayload.ts`
- Modify: `src/types/domain.ts`

**Interfaces:**
- `MILESTONE_GROUPS: MilestoneGroupDefinition[]`
- `calculateDateVariance(expected, actual): number | null`
- `visibleMilestones(mode: 'MOD'|'VEFA'): MilestoneDefinition[]`

- [ ] **Step 1: Write failing planning tests**

```ts
expect(calculateDateVariance('2026-05-01', '2026-05-16')).toBe(15);
expect(calculateDateVariance('2026-05-01', '2026-04-21')).toBe(-10);
expect(calculateDateVariance(null, '2026-04-21')).toBeNull();
expect(visibleMilestones('VEFA').some((m) => m.key === 'works_order_actual_date')).toBe(false);
```

- [ ] **Step 2: Run and observe failure**

Run: `npm test -- --run src/lib/__tests__/planningMilestones.test.ts`

- [ ] **Step 3: Implement milestone metadata**

Define all eight groups and every legacy/proposed milestone with code, label, expected field, actual field, applicability, formula note, and alert eligibility. This registry also drives calendar events and export columns.

- [ ] **Step 4: Implement day variance safely**

Parse ISO dates at UTC midnight and divide integer milliseconds by `86_400_000`; do not use local daylight-saving offsets.

- [ ] **Step 5: Rebuild the planning page**

Render one themed card per group. Pair expected/actual dates on one row, show `+15 jours de retard`, `−10 jours d’avance`, or `À l’heure`. Hide non-applicable VEFA fields with one explanatory note per group.

- [ ] **Step 6: Preserve contractual calculations**

Reuse and extend `calculateOperationSchedule`. Add tests for MOD/VEFA, actual OS fallback, justified delay, and null input. Keep A–CG code labels secondary.

- [ ] **Step 7: Verify and commit**

Run planning and calculation tests, build, lint, then:

```powershell
git commit -m "feat: organize planning and expose date variances"
```

---

### Task 8: Alerts, dashboard, calendars, and Outlook ICS

**Files:**
- Create: `src/lib/alerts.ts`
- Create: `src/lib/ics.ts`
- Create: `src/lib/__tests__/alerts.test.ts`
- Create: `src/lib/__tests__/ics.test.ts`
- Create: `src/components/dashboard/UpcomingAlerts.tsx`
- Modify: `src/pages/Dashboard.tsx`
- Modify: `src/lib/calendarEvents.ts`
- Modify: `src/lib/__tests__/calendarEvents.test.ts`
- Modify: `src/components/calendar/CalendarFilters.tsx`
- Modify: `src/pages/CalendarView.tsx`

**Interfaces:**
- `buildAlerts(operations, today): OperationAlert[]`
- `buildIcs(events, calendarName): string`
- Calendar views become `conditions|program|works|deliveries|management|agenda`.

- [ ] **Step 1: Write failing alert tests**

Cover J-30, J-15, overdue, completed milestones excluded, and dates outside the windows.

- [ ] **Step 2: Write failing ICS tests**

```ts
const ics = buildIcs([{ uid: 'op1-pc', title: 'Dépôt PC — Clairoix', date: '2026-05-01' }], 'MonPetitPro');
expect(ics).toContain('BEGIN:VCALENDAR');
expect(ics).toContain('TRIGGER:-P30D');
expect(ics).toContain('TRIGGER:-P15D');
expect(ics).toContain('END:VCALENDAR');
```

- [ ] **Step 3: Implement pure alert and ICS builders**

Escape ICS commas, semicolons, backslashes, and newlines. Use all-day dates and deterministic UID values. Alert windows come from the planning milestone registry.

- [ ] **Step 4: Add dashboard alert summary**

Display overdue, 15-day, and 30-day groups with operation links. Apply operation-read permissions naturally through Supabase RLS.

- [ ] **Step 5: Rebuild calendar event generation**

Generate program and works events from the same milestone registry, including AJ–AU dates currently absent. Preserve delivery fallback `BN > BL > AZ` and management fallback `CA > BZ`.

- [ ] **Step 6: Expand filters**

Every view gets operation and period. Add CTX, COP, department, promoter, stage, mode, nature, and milestone type when applicable. Ensure multi-select filter state is shared by screen and export.

- [ ] **Step 7: Add Outlook actions**

Each event has “Ajouter à Outlook”; the toolbar exports all currently filtered events as ICS.

- [ ] **Step 8: Verify and commit**

Run alert, ICS, and calendar tests plus build/lint; commit:

```powershell
git commit -m "feat: add planning alerts and Outlook calendars"
```

---

### Task 9: Budget matrix and forecast/final subsidies

**Files:**
- Create: `src/lib/budget.ts`
- Create: `src/lib/__tests__/budget.test.ts`
- Create: `src/components/operations/budget/BudgetMatrix.tsx`
- Modify: `src/components/operations/BudgetSection.tsx`
- Modify: `src/pages/OperationForm.tsx`
- Modify: `src/lib/statistics.ts`
- Modify: `src/types/domain.ts`

**Interfaces:**
- `aggregateOperationBudget(lines): BudgetTotals`
- Budget dimensions are family `LLS|LLI|managed`, mode `MOD|VEFA`, phase `forecast|final`.

- [ ] **Step 1: Write failing aggregation tests**

Test HT, TTC, equity by phase, family, mode, and global totals while preserving zero versus null.

- [ ] **Step 2: Run and observe failure**

Run: `npm test -- --run src/lib/__tests__/budget.test.ts`

- [ ] **Step 3: Implement aggregation**

Use decimal numbers as received from PostgreSQL; normalize null to absent and zero to an intentional amount. Return both totals and completeness warnings.

- [ ] **Step 4: Build the budget matrix**

Allow row add/remove for relevant family/mode pairs. Columns contain forecast and final HT/TTC/equity. Show totals beneath.

- [ ] **Step 5: Extend subsidies**

Replace one amount field with forecast and final amount plus comment. Migrate existing amount to forecast.

- [ ] **Step 6: Save child records transactionally**

Expose one PostgreSQL RPC `save_operation_finance(operation_id, budget_json, subsidies_json)` that verifies permissions and applies inserts/updates/deletes in one transaction. Do not leave partial finance writes.

- [ ] **Step 7: Verify and commit**

Run budget/statistics tests, build, lint; commit:

```powershell
git commit -m "feat: add detailed operation finance matrix"
```

---

### Task 10: Multi-kind initial and supplementary objectives

**Files:**
- Create: `src/lib/objectiveRecords.ts`
- Create: `src/lib/__tests__/objectiveRecords.test.ts`
- Modify: `src/components/operations/ObjectivesSection.tsx`
- Modify: `src/pages/Objectives.tsx`
- Modify: `src/lib/objectives.ts`
- Modify: `src/lib/__tests__/objectives.test.ts`
- Modify: `src/pages/OperationForm.tsx`

**Interfaces:**
- Objective kind `works_order|management`.
- Objective category `initial|supplementary`.
- `buildObjectiveReport(records, operations, year, kind): ObjectiveReport`.

- [ ] **Step 1: Write failing objective tests**

Cover independent OS/MEG membership, immutable initial snapshot, supplementary totals separated from initial, realized outside objective, duplicate prevention, and housing-month gain/loss only for management.

- [ ] **Step 2: Run and observe failure**

Run: `npm test -- --run src/lib/__tests__/objectiveRecords.test.ts src/lib/__tests__/objectives.test.ts`

- [ ] **Step 3: Implement immutable database behavior**

Trigger rules:

- on initial insert, snapshot date and units;
- later updates cannot change snapshot date/units;
- unique `(operation_id, kind, year, category)`;
- deleting an initial objective requires an explicit high-level permission.

- [ ] **Step 4: Replace the operation objective checkbox**

Render separate OS and MEG panels. Each supports year and category. Existing operations show their migrated management initial record.

- [ ] **Step 5: Rebuild objective reporting**

Add kind selector, source badges, initial/supplementary/realized summary, cumulative months, detail table, and export using the same report object.

- [ ] **Step 6: Verify and commit**

Run all objective tests, build, lint; commit:

```powershell
git commit -m "feat: track initial and supplementary objectives"
```

---

### Task 11: Statistics with basis selection and drill-down

**Files:**
- Create: `src/lib/statisticsDrilldown.ts`
- Create: `src/lib/__tests__/statisticsDrilldown.test.ts`
- Create: `src/components/statistics/StatisticsDetailDialog.tsx`
- Modify: `src/lib/statistics.ts`
- Modify: `src/lib/__tests__/statistics.test.ts`
- Modify: `src/pages/Statistics.tsx`
- Modify: `src/components/statistics/BudgetStats.tsx`
- Modify: `src/components/statistics/DeliveryStats.tsx`
- Modify: `src/components/statistics/CtxStats.tsx`
- Modify: `src/components/statistics/PromoterStats.tsx`

**Interfaces:**
- `StatisticsBasis = 'works_order'|'delivery'`
- Every aggregate row includes `operationIds: string[]`.
- Detail dialog consumes those IDs and the already-authorized operation list.

- [ ] **Step 1: Add failing aggregation-provenance tests**

Assert each promoter, CTX, monthly delivery, monthly OS, and budget result has the exact contributing operation IDs and no duplicates.

- [ ] **Step 2: Run and observe failure**

Run: `npm test -- --run src/lib/__tests__/statistics.test.ts src/lib/__tests__/statisticsDrilldown.test.ts`

- [ ] **Step 3: Add OS statistics and basis-aware budget**

Use actual OS with expected fallback for OS reports; actual delivery with expected fallback for delivery reports. Multiple years include an operation once per selected basis date.

- [ ] **Step 4: Add drill-down UI**

Every total/chart row has “Voir le détail”. Dialog shows operation, date, housing, amounts, CTX/COP/promoter as appropriate and exports the displayed rows.

- [ ] **Step 5: Verify and commit**

Run statistics tests, build, lint; commit:

```powershell
git commit -m "feat: add OS statistics and report drilldowns"
```

---

### Task 12: Synthesis, significant works, and document review

**Files:**
- Create: `src/lib/synthesisModel.ts`
- Create: `src/lib/__tests__/synthesisModel.test.ts`
- Create: `src/components/operations/synthesis/SignificantWorksEditor.tsx`
- Modify: `src/components/operations/SynthesisSection.tsx`
- Modify: `src/lib/synthesisPdf.ts`
- Modify: `src/lib/__tests__/documentReview.test.ts`
- Modify: `src/lib/documentReview.ts`
- Modify: `src/pages/OperationDetail.tsx`

**Interfaces:**
- `buildSynthesisModel(input): SynthesisModel`
- `totalSignificantWorks(rows): number`
- PDF generator consumes only `SynthesisModel`, not raw heterogeneous rows.

- [ ] **Step 1: Write failing synthesis model tests**

Use the Clairoix note values and assert:

- 20 collective + 11 individual + 1 local;
- typology/financing summaries;
- subsidy total `177914`;
- significant works total `186640.26`;
- missing-field warnings.

- [ ] **Step 2: Run and observe failure**

Run: `npm test -- --run src/lib/__tests__/synthesisModel.test.ts`

- [ ] **Step 3: Implement synthesis model**

Aggregate program sections, finance, subsidy, significant works, planning, descriptions, and authorized document images. Format only at rendering time.

- [ ] **Step 4: Build significant work rows**

Replace the single text area with label, HT amount, and comment rows. Keep legacy significant text as a migrated first comment when it cannot be parsed.

- [ ] **Step 5: Redesign the PDF**

Follow the six sections of the provided note. Use a light design consistent with the app, page breaks that keep headings with content, totals, image captions, and graceful missing-image behavior.

- [ ] **Step 6: Complete document review offsets**

Seed the `REVUE DOC LIV` labels and offsets, recalculate expected dates from the operation reference date, preserve received dates, and never overwrite a manually received date.

- [ ] **Step 7: Verify and commit**

Run synthesis/document tests, generate a fixture PDF, inspect it, run build/lint; commit:

```powershell
git commit -m "feat: generate complete operation synthesis"
```

---

### Task 13: Shared filtered exports and observation column bug

**Files:**
- Create: `src/lib/exportRegistry.ts`
- Create: `src/lib/__tests__/exportRegistry.test.ts`
- Create: `src/components/exports/ExportColumnDialog.tsx`
- Modify: `src/lib/operationExport.ts`
- Modify: `src/pages/Observations.tsx`
- Modify: `src/pages/CalendarView.tsx`
- Modify: `src/pages/Objectives.tsx`
- Modify: `src/pages/Statistics.tsx`

**Interfaces:**
- `authorizedColumns(registry, permissions): ExportColumn[]`
- `projectExportRows(rows, selectedKeys, registry): unknown[][]`
- Screen pages pass their already filtered rows to exporters.

- [ ] **Step 1: Write failing projection tests**

Assert order preservation, omission of unselected fields, permission removal for DG and budget fields, date/currency formatting, and no fallback to a default 11-column set.

- [ ] **Step 2: Run and observe failure**

Run: `npm test -- --run src/lib/__tests__/exportRegistry.test.ts`

- [ ] **Step 3: Implement one export registry**

Each column contains key, label, group, formatter, and optional required permission. Reject unknown keys. Persist selected keys in `localStorage` under a page-specific key.

- [ ] **Step 4: Replace page-specific column selection**

Use `ExportColumnDialog` for operations and observations first. Calendar/objectives/statistics continue with fixed report columns but consume the same formatting primitives and filtered row input.

- [ ] **Step 5: Add dedicated DG export**

Only render the action for `observations.view_dg` plus export permission. It exports `filtered.filter(row => row.is_dg)` with selected authorized columns.

- [ ] **Step 6: Verify and commit**

Run export tests, build, lint; commit:

```powershell
git commit -m "fix: make filtered exports honor selected columns"
```

---

### Task 14: Audit history interface

**Files:**
- Create: `src/lib/audit.ts`
- Create: `src/lib/__tests__/audit.test.ts`
- Create: `src/pages/AuditHistory.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/layout/Sidebar.tsx`

**Interfaces:**
- `formatAuditChanges(oldValues, newValues, labels): AuditChange[]`
- Route `/admin/history` requires `admin.audit.view`.

- [ ] **Step 1: Write failing diff-format tests**

Cover insert, update, delete, hidden technical keys, field labels, null values, dates, and unchanged fields omitted.

- [ ] **Step 2: Run and observe failure**

Run: `npm test -- --run src/lib/__tests__/audit.test.ts`

- [ ] **Step 3: Implement formatter and page**

Fetch paginated audit records plus profile display names. Filter by period, user, operation/table, and action. Expand a row to show readable before/after values.

- [ ] **Step 4: Verify and commit**

Run tests/build/lint; commit:

```powershell
git commit -m "feat: expose authorized change history"
```

---

### Task 15: Migration execution, security matrix, browser validation, and completion audit

**Files:**
- Create: `docs/july-feedback-acceptance-matrix.md`
- Create: `scripts/verify_july_feedback_ui.py`
- Modify: `docs/database-migration.md`
- Modify: `docs/access-control-rollout.md`

**Interfaces:**
- Acceptance matrix maps every section of the design spec to a test, SQL query, browser scenario, or generated artifact.

- [ ] **Step 1: Build the acceptance matrix before deployment**

For every requirement in the design spec, record:

```markdown
| Requirement | Evidence command/scenario | Status |
| Commune fills department and zoning | references.test.ts + browser create operation | pending |
```

There must be no requirement without evidence.

- [ ] **Step 2: Run local verification**

Run:

```powershell
npm test -- --run
npm run build
npm run lint
git diff --check
```

Expected: all pass; the Vite large-chunk warning may remain a warning.

- [ ] **Step 3: Apply migration to the linked Supabase project**

First verify the linked project reference equals `vtzpkupnpinqtptrgbus`. Use Supabase CLI migration commands; never print tokens or passwords. Record the applied migration version and journal counts.

- [ ] **Step 4: Deploy the updated Edge Function**

Deploy `admin-users`, then create a disposable test user with a temporary password. Verify forced password change, then delete/suspend the disposable account through an authorized administrative flow.

- [ ] **Step 5: Execute the RLS security matrix**

Use test accounts/roles for:

- owner/admin;
- responsible;
- assistant;
- conductor A;
- conductor B;
- reader.

Prove conductor A cannot select or update conductor B’s observation, cannot receive DG rows, and cannot update unauthorized operation fields by direct Supabase request. Prove responsible/admin can perform their granted actions.

- [ ] **Step 6: Run browser scenarios**

`verify_july_feedback_ui.py` must validate:

1. create account and mandatory password change;
2. create operation using commune/reference selects;
3. flexible program totals;
4. MOD and VEFA planning visibility;
5. dashboard alerts and ICS download;
6. private observation assignment;
7. budget matrix;
8. initial and supplementary objectives;
9. statistics drill-down;
10. selected-column observation export;
11. synthesis PDF generation;
12. audit history.

Capture screenshots and generated artifacts under ignored `artifacts/`.

- [ ] **Step 7: Reconcile migration counts**

SQL evidence must show:

- source and migrated typology counts reconcile;
- every legacy objective has one migrated record;
- every old subsidy exists in the new representation;
- observations are partitioned into matched/unmatched counts with no missing rows;
- operation and profile counts are unchanged;
- no duplicate operation IDs.

- [ ] **Step 8: Complete the acceptance matrix**

Replace every `pending` with `passed` and a concrete artifact/command, or continue implementation. Do not mark an unverified row passed.

- [ ] **Step 9: Final commit**

```powershell
git add docs/july-feedback-acceptance-matrix.md scripts/verify_july_feedback_ui.py docs/database-migration.md docs/access-control-rollout.md
git commit -m "test: verify complete July feedback rollout"
```

- [ ] **Step 10: Push only after clean verification**

Confirm only the user’s pre-existing package changes remain unstaged, then:

```powershell
git push origin main
```

