# Écarts retours utilisateurs d'août 2026 — Plan d'implémentation (complément au plan du 29/07)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Compléter le plan du 29/07 (`docs/superpowers/plans/2026-07-30-reunion-2907-platform-rework.md`, tâches 1‑15) avec les demandes non couvertes et les décisions actées le 17/08/2026, sans perdre de données Supabase.

**Architecture:** Amendement additif : on ne réécrit pas le plan 29/07 ; on ajoute des amendements ciblés (chemins, tâches, interfaces) et deux nouvelles tâches. Le schéma vit dans la même migration additive `202607300001_july_feedback_rework.sql` (tâche 1 du plan base). Toute règle sensible est doublée dans React et PostgreSQL (RLS/triggers). L'import Excel est un outil admin réservé, avec aperçu avant application.

**Tech Stack:** identique au plan base (React 19, TS, Vite, Tailwind 4, Supabase, Vitest, ExcelJS, jsPDF, date-fns) + `xlsx` (déjà dans package.json) pour l'import admin.

---

## 0. Journal de décision (17/08/2026)

| Demande | Décision actée |
|---|---|
| 2 — Case « SO » | Case à cocher sur les jalons **CSI/CA** et **agrément LLI**, la date associée reste saisissable |
| 3 — PC + 4 mois | `permit_order_date` **dérivée** = `permit_submission_date` + 4 mois ; modifiable uniquement par rôle autorisé |
| 4 — PC périmé | Alerte à **3 ans depuis l'arrêté** (validité du PC selon le code de l'urbanisme) |
| 7 — Surface totale / import | Surfaces totales **calculées** (déjà au plan base) + **import Excel admin ponctuel** avec aperçu |
| 10 — Outlook | **Export .ics** (rappels J‑30 / J‑15), aucune connexion OAuth Microsoft (déjà au plan base §8) |
| 11 — Visibilité COP/CTX | **Sélecteur de compte utilisateur** (`cop_user_id` / `ctx_user_id`) ; coupure à l'OS : COP ≤ OS, CTX ≥ OS |
| 12 — Catégorie (AG) | Liste fermée **administrable** (déjà couvert : plan base tâches 2/5) |
| 14 — Villes | Référentiel communes + département/zonage auto (déjà couvert : plan base tâches 1/6) |
| 15 — Rattachement auto | **Année d'OS proposée** depuis le planning + validation ok / re‑sélection ko |
| 16 — Zonage | Auto depuis la commune (`housing_zone`, déjà couvert : plan base tâches 1/6) |

**Hypothèses à confirmer avant/ pendant implémentation** (notées ☑️ dans le texte) :
- P3 — « + 4 mois » proposée et surchargée par rôle autorisé (cohérent avec les permissions fines de champs du plan base).
- P5 — « Signature de l'acte prévisionnelle » = le jalon `vefa_deed_or_land_purchase_date` (acte VEFA / acquisition terrain) ; alerte si échéance dépassée sans réalisation.
- P6 — « Case Terrain » = booléen d'opération « avec terrain » ; il active la visibilité du jalon d'acquisition foncière.
- P7 — « ligne fixe dépôt PC » = événement permanent du calendrier alimenté par `permit_submission_date` (intégré à la vue programme du plan base).
- P9 — « planning montage » = la vue calendrier **programme** du plan base (jalons antérieurs à BA‑CG). Exporté comme les autres vues.
- P17 — Écran d'accueil = ajout de cartes KPI synthétiques + compteur de filtres actifs.

---

## A. Amendements au plan base

### A1 — Schéma complémentaire (dans la tâche 1 du plan base)

**Files :** `supabase/migrations/202607300001_july_feedback_rework.sql`, `src/types/domain.ts`

**Step 1 :** ajouter au contrat de migration (`src/lib/__tests__/julyFeedbackMigration.test.ts`) l'assertion que le SQL contient les colonnes ci-dessous.

**Step 2 :** observer l'échec du test.

**Step 3 :** ajouter, dans la migration de la tâche 1, dans le bloc `alter table public.operations` :

```sql
alter table public.operations
  add column if not exists so_csi_ca boolean not null default false,
  add column if not exists so_lli_approval boolean not null default false,
  add column if not exists terrain boolean not null default false,
  add column if not exists cop_user_id uuid references auth.users(id),
  add column if not exists ctx_user_id uuid references auth.users(id);
create index if not exists operations_cop_user_idx on public.operations(cop_user_id);
create index if not exists operations_ctx_user_idx on public.operations(ctx_user_id);
```

Les colonnes texte historiques `project_manager` (CTX) et `operations_manager` (COP) sont **conservées** : elles gardent le nom affiché et servent de source de migration à la tâche 15.

**Step 4 :** dans `src/types/domain.ts`, ajouter aux interfaces concernées :

```ts
// Operation / OperationFormData
so_csi_ca: boolean;
so_lli_approval: boolean;
terrain: boolean;
cop_user_id: string | null;
ctx_user_id: string | null;
```

**Step 5 :** tests ciblés + suite complète, build, lint.

**Step 6 :** commit.

---

### A2 — Case « SO » + case « Terrain » (amende tâches 5 et 7)

**Files :**
- Modify: `src/components/operations/PlanningSection.tsx`
- Modify: `src/components/operations/program/ProgramSectionCard.tsx` (ou `ProgramSection.tsx`)
- Modify: `src/pages/OperationDetail.tsx`
- Modify: `src/lib/operationPayload.ts`
- Modify: `src/lib/operationExport.ts`

**Step 1 — tests :** dans les tests de payload/export, vérifier que `so_csi_ca`, `so_lli_approval`, `terrain` sont sérialisés et repris dans l'export (colonne « SO »).

**Step 2 — SO :** à côté des lignes « CSI / CA » (`csi_ca_date`) et « Obtention agrément LLI » (`lli_approval_date`) du PlanningSection, ajouter une case `SO` (sauf opposition) liée au booléen ; le libellé affiche « SO » si coché. Reprendre ces marqueurs dans OperationDetail et dans l'export des colonnes.

**Step 3 — Terrain :** dans la section programme (identité), ajouter la case « Terrain » (booléen). Lorsqu'elle est cochée, le jalon « Acte VEFA / acquisition terrain (AW) » devient visible/mis en avant dans le planning. Aucun impact sur les calculs de livraison.

**Step 4 :** tests, build, lint, puis un commit avec la tâche 7 du plan base (ou commit dédié si ordre différent).

---

### A3 — PC : obtention auto « dépôt + 4 mois » (amende tâche 7)

**Files :**
- Modify: `src/lib/planningMilestones.ts` (créée par la tâche 7) ou `src/lib/operationCalculations.ts`
- Modify: `src/lib/__tests__/planningMilestones.test.ts`
- Modify: `src/components/operations/PlanningSection.tsx`

**Step 1 — test d'abord :**

```ts
import { proposedPermitOrderDate } from '../planningMilestones';
expect(proposedPermitOrderDate('2026-01-31')).toBe('2026-05-31');
expect(proposedPermitOrderDate('2026-08-31')).toBe('2026-12-31');
expect(proposedPermitOrderDate('2025-11-30')).toBe('2026-03-30'); // fin de mois
expect(proposedPermitOrderDate(null)).toBeNull();
```

**Step 2 :** observer l'échec.

**Step 3 :** implémenter avec `date-fns` (`addMonths(parseISO(d), 4)` au format `yyyy-MM-dd`, en préservant la fin de mois).

**Step 4 :** dans le PlanningSection, le champ « Arrêté PC » affiche la valeur proposée comme **suggestion** tant que seule la date de dépôt est renseignée ; le champ reste editable uniquement pour un rôle disposant de la permission de champ correspondante (tâche 3 du plan base). Toujours laisser la possibilité de saisir manuellement un arrêté différant du + 4 mois (permis dure plus souvent).

---

### A4 — Alertes : PC périmé + butoirs CS dépassés (amende tâche 8)

**Files :**
- Modify: `src/lib/alerts.ts` (créée par la tâche 8)
- Modify: `src/lib/__tests__/alerts.test.ts`
- Modify: `src/components/dashboard/UpcomingAlerts.tsx`
- Modify: `src/pages/OperationDetail.tsx`
- Modify: `src/lib/calendarEvents.ts` (règle « ligne fixe dépôt PC »)

**Step 1 — tests :** ajouter deux règles au builder d'alertes :

```ts
// kind: 'permit_expired'
expect(buildAlerts([{ permit_order_date: '2023-08-01', works_order_actual_date: null, ... }], new Date('2026-08-17'))).toContainEqual(expect.objectContaining({ kind: 'permit_expired' }));
// kind: 'condition_overdue' — from suspensive_conditions
expect(buildAlerts([], today, [ { deadline_date: '2026-07-01', completion_date: null } ])).toContainEqual(expect.objectContaining({ kind: 'condition_overdue' }));
```

**Step 2 :** implémentation :
- `permit_expired` : `permit_order_date` renseignée **et** `permit_order_date + 3 ans < today` **et** pas de `works_order_actual_date` (travaux pas engagés). Sévérité « overdue », lien vers l'opération.
- `condition_overdue` : `deadline_date < today` **et** `completion_date` vide.
- La source CS (conditions suspensives) est ajoutée aux entrées d'alerte déjà alimentées par le registre de jalons.

**Step 3 :** afficher ces alertes dans `UpcomingAlerts` (groupes 30 j / 15 j / dépassées) et un badge « PC périmé » sur la fiche opération.

**Step 4 — ligne fixe dépôt PC :** dans `calendarEvents.ts` (tâche 8, vue « programme »), garantir un événement permanent « Dépôt PC » par opération alimenté par `permit_submission_date`, et « Arrêté PC » alimenté par `permit_order_date`.

---

### A5 — Rattachement automatique de l'année (amende tâche 10)

**Files :**
- Modify: `src/lib/objectiveRecords.ts` (créée par la tâche 10)
- Modify: `src/lib/__tests__/objectiveRecords.test.ts`
- Modify: `src/components/operations/ObjectivesSection.tsx`
- Modify: `src/pages/Objectives.tsx`

**Step 1 — test d'abord :**

```ts
export function proposeObjectiveYear(op): number | null {
  const w = op.works_order_actual_date ?? op.works_order_expected_date;
  return w ? Number(w.slice(0, 4)) : null;
}
expect(proposeObjectiveYear({ works_order_actual_date: '2026-11-20', works_order_expected_date: null })).toBe(2026);
expect(proposeObjectiveYear({ works_order_actual_date: null, works_order_expected_date: null })).toBeNull();
```

**Step 2 :** implémentation.

**Step 3 :** dans le panneau ratttachement d'objectif OS, si une date d'OS (réelle sinon prévisionnelle) existe et qu'aucune année n'est encore choisie, afficher « Année proposée : 2026 » avec deux actions : **Rattacher à 2026 (ok)** et **Choisir une autre année (ko)**. La re‑sélection ouvre le sélecteur d'année et persiste le choix dans `operation_objectives.year`. La valeur proposée n'est jamais persistée sans confirmation explicite.

**Step 4 :** tests, build, lint, commit avec la tâche 10.

---

### A6 — Visibilité du calendrier par réalisateur (COP/CTX) — amende tâches 1, 3, 8, 15

Chantier le plus structurant : il relie le calendrier au compte connecté.

**Files :**
- Modify: `supabase/migrations/202607300001_july_feedback_rework.sql` (colonnés A1)
- Modify: `src/lib/permissions.ts` / catalogue de permissions (tâche 3) — ajouter `calendar.view_all`
- Modify: `supabase/migrations/202607210001_custom_access_control.sql` (ou tâche 3) — RLS `calendar_own_read` sur `operations`
- Modify: `src/lib/calendarEvents.ts` — événements porteurs de `operationalStage` (jalon ≤ OS / ≥ OS)
- Modify: `src/pages/CalendarView.tsx` — scopage par utilisateur connecté
- Modify: `src/lib/__tests__/calendarEvents.test.ts`
- Modify: `src/lib/operationPayload.ts` — persistance `cop_user_id` / `ctx_user_id`
- Modify: `src/components/operations/GeneralSection.tsx` — sélecteurs COP / CTX par compte
- Modify: `docs/superpowers/plans/2026-07-30-reunion-2907-platform-rework.md` (tâche 15) — migration des noms vers comptes

**Step 1 — tests :** `filterCurrentUserEvents(events, { userId, cop, ctx, viewAll, osDate })` :

```ts
// sans calendar.view_all : ne garde que les événements des opérations où userId == cop_user_id ou == ctx_user_id
// COP : garde les jalons avec date ≤ osDate ; CTX : garde les jalons avec date ≥ osDate
expect(filterCurrentUserEvents(evts, { userId: 'u1', cop: 'u1', ctx: null, osDate: '2026-06-01', viewAll: false }))
  .toEqual([evts[0], evts[1]]); // jalons avant/à l'OS
```

**Step 2 :** implémentation côté client.

**Step 3 — modèle :** `GeneralSection` remplace les `<datalist>` COP/CTX par des `<ReferenceSelect user>` limités aux comptes actifs ; `cop_user_id`/`ctx_user_id` persistés ; garder le nom historique en lecture pour compatibilité.

**Step 4 — RLS :** nouvelle permission `calendar.view_all` (responsable/administrateur). Pour les autres, la lecture calendrier est restreinte : `operations read for calendar` → `(cop_user_id = auth.uid() or ctx_user_id = auth.uid())`. Le rendu ne montre que les opérations concernées.

**Step 5 — coupure à l'OS :** la date de coupure = `works_order_actual_date || works_order_expected_date` par opération ; un événement `date <= osDate` est « pré-OS » (COP), `date >= osDate` est « post-OS » (CTX), l'OS lui-même est partagé. Appliquer ce filtre en fonction du rôle effectif (COP/CTX) de l'utilisateur sur l'opération. La vue « agenda libre » reste visible à qui possède `calendar.view`.

**Step 6 — migration (tâche 15) :** rattacher `cop_user_id`/`ctx_user_id` depuis `operations_manager`/`project_manager` par correspondance exacte display_name ↔ nom renseigné, uniquement si un seul compte candidat ; sinon `NULL` + liste à compléter par l'admin. Journaliser les correspondances.

---

### A7 — Écran d'accueil plus lisible (amende tâche 8, dashboard)

**Files :**
- Modify: `src/pages/Dashboard.tsx`
- Create: `src/components/dashboard/KpiCards.tsx`
- Create: `src/lib/__tests__/dashboardKpis.test.ts`

**Step 1 — tests :** `buildKpis(operations, alerts)` retourne nombre d'opérations, total logements, budget atterrissage (somme `final_budget`), nombre d'alertes actives.

**Step 2 :** cartes KPI en tête d'accueil + compteur de filtres actifs (nombre de filtres sélectionnés distincts de la valeur par défaut) + tri par défaut par nom affiché. Ne pas toucher à la logique métier existante.

---

## B. Nouvelles tâches

### Task 16: Import Excel administrateur ponctuel

**Files :**
- Create: `src/lib/importWorkbook.ts`
- Create: `src/lib/__tests__/importWorkbook.test.ts`
- Create: `src/pages/AdminImport.tsx`
- Modify: `src/App.tsx` (route protégée `operations.import`)
- Modify: `src/lib/permissions.ts` (permission `operations.import`)
- Modify: `src/components/layout/Sidebar.tsx` (menu « Importer » si permission)

**Interfaces :**
- `parseWorkbookRows(row: unknown[]): NormalizedImportRow[]` — normalise les colonnes du classeur (nom, commune, programme, surfaces…).
- `prepareImport(rows, existingNames): { toCreate: NormalizedImportRow[]; skipped: { name, reason }[] }` — une opération existante (même nom) n'est **jamais** écrasée : elle bascule dans `skipped`.

**Step 1 — tests d'abord :** la création est un no-op sans aperçu ; deux opérations homonymes → une seule créée, l'autre `skipped` ; des lignes malformées → rejetées avec raison lisible.

**Step 2 :** implémenter le parse/prepare (pense-bête : `xlsx` lit le fichier dans `AdminImport.tsx` ; `importWorkbook.ts` reste pur, sans lecture disque).

**Step 3 :** page admin : téléversement → aperçu (tableau `toCreate` / `skipped`) → bouton « Appliquer » qui crée les opérations via le chemin d'enregistrement existant (`operationPayload` + RPC transactionnel de la tâche 9, sinon insert simple). Journal via `audit_log`.

**Step 4 :** tests + build + lint ; commit :

```powershell
git commit -m "feat: add previewed admin-only workbook import"
```

---

## C. Contraintes modifiées du plan base

La contrainte « Do not import Excel operation rows » (plan base, ligne 14) est amendée comme suit, sans toucher au reste :

> Le classeur n'est jamais réinjecté automatiquement. **Exception** : l'outil d'import admin de la tâche 16 peut créer de **nouvelles** opérations après aperçu, sans jamais écraser une opération existante.

La tâche 15 (matrice d'acceptation) doit couvrir en plus : booleens SO/Terrain ; arrêté PC proposé + 4 mois ; alerte PC périmé ; alerte butoirs CS ; ligne fixe dépôt PC ; rattachement auto ok/ko ; scopage calendrier par réalisateur ; import admin. Le scénario navigateur 5 (dashboard alertes + ICS) s'étend à ces cas.
