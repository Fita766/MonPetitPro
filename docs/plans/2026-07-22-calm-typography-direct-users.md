# Calm Typography and Direct Users Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove excessive bold typography, email invitations, and the obsolete demo-transfer UI.

**Architecture:** Keep account creation behind the existing authenticated Edge Function, but expose only its direct `create` action in the admin page. Normalize typography classes across React components so body copy is 400, controls are 500, and structural headings are at most 600.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, Supabase Edge Functions, Vitest.

---

### Task 1: Lock the simplified administration behavior

**Files:**
- Modify: `src/lib/__tests__/roleAdministration.test.ts`
- Create: `src/lib/__tests__/adminUsersUi.test.ts`

1. Add static assertions that `AdminUsers.tsx` contains only direct account creation and no invitation/demo-transfer controls.
2. Run the focused tests and verify they fail against the current UI.
3. Keep the existing 12-character password validation test.

### Task 2: Simplify account creation and remove demo transfer UI

**Files:**
- Modify: `src/pages/AdminUsers.tsx`

1. Remove the invitation mode, invitation toggle, invitation wording, transfer tab, confirmation state, and transfer action.
2. Make the new-user form always invoke `action: 'create'` and always request a temporary password.
3. Run the focused tests and commit the behavior change.

### Task 3: Normalize typography across the application

**Files:**
- Modify: all `src/**/*.tsx` files containing `font-black`, `font-bold`, or `font-semibold`
- Test: `src/lib/__tests__/adminUsersUi.test.ts`

1. Add a static test rejecting `font-black`, `font-extrabold`, `font-bold`, and `font-extrabold` in application TSX.
2. Verify the test fails.
3. Mechanically map `font-black` and `font-bold` to `font-semibold`, then map existing `font-semibold` body/control usage to `font-medium`; retain `font-semibold` only for structural headings.
4. Verify no TSX uses a weight above 600.

### Task 4: Verify, integrate, and push

**Files:**
- Modify: documentation only if behavior descriptions need correction.

1. Run `npm test -- --run`, `npm run build`, `npm run lint`, and `git diff --check`.
2. Commit the typography change.
3. Merge the feature branch into `main`, rerun focused verification, and push `origin/main`.
