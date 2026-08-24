# Lier une observation à un CTX (profil) — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Permettre d'associer une observation au CTX (profil utilisateur) concerné — même si le CTX diffère de celui de l'opération liée — avec pré-remplissage depuis l'opération et filtre CTX basé sur le lien profil.

**Architecture:** Ajout additif d'une colonne `ctx_user_id` (uuid null, FK `profiles(id)` `on delete set null`) sur `observations`. Même pattern que `operations.ctx_user_id`. Le formulaire gagne un sélecteur de profil « CTX concerné », pré-réempli depuis l'opération ; vue, filtre CTX et exports utilisent le profil lié en priorité (repli sur le texte hérité de l'opération). Aucune nouvelle RLS : le filtre CTX reste un filtre d'affichage.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS, Supabase (Postgres + RPC `list_active_profiles`), Vitest, `ReferenceSelect` (sélecteur de personne), `MultiSelectFilter`.

**Référence design:** `docs/plans/2026-08-24-observation-ctx-link-design.md`

---

### Task 1: Migration SQL additive `ctx_user_id`

**Files:**
- Create: `supabase/migrations/202608240001_observation_ctx_link.sql`

**Step 1: Create the migration**

```sql
-- Lier une observation au CTX (profil) concerné, indépendamment de l'opération.
-- Additif et idempotent : les observations existantes gardent ctx_user_id = null.
alter table public.observations
  add column if not exists ctx_user_id uuid references public.profiles(id) on delete set null;

create index if not exists observations_ctx_user_idx on public.observations(ctx_user_id);
```

**Step 2: Verify it matches conventions**

Run: `grep -c "add column if not exists" supabase/migrations/202608240001_observation_ctx_link.sql`
Expected: `1` (pattern additif, comme les migrations existantes)

**Step 3: Commit**

```bash
git add supabase/migrations/202608240001_observation_ctx_link.sql
git commit -m "feat(db): add observations.ctx_user_id linking to a profile"
```

---

### Task 2: Types — `Observation` et `ObservationRow` gagnent `ctx_user_id`

**Files:**
- Modify: `src/types/domain.ts` (interface `Observation`, ~ligne 165)
- Modify: `src/lib/observationStatus.ts` (interface `ObservationRow`, ligne 4)

**Step 1: Add the field to `Observation`**

Dans `src/types/domain.ts`, interface `Observation` (après `assignee_user_id: string | null;`) :

```ts
ctx_user_id: string | null;
```

**Step 2: Add the field to `ObservationRow`**

Dans `src/lib/observationStatus.ts`, interface `ObservationRow` (après `assignee_user_id?: string | null;`) :

```ts
ctx_user_id?: string | null;
```

**Step 3: Typecheck**

Run: `npx tsc -b`
Expected: exits 0 (aucune erreur)

**Step 4: Commit**

```bash
git add src/types/domain.ts src/lib/observationStatus.ts
git commit -m "feat: type observations.ctx_user_id"
```

---

### Task 3: Payload — `buildObservationPayload` publie `ctx_user_id`

**Files:**
- Modify: `src/lib/observationStatus.ts` — `ObservationFormData` (ligne 22), `buildObservationPayload` (ligne 64), `EMPTY_OBSERVATION_FORM` (ligne 91)
- Test: `src/lib/__tests__/observationStatus.test.ts`

**Step 1: Write the failing test**

Ajouter dans `src/lib/__tests__/observationStatus.test.ts`, dans le `describe('buildObservationPayload')` :

```ts
it('sérialise ctx_user_id dans le payload (null si vide)', () => {
  const payload = buildObservationPayload({
    operation_id: 'op-1', info_date: '2026-01-01', description: 'Point', responsible_person: 'CTX', deadline_date: '2026-02-01',
    assignee_user_id: 'user-2', completion_date: '', resolution_date: '', status: 'En cours', is_dg: false, ctx_user_id: 'ctx-9',
  }, { userId: 'user-1', initials: 'AB' });
  expect(payload.ctx_user_id).toBe('ctx-9');

  const emptyPayload = buildObservationPayload({
    operation_id: 'op-1', info_date: '2026-01-01', description: 'Point', responsible_person: 'CTX', deadline_date: '2026-02-01',
    assignee_user_id: '', completion_date: '', resolution_date: '', status: 'En cours', is_dg: false, ctx_user_id: '',
  }, { userId: 'user-1', initials: 'AB' });
  expect(emptyPayload.ctx_user_id).toBeNull();
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/observationStatus.test.ts`
Expected: FAIL — `ctx_user_id` absent de `ObservationFormData` (erreur de type TS) ou `undefined` du payload (le type compile avec `ctx_user_id` requis → erreur).

> Note : le type `ObservationFormData` n'a pas encore `ctx_user_id`, donc le test ne compile pas. C'est le comportement attendu du TDD.

**Step 3: Implement**

Dans `src/lib/observationStatus.ts` :
- `ObservationFormData` : ajouter `ctx_user_id: string;`
- `EMPTY_OBSERVATION_FORM` : retour `...` initiale avec `ctx_user_id: '',`
- `buildObservationPayload` : ajouter `ctx_user_id: form.ctx_user_id || null,`

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/observationStatus.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/observationStatus.ts src/lib/__tests__/observationStatus.test.ts
git commit -m "feat: serialize observations.ctx_user_id in payload"
```

---

### Task 4: Pré-remplissage CTX depuis l'opération (helper pur)

**Files:**
- Create: `src/lib/observationCtx.ts` (helper pur, testable sans Supabase)

**Step 1: Write the failing test**

Create `src/lib/__tests__/observationCtx.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { resolveCtxForOperation } from '../observationCtx';

describe('resolveCtxForOperation', () => {
  const profiles = [
    { id: 'p-1', label: 'Émilie Bernard', initials: 'EB' },
    { id: 'p-2', label: 'Karim Dupont', initials: 'KD' },
  ];

  it('privilégie ctx_user_id de l’opération quand présent', () => {
    const op = { ctx_user_id: 'p-2', project_manager: 'EB' };
    expect(resolveCtxForOperation(op, profiles)).toBe('p-2');
  });

  it('retombe sur le nom texte project_manager en repli', () => {
    const op = { ctx_user_id: null, project_manager: 'EB' };
    expect(resolveCtxForOperation(op, profiles)).toBe('p-1');
  });

  it('renvoie vide si aucune correspondance', () => {
    const op = { ctx_user_id: null, project_manager: 'Inconnu XYZ' };
    expect(resolveCtxForOperation(op, profiles)).toBe('');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/observationCtx.test.ts`
Expected: FAIL — module introuvable

**Step 3: Implement**

Create `src/lib/observationCtx.ts` :

```ts
export interface OperationCtxSource {
  ctx_user_id?: string | null;
  project_manager?: string | null;
}

export interface ProfileCtxOption {
  id: string;
  label: string;
  initials?: string | null;
}

function normalized(value: string | null | undefined): string {
  return (value ?? '').trim().toLocaleLowerCase('fr').replace(/\s+/g, ' ');
}

/** Choisit le profil CTX pour une observation selon l'opération liée.
 *  1. operation.ctx_user_id si renseigné (fait autorité).
 *  2. Sinon, recherche du profil actif dont le nom affiché OU les initiales
 *     correspondent au texte historique project_manager (repli hérité). */
export function resolveCtxForOperation(
  operation: OperationCtxSource,
  profiles: readonly ProfileCtxOption[],
): string {
  if (operation.ctx_user_id) return operation.ctx_user_id;
  const target = normalized(operation.project_manager);
  if (!target) return '';
  const match = profiles.find((profile) =>
    normalized(profile.label) === target || normalized(profile.initials) === target);
  return match?.id ?? '';
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/observationCtx.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/observationCtx.ts src/lib/__tests__/observationCtx.test.ts
git commit -m "feat: resolve default CTX for an observation from its operation"
```

---

### Task 5: Formulaire — champ « CTX concerné » + pré-remplissage

**Files:**
- Modify: `src/components/observations/ObservationForm.tsx`
- Modify: `src/pages/Observations.tsx` (charger profils via RPC, pré-remplissage au changement d'opération, passer au formulaire)

**Step 1: charger les profils actifs**

Dans `src/pages/Observations.tsx`, étendre la requête `profiles` existante (déjà présenté, `supabase.from("profiles")...`) ou utiliser `supabase.rpc('list_active_profiles')` comme `OperationForm.tsx`. La requête `profiles` actuelle suffit (elle charge `id,email,display_name,initials,status` + `.eq("status","active")`) → on construit `ctxOptions: {id,label,initials}[]`.

Ajouter un `useMemo` :

```ts
const ctxOptions = useMemo(() => assigneeProfiles.map((item) => ({
  id: item.id,
  label: item.display_name?.trim() || item.initials?.trim() || item.email?.split('@')[0] || 'Utilisateur',
  initials: item.initials,
})), [assigneeProfiles]);
```

**Step 2: pré-remplissage au changement d'opération**

Dans `ObservationForm` / handler `update('operation_id', ...)`, quand l'utilisateur choisit une opération et que le formulaire est en création (`!editing`), appliquer `resolveCtxForOperation`. Le plus propre : le faire côté `Observations.tsx` via `setForm` dans `ObservationForm.onChange`, ou exposer un callback.

Implémentation dans `ObservationForm.tsx` (recevoir une prop `onOperationSelect?: (operationId: string) => void` et un champ `ctxOptions`) ; appeler au changement d'opération :

```tsx
// dans le select Opération
onChange={(event) => {
  update('operation_id', event.target.value);
  props.onOperationSelect?.(event.target.value);
}}
```

Dans `Observations.tsx` :

```ts
const handleOperationSelect = (operationId: string) => {
  if (!form || editing) return;
  const operation = operations.find((item) => item.id === operationId);
  if (!operation) return;
  const ctxId = resolveCtxForOperation(operation, ctxOptions);
  if (ctxId) setForm({ ...form, ctx_user_id: ctxId });
};
```

**Step 3: champ select CTX (optionnel, modifiable)**

Dans `ObservationForm.tsx`, sous la rangée Date/Responsable (ou après « Personne responsable »), ajouter :

```tsx
<div><FieldLabel>CTX concerné</FieldLabel>
  <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-600"
    disabled={!editableFields.has('operation_id')}
    value={value.ctx_user_id}
    onChange={(event) => update('ctx_user_id', event.target.value)}>
    <option value="">Non précisé</option>
    {ctxOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
  </select>
</div>
```

> En cas de pré-remplissage après une sélection manuelle, on n'écrase pas une valeur déjà posée : `handleOperationSelect` ne pré-remplit que si `form.ctx_user_id` est encore vide.

**Step 4: typecheck & tests**

Run: `npx tsc -b` → exits 0. Run: `npx vitest run src/lib/__tests__/observationCtx.test.ts` → PASS.

**Step 5: Commit**

```bash
git add src/components/observations/ObservationForm.tsx src/pages/Observations.tsx
git commit -m "feat: add CTX profile field with prefilling from operation"
```

---

### Task 6: Affichage — badge CTX sur chaque point (vue structurée + tableau)

**Files:**
- Modify: `src/pages/Observations.tsx`
- Test: `src/lib/__tests__/observationCtx.test.ts` (repli d'affichage)

**Step 1: helper d'affichage (épuré)**

Dans `src/lib/observationCtx.ts`, ajouter :

```ts
export function ctxDisplayId(observation: { ctx_user_id?: string | null }, operation: { ctx_user_id?: string | null } | null | undefined, fallbackName: string | null | undefined): string {
  // renvoie l'id profil à afficher/filtrer : l'observation prime, sinon l'opération, sinon vide
  return observation.ctx_user_id || operation?.ctx_user_id || '';
}
```

**Step 2: afficher le profil lié (ou repli texte)**

Dans `Observations.tsx`, construire une map `profileById` et, dans la vue structurée, à côté du badge statut, ajouter le CTX résolu :

```tsx
const ctxId = observation.ctx_user_id || operation?.ctx_user_id || null;
const ctxLabel = ctxId ? profileById.get(ctxId) ?? null : observation.operations?.project_manager ?? null;
{ctxLabel && <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">CTX · {ctxLabel}</span>}
```

> `profileById = new Map(ctxOptions.map((option) => [option.id, option.label]))`.

**Step 3: colonne tableau**

Dans la vue tableau, la cellule « CTX » utilise :

```tsx
const ctxId = observation.ctx_user_id || observation.operations?.ctx_user_id || null;
{ctxId ? (profileById.get(ctxId) ?? '—') : (observation.operations?.project_manager ?? '—')}
```

**Step 4: typecheck & lint**

Run: `npx tsc -b` → 0 ; Run: `npm run lint` → 0

**Step 5: Commit**

```bash
git add src/components/dashboard/../  # (adapter au chemin réel)
```
→ réellement :
```bash
git add src/lib/observationCtx.ts src/pages/Observations.tsx
git commit -m "feat: display linked CTX profile on observations"
```

---

### Task 7: Filtre CTX basé sur le lien profil

**Files:**
- Modify: `src/pages/Observations.tsx` (filtre `filters.ctxs`, options filtre)

**Step 1: options du filtre = profils CTX**

Le filtre `ctxs` doit être peuplé par les profils CTX distincts issus des observations + des opérations. On construit :

```ts
const ctxFilterOptions = useMemo(() => {
  const ids = new Set<string>();
  observations.forEach((observation) => {
    if (observation.ctx_user_id) ids.add(observation.ctx_user_id);
    if (observation.operations?.ctx_user_id) ids.add(observation.operations.ctx_user_id);
  });
  return [...ids].map((id) => profileById.get(id)).filter(Boolean) as string[];
}, [observations, profileById]);
```

**Step 2: adapter la comparison du filtre**

Le filtre actuel compare `operation?.project_manager` à `filters.ctxs`. Pour garder la sélection compatible (on stocke des **labels** de profil) :

```ts
if (filters.ctxs.length) {
  const ctxId = observation.ctx_user_id || observation.operations?.ctx_user_id || null;
  const ctxLabel = ctxId ? (profileById.get(ctxId) ?? null) : null;
  const effectiveCtx = ctxLabel ?? observation.operations?.project_manager ?? null;
  if (!effectiveCtx || !filters.ctxs.includes(effectiveCtx)) return false;
}
```

> Le design vise un filtre « basé sur le lien profil » : on compare le **label du profil lié** (via `profileById`), en repli sur le texte hérité.

**Step 3: test**

Ajouter dans `src/lib/__tests__/observationCtx.test.ts` un test du helper de résolution filtre (via `ctxDisplayId`) :

```ts
it('préfère le lien observation sur le lien opération pour le filtre', () => {
  expect(ctxDisplayId({ ctx_user_id: 'obs-ctx' }, { ctx_user_id: 'op-ctx' }, 'X')).toBe('obs-ctx');
  expect(ctxDisplayId({ ctx_user_id: null }, { ctx_user_id: 'op-ctx' }, 'X')).toBe('op-ctx');
});
```

**Step 4: typecheck & test**

Run: `npx tsc -b` → 0 ; Run: `npx vitest run src/lib/__tests__/observationCtx.test.ts` → PASS

**Step 5: Commit**

```bash
git add src/pages/Observations.tsx src/lib/observationCtx.ts src/lib/__tests__/observationCtx.test.ts
git commit -m "feat: filter observations by linked CTX profile"
```

---

### Task 8: Exports — colonne CTX = profil lié

**Files:**
- Modify: `src/pages/Observations.tsx` (registry export + exports Excel/PDF)

**Step 1: registry export**

Dans `OBSERVATION_EXPORT_REGISTRY`, la colonne `ctx` :

```ts
{ key: 'ctx', label: 'CTX', group: 'Équipe', formatter: (row) => {
  const id = row.ctx_user_id || row.operations?.ctx_user_id || null;
  return id ? (profileById.get(id) ?? row.operations?.project_manager ?? '') : (row.operations?.project_manager ?? '');
} }
```

> Note : `profileById` devra être déplacé avant le registry, ou le formatter devient une fonction recevant le registre. Pour éviter une dépendance circulaire, **déplacer la construction de `profileById` au-dessus de `OBSERVATION_EXPORT_REGISTRY`** (la map est construite depuis `observations` ; les exports y ont accès dans la portée du composant).

**Step 2: export Excel/PDF legacy**

Dans `exportExcel` et `exportPdf`, remplacer la cellule CTX par le même calcul `id ? profileById.get(id) : project_manager`.

**Step 3: typecheck & lint**

Run: `npx tsc -b` → 0 ; Run: `npm run lint` → 0

**Step 4: Commit**

```bash
git add src/pages/Observations.tsx
git commit -m "feat: export observations with linked CTX profile"
```

---

### Task 9: Tests globaux + vérification complète

**Files:**
- (aucun nouveau)

**Step 1: full test suite**

Run: `npm run test -- --run`
Expected: all tests pass.

**Step 2: full build**

Run: `npm run build`
Expected: success (warnings de taille OK).

**Step 3: lint**

Run: `npm run lint`
Expected: 0 error.

**Step 4: final commit (si reliquat non committé)**

```bash
git add -A && git commit -m "feat: complete observation to CTX link" || echo "rien à committer"
```

---

## Notes de déploiement

- Appliquer la migration `supabase/migrations/202608240001_observation_ctx_link.sql` en Supabase (prod) **avant** de déployer le frontend.
- Le frontend est servi statiquement (nginx → `dist/`) : après merge dans `main`, rebuilder sur le serveur.
- Aucune nouvelle RLS : la visibilité des observations reste inchangée ; le filtre CTX est d'affichage.

## Hors périmètre

- Permission-champ dédiée pour `ctx_user_id` (non nécessaire : cohérence avec le formulaire, édition via `observations.edit_assigned/edit_all`).
- Scoping RLS par CTX sur les observations.
