# Mineral Palette and Outlook Discoverability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace MonPetitPro’s fluorescent turquoise system with a calm light-only mineral palette, expose Outlook exports at every requested deadline surface, and re-audit the July 29 requirements with behavior-level evidence.

**Architecture:** Keep the React/Tailwind structure and redefine structural color scales centrally in `src/index.css`, with targeted edits where semantic state or exported documents require explicit colors. Keep ICS generation pure, add an alert-to-ICS adapter, and make calendar/dashboard use the same export path. Extend Playwright so it proves actual downloads and filtered content instead of button presence.

**Tech Stack:** React 19, TypeScript 5.9, Tailwind CSS 4, Vite 8, Vitest, Playwright, Supabase, `date-fns`, ICS.

## Global Constraints

- The application is exclusively light themed; no dark mode, switcher, `prefers-color-scheme: dark`, or hidden dark palette.
- No pure black, fluorescent turquoise, bright blue, colored glow, or large decorative gradient.
- Structural actions use deep terracotta `#8F4938`; success alone may use muted olive `#5D745A`.
- Routes, permissions, business data, and factual copy remain unchanged unless the July 29 transcript requires correction.
- Color is never the sole carrier of status.
- Outlook remains a local ICS download with J-30/J-15 alarms; no Microsoft integration is added.
- User-owned changes in the main workspace’s package files are not touched.

---

### Task 1: Centralize the light mineral palette

**Files:**
- Modify: `src/index.css`
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/components/layout/AppLayout.tsx`
- Modify: `src/pages/AdminUsers.tsx`
- Modify: `src/pages/ChangePassword.tsx`
- Modify: `scripts/verify_july_feedback_ui.py`

**Interfaces:**
- Consumes: existing Tailwind utilities and `@theme`.
- Produces: shared light-only mineral tokens and a browser regression that rejects the discarded visual world from computed styles.

- [ ] **Step 1: Write the failing browser palette assertions**

Extend `verify_july_feedback_ui.py` to inspect computed styles on the rendered application. The body must resolve to `rgb(246, 244, 239)`, `color-scheme` must be `light`, the primary login button must resolve to `rgb(143, 73, 56)`, and no button or accessible label may expose a theme switcher.

```py
body = page.locator("body").evaluate("el => getComputedStyle(el).backgroundColor")
scheme = page.locator("html").evaluate("el => getComputedStyle(el).colorScheme")
primary = page.get_by_role("button", name="Se connecter").evaluate("el => getComputedStyle(el).backgroundColor")
assert body == "rgb(246, 244, 239)"
assert scheme == "light"
assert primary == "rgb(143, 73, 56)"
expect(page.get_by_role("button", name=re.compile("thème|mode sombre", re.I))).to_have_count(0)
```

- [ ] **Step 2: Run it and observe the expected failure**

Run the current build with `MPP_MOCK_AUTH=1` through `with_server.py` and the verifier.

- [ ] **Step 3: Implement the mineral scales**

Define warm slate, terracotta-mapped teal, muted olive-mapped emerald, surface and border variables in `src/index.css`. Set `:root { color-scheme: light; }`, `#F6F4EF` body background, and accessible focus colors.

- [ ] **Step 4: Remove gradients, dark glows, and saturated navigation blocks**

Use warm solid surfaces in administration and first-login pages. Make the active sidebar argile-on-terracotta rather than white-on-saturated color. Preserve mobile navigation and permissions.

- [ ] **Step 5: Build, run the browser palette assertions, and commit**

```powershell
npm run build
$env:MPP_MOCK_AUTH='1'
python C:\Users\Fitanique\.codex\skills\webapp-testing\scripts\with_server.py --server "npm run preview -- --host 127.0.0.1" --port 4173 -- python scripts\verify_july_feedback_ui.py
git add src/index.css src/components/layout/Sidebar.tsx src/components/layout/AppLayout.tsx src/pages/AdminUsers.tsx src/pages/ChangePassword.tsx scripts/verify_july_feedback_ui.py
git commit -m "style: replace fluorescent palette with mineral light theme"
```

### Task 2: Make Outlook exports explicit and reusable

**Files:**
- Modify: `src/lib/ics.ts`
- Modify: `src/lib/alerts.ts`
- Modify: `src/pages/CalendarView.tsx`
- Test: `src/lib/__tests__/ics.test.ts`
- Test: `src/lib/__tests__/alerts.test.ts`

**Interfaces:**
- Consumes: `IcsEvent`, `OperationAlert`, `buildIcs`, `downloadIcs`.
- Produces: `alertToIcsEvent(alert: OperationAlert): IcsEvent`, explicit calendar actions, disabled empty export, and export-count feedback.

- [ ] **Step 1: Write a failing adapter test**

Assert that `alertToIcsEvent` returns a stable UID, operation-aware title, correct date and direct-operation description. The browser verifier added before the UI implementation asserts the exact accessible names `Exporter les échéances vers Outlook (.ics)`, `Rappels J-30 et J-15 inclus`, and `Ajouter à Outlook`.

- [ ] **Step 2: Run targeted tests and observe failure**

Run: `npm test -- --run src/lib/__tests__/ics.test.ts src/lib/__tests__/alerts.test.ts`

- [ ] **Step 3: Implement the adapter and calendar action block**

Keep `buildIcs` pure with two `VALARM` blocks. Replace `Outlook` with the explicit export label, helper copy, disabled empty state, count toast, and visible per-event `Ajouter à Outlook` text without breaking operation navigation.

- [ ] **Step 4: Harmonize exported document accents**

Replace `[15, 118, 110]` and `FF0F766E` with the terracotta theme equivalents. Do not alter rows or filter semantics.

- [ ] **Step 5: Run tests and commit**

```powershell
npm test -- --run src/lib/__tests__/ics.test.ts src/lib/__tests__/alerts.test.ts
git add src/lib/ics.ts src/lib/alerts.ts src/pages/CalendarView.tsx src/lib/__tests__/ics.test.ts src/lib/__tests__/alerts.test.ts
git commit -m "feat: expose explicit Outlook deadline exports"
```

### Task 3: Add Outlook actions to dashboard alerts

**Files:**
- Modify: `src/components/dashboard/UpcomingAlerts.tsx`
- Modify: `src/pages/Dashboard.tsx`
- Test: `src/components/dashboard/UpcomingAlerts.test.tsx`

**Interfaces:**
- Consumes: `alertToIcsEvent`, `buildIcs`, `downloadIcs`, `OperationAlert`.
- Produces: `onExportAlert(alert)` and `onExportAll(alerts)` callbacks, one per-alert text action, and one global export.

- [ ] **Step 1: Write the failing dashboard interaction test**

```ts
render(<UpcomingAlerts alerts={[alert]} onOpenOperation={onOpen} onExportAlert={onExportOne} onExportAll={onExportAll} />);
await user.click(screen.getByRole('button', { name: /ajouter .* à outlook/i }));
expect(onExportOne).toHaveBeenCalledWith(alert);
await user.click(screen.getByRole('button', { name: /exporter toutes vers outlook/i }));
expect(onExportAll).toHaveBeenCalledWith([alert]);
```

- [ ] **Step 2: Run it and observe failure**

Run: `npm test -- --run src/components/dashboard/UpcomingAlerts.test.tsx`

- [ ] **Step 3: Split navigation from export actions and wire downloads**

Keep operation navigation, add a secondary visible Outlook action per row and a global action in the heading. Stop event propagation, export exactly the passed alerts, use stable filenames, and confirm the count/J-30/J-15 in the toast.

- [ ] **Step 4: Run and commit**

```powershell
npm test -- --run src/components/dashboard/UpcomingAlerts.test.tsx
git add src/components/dashboard/UpcomingAlerts.tsx src/components/dashboard/UpcomingAlerts.test.tsx src/pages/Dashboard.tsx
git commit -m "feat: export dashboard deadlines to Outlook"
```

### Task 4: Prove downloads and colors in the browser

**Files:**
- Modify: `scripts/verify_july_feedback_ui.py`
- Modify: `docs/july-feedback-acceptance-matrix.md`

**Interfaces:**
- Consumes: mock Supabase fixtures, Playwright `expect_download`, built app.
- Produces: inspected global/individual ICS downloads and representative desktop/mobile screenshots.

- [ ] **Step 1: Strengthen deterministic deadline fixtures**

Ensure expected dates appear in calendar and dashboard alert windows while preserving program/budget/objective fixtures.

- [ ] **Step 2: Assert real downloads**

```py
with authenticated.expect_download() as download_info:
    authenticated.get_by_role("button", name="Exporter les échéances vers Outlook (.ics)").click()
content = Path(download_info.value.path()).read_text(encoding="utf-8")
assert "BEGIN:VCALENDAR" in content
assert "TRIGGER:-P30D" in content
assert "TRIGGER:-P15D" in content
```

Repeat for one `Ajouter à Outlook` action and prove only that UID is exported.

- [ ] **Step 3: Strengthen palette inspection**

Assert computed `color-scheme: light`, mineral body background, terracotta primary action, no theme controls, and no prohibited large surfaces. Capture desktop and 390px dashboard/calendar screens.

- [ ] **Step 4: Build and run Playwright**

```powershell
npm run build
$env:MPP_MOCK_AUTH='1'
python C:\Users\Fitanique\.codex\skills\webapp-testing\scripts\with_server.py --server "npm run preview -- --host 127.0.0.1" --port 4173 -- python scripts\verify_july_feedback_ui.py
```

- [ ] **Step 5: Update exact evidence and commit**

Replace `ics.test.ts`-only evidence with download inspection. Mark weak evidence as unvalidated rather than overstating it.

```powershell
git add scripts/verify_july_feedback_ui.py docs/july-feedback-acceptance-matrix.md
git commit -m "test: verify Outlook downloads and mineral UI"
```

### Task 5: Complete the requirement audit and publish

**Files:**
- Modify only July-feedback files tied to an evidenced gap.
- Modify: `docs/july-feedback-acceptance-matrix.md`

**Interfaces:**
- Consumes: transcript, accepted spec, deployed Supabase state, test suite.
- Produces: requirement-level evidence and a fast-forward push to `origin/main`.

- [ ] **Step 1: Audit every matrix row**

Require browser behavior, real Supabase behavior, pure calculation tests, or inspected artifacts. Cover communes, program, planning, alerts, filters, Outlook, users/roles, observations/DG, budget, objectives, statistics, synthesis/photos, document review, exports, history, migration, and responsive UI.

- [ ] **Step 2: Load Impeccable craft floor before the final UI batch**

Read `C:\Users\Fitanique\.codex\skills\impeccable\reference\craft-floor.md`, apply one bounded desktop/mobile defect batch, then only one confirmation round.

- [ ] **Step 3: Run the detector once**

Run: `node C:\Users\Fitanique\.codex\skills\impeccable\scripts\detect.mjs --json src`

Fix in-scope violations in one batch and record justified residual findings.

- [ ] **Step 4: Run complete verification**

```powershell
npm test -- --run
npm run lint
npm run build
git diff --check
```

- [ ] **Step 5: Run mock and real browser verification**

Run the strengthened mock verifier, then rebuild with the Supabase anon key and use the real owner account without storing credentials. Confirm representative routes, downloads, and no console errors.

- [ ] **Step 6: Review and commit audit fixes**

```powershell
git status --short
git diff --stat origin/main...HEAD
git diff --check
git add docs/july-feedback-acceptance-matrix.md
git commit -m "fix: complete July feedback usability audit"
```

- [ ] **Step 7: Fast-forward publish**

```powershell
git fetch origin main
git merge-base --is-ancestor origin/main HEAD
git push origin HEAD:main
git ls-remote origin refs/heads/main
```

Expected: local `HEAD` equals remote `main`; never force-push.
