# MonPetitPro DMO Evolution Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Étendre MonPetitPro pour couvrir le suivi DMO décrit dans les notes métier, avec formulaires structurés, permissions, calendriers, objectifs, statistiques et exports, sans import Excel ni rupture des données existantes.

**Architecture:** Une migration Supabase additive fournit les nouvelles colonnes, tables liées, rôles, audit et règles RLS. Le frontend React s'appuie sur des types et fonctions métier centralisés, puis expose les fonctionnalités sous forme de modules progressifs compatibles avec les anciennes lignes. Les calculs et transformations d'export restent purs et testés, tandis que les accès Supabase sont regroupés dans des services fins.

**Tech Stack:** React 19, TypeScript 5.9, Vite 8, Supabase/PostgreSQL, Tailwind CSS 4, date-fns, ExcelJS, jsPDF, Vitest, Testing Library.

---

### Task 1: Installer le socle de tests et typer le domaine

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/types/domain.ts`
- Create: `src/test/setup.ts`
- Create: `vitest.config.ts`
- Create: `src/lib/__tests__/stage.test.ts`
- Create: `src/lib/stage.ts`

**Step 1: Ajouter un test en échec pour la palette et les libellés de stade**

Tester les neuf valeurs `0`, `0bis`, `1`, `1bis`, `2`, `3`, `4`, `5`, `6` et leurs couleurs extraites du Word.

**Step 2: Exécuter le test et constater l'échec**

Run: `npm test -- --run src/lib/__tests__/stage.test.ts`
Expected: FAIL car `src/lib/stage.ts` n'existe pas.

**Step 3: Installer Vitest et Testing Library**

Run: `npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event`

Ajouter les scripts `test`, `test:watch` et la configuration jsdom.

**Step 4: Créer les types métier et la palette**

Définir `Operation`, `OperationStage`, `Profile`, `UserRole`, `Observation`, `OperationTypology`, `OperationSubsidy`, `SuspensiveCondition`, `DocumentReviewItem` et les types de planning dans `src/types/domain.ts`. Implémenter `STAGE_CONFIG` et `getStageConfig` dans `src/lib/stage.ts`.

**Step 5: Vérifier puis committer**

Run: `npm test -- --run src/lib/__tests__/stage.test.ts && npm run build`
Expected: PASS et build réussi.

```bash
git add package.json package-lock.json vitest.config.ts src/test src/types src/lib/stage.ts src/lib/__tests__/stage.test.ts
git commit -m "test: add typed domain and test foundation"
```

### Task 2: Créer la migration Supabase additive

**Files:**
- Create: `supabase/migrations/202607200001_dmo_extension.sql`
- Modify: `supabase_table.sql`
- Create: `docs/database-migration.md`

**Step 1: Écrire les assertions SQL de migration**

Préparer un bloc transactionnel de vérification contrôlant la présence des nouveaux champs, tables, index, bucket privé, fonctions d'audit et politiques RLS.

**Step 2: Écrire la migration rejouable**

Ajouter à `operations` les champs A à CG utiles regroupés par identité, intervenants, programme, labels, planning, objectifs et synthèse. Créer `profiles`, `operation_typologies`, `operation_subsidies`, `suspensive_conditions`, `operation_documents`, `document_review_items` et `audit_log`. Étendre `observations` avec `author_initials`, `resolution_date`, `resolution_validated_at`, `resolution_validated_by` et `is_dg`.

Utiliser `ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`, des contraintes différées compatibles avec les lignes existantes et des index sur les champs filtrés.

**Step 3: Ajouter les rôles et RLS**

Créer les fonctions `current_user_role()`, `can_edit_operations()` et `can_validate_observations()`. Autoriser la lecture authentifiée, la contribution selon le rôle, et réserver administration, suppression et validation aux rôles adéquats.

**Step 4: Ajouter audit et stockage privé**

Créer les déclencheurs d'audit sur les tables métier et un bucket `operation-documents` privé avec politiques liées aux rôles.

**Step 5: Synchroniser la documentation de schéma et committer**

Run: `rg -n "profiles|operation_typologies|suspensive_conditions|audit_log|author_initials" supabase/migrations/202607200001_dmo_extension.sql supabase_table.sql`
Expected: toutes les entités apparaissent dans les deux fichiers.

```bash
git add supabase supabase_table.sql docs/database-migration.md
git commit -m "feat: add additive DMO database migration"
```

### Task 3: Centraliser les calculs métier du planning

**Files:**
- Create: `src/lib/__tests__/operationCalculations.test.ts`
- Create: `src/lib/operationCalculations.ts`

**Step 1: Écrire les tests en échec**

Tester : AZ pour VEFA et MOD, priorité de AY sur AX, BA/BD/BF/BH, BP, BQ, BS, BT, BU, BZ, CB, CC, CD et CF ; tester aussi les entrées nulles et les fins de mois.

**Step 2: Vérifier l'échec**

Run: `npm test -- --run src/lib/__tests__/operationCalculations.test.ts`
Expected: FAIL car le module n'existe pas.

**Step 3: Implémenter les fonctions pures**

Créer `addMonthsSafe`, `calculateOperationSchedule`, `calculateBudgetPerHousing`, `calculateDeliveryGapDays`, `calculateAuthorizedDeadline` et `calculateDeadlineStatus`. Les dates calculées doivent produire des chaînes ISO locales sans décalage UTC.

**Step 4: Vérifier puis committer**

Run: `npm test -- --run src/lib/__tests__/operationCalculations.test.ts`
Expected: PASS.

```bash
git add src/lib/operationCalculations.ts src/lib/__tests__/operationCalculations.test.ts
git commit -m "feat: implement DMO planning calculations"
```

### Task 4: Fournir profil, permissions et administration

**Files:**
- Modify: `src/store/useStore.ts`
- Create: `src/hooks/useProfile.ts`
- Create: `src/lib/permissions.ts`
- Create: `src/lib/__tests__/permissions.test.ts`
- Create: `src/pages/AdminUsers.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/layout/Sidebar.tsx`

**Step 1: Tester la matrice de permissions en échec**

Vérifier les droits lecture, contribution, validation, suppression et administration pour les quatre rôles.

**Step 2: Implémenter le profil courant et les gardes**

Charger `profiles` après authentification, exposer `can(action)` et afficher un message de schéma non migré sur les erreurs `42P01`/`42703`.

**Step 3: Créer l'écran d'administration**

Lister les profils, modifier nom, initiales et rôle, et réserver la route `/admin/users` et son lien aux administrateurs.

**Step 4: Vérifier puis committer**

Run: `npm test -- --run src/lib/__tests__/permissions.test.ts && npm run build`
Expected: PASS.

```bash
git add src/store src/hooks src/lib/permissions.ts src/lib/__tests__/permissions.test.ts src/pages/AdminUsers.tsx src/App.tsx src/components/layout/Sidebar.tsx
git commit -m "feat: add profile roles and user administration"
```

### Task 5: Refaire la fiche opération en sections compatibles

**Files:**
- Create: `src/components/operations/OperationTabs.tsx`
- Create: `src/components/operations/GeneralSection.tsx`
- Create: `src/components/operations/ProgramSection.tsx`
- Create: `src/components/operations/PlanningSection.tsx`
- Create: `src/components/operations/BudgetSection.tsx`
- Create: `src/components/operations/ConditionsSection.tsx`
- Create: `src/components/operations/ObjectivesSection.tsx`
- Create: `src/components/operations/SynthesisSection.tsx`
- Create: `src/lib/operationPayload.ts`
- Create: `src/lib/__tests__/operationPayload.test.ts`
- Modify: `src/pages/OperationForm.tsx`

**Step 1: Tester la transformation du formulaire**

Vérifier les nombres, dates vides, valeurs VEFA forcées pour AX/AY, champs calculés et conservation des noms de colonnes existants.

**Step 2: Implémenter le payload typé**

Créer `toOperationPayload()` et `fromOperationRow()` afin que la page n'effectue plus de conversions ad hoc.

**Step 3: Extraire les sept sections**

Construire une navigation par onglets accessible. Marquer les champs calculés en lecture seule avec leur formule. Les listes métier reprennent les valeurs des feuilles `BD` et `Listes`, complétées par les valeurs déjà présentes en base.

**Step 4: Sauvegarder l'opération et ses collections**

Utiliser un upsert pour l'opération et synchroniser typologies, subventions et conditions suspensives après obtention de l'identifiant. Ne jamais supprimer silencieusement une collection lors d'un échec partiel ; afficher une erreur explicite.

**Step 5: Vérifier puis committer**

Run: `npm test -- --run src/lib/__tests__/operationPayload.test.ts && npm run build`
Expected: PASS.

```bash
git add src/components/operations src/lib/operationPayload.ts src/lib/__tests__/operationPayload.test.ts src/pages/OperationForm.tsx
git commit -m "feat: add structured DMO operation form"
```

### Task 6: Mettre à niveau le tableau des opérations et ses exports

**Files:**
- Create: `src/components/filters/MultiSelectFilter.tsx`
- Create: `src/components/operations/ColumnPicker.tsx`
- Create: `src/lib/operationFilters.ts`
- Create: `src/lib/__tests__/operationFilters.test.ts`
- Create: `src/lib/operationExport.ts`
- Modify: `src/pages/Dashboard.tsx`

**Step 1: Tester les filtres cumulés**

Vérifier stade + département + commune + COP + CTX + promoteur + type + label + intervalle de dates, y compris champs nuls et recherche textuelle.

**Step 2: Implémenter les filtres et la sélection de colonnes**

Les sélections sont multiples, effaçables et conservées pendant la session. La vue table permet tri sur chaque colonne ; les cartes restent disponibles sur petit écran.

**Step 3: Appliquer le bandeau par stade**

Afficher ligne 1 stade, ligne 2 nom complet sans troncature, ligne 3 informations synthétiques. Les actions respectent les permissions.

**Step 4: Ajouter les exports PDF et Excel de la vue**

Exporter uniquement les lignes filtrées et les colonnes cochées, avec titres français, formats de date et de devise.

**Step 5: Vérifier puis committer**

Run: `npm test -- --run src/lib/__tests__/operationFilters.test.ts && npm run build`
Expected: PASS.

```bash
git add src/components/filters src/components/operations/ColumnPicker.tsx src/lib/operationFilters.ts src/lib/operationExport.ts src/lib/__tests__/operationFilters.test.ts src/pages/Dashboard.tsx
git commit -m "feat: add multi-filtered operation dashboard and exports"
```

### Task 7: Étendre les observations et leurs droits

**Files:**
- Create: `src/lib/observationStatus.ts`
- Create: `src/lib/__tests__/observationStatus.test.ts`
- Create: `src/components/observations/ObservationForm.tsx`
- Create: `src/components/observations/ResolutionActions.tsx`
- Modify: `src/pages/Observations.tsx`
- Modify: `src/pages/OperationDetail.tsx`
- Modify: `src/pages/CalendarView.tsx`

**Step 1: Tester statut, auteur et validation**

Remplacer le statut encodé dans `description` par une transformation rétrocompatible : lire l'ancien marqueur si le champ dédié est absent, calculer le retard et produire le payload avec initiales et DG.

**Step 2: Créer un formulaire partagé**

Conserver date d'information, description, réalisateur, butoir et réalisation ; ajouter initiales automatiques, résolution proposée, validation responsable et marqueur DG.

**Step 3: Appliquer les permissions**

Masquer et bloquer suppression/validation hors responsable ou administrateur. Laisser tous les utilisateurs authentifiés voir les observations.

**Step 4: Étendre filtres et exports**

Ajouter DG, COP, CTX, promoteur, VEFA, MOD/CR, état de résolution et validation.

**Step 5: Vérifier puis committer**

Run: `npm test -- --run src/lib/__tests__/observationStatus.test.ts && npm run build`
Expected: PASS.

```bash
git add src/components/observations src/lib/observationStatus.ts src/lib/__tests__/observationStatus.test.ts src/pages/Observations.tsx src/pages/OperationDetail.tsx src/pages/CalendarView.tsx
git commit -m "feat: add governed observation resolution workflow"
```

### Task 8: Ajouter les calendriers métier

**Files:**
- Create: `src/lib/calendarEvents.ts`
- Create: `src/lib/__tests__/calendarEvents.test.ts`
- Create: `src/components/calendar/CalendarFilters.tsx`
- Create: `src/components/calendar/CalendarLegend.tsx`
- Modify: `src/pages/CalendarView.tsx`

**Step 1: Tester la génération d'événements**

Vérifier les conditions suspensives, la priorité livraison réelle > révisée > contractuelle, la priorité MEG réelle > prévisionnelle et tous les jalons BA à CG.

**Step 2: Implémenter les événements typés**

Produire une collection normalisée avec type, date, état réel/prévisionnel, opération et métadonnées de filtre.

**Step 3: Ajouter les vues et filtres multiples**

Proposer Conditions suspensives, Livraisons, Mises en gestion et Dates clés. Ajouter COP, opération, CTX, départements et promoteurs selon la vue.

**Step 4: Adapter les exports annuels**

Réutiliser la collection filtrée pour PDF et Excel, avec légende prévisionnel/réel et option d'année.

**Step 5: Vérifier puis committer**

Run: `npm test -- --run src/lib/__tests__/calendarEvents.test.ts && npm run build`
Expected: PASS.

```bash
git add src/lib/calendarEvents.ts src/lib/__tests__/calendarEvents.test.ts src/components/calendar src/pages/CalendarView.tsx
git commit -m "feat: add DMO calendar views and filters"
```

### Task 9: Construire les objectifs DMO

**Files:**
- Create: `src/lib/objectives.ts`
- Create: `src/lib/__tests__/objectives.test.ts`
- Create: `src/pages/Objectives.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/layout/Sidebar.tsx`

**Step 1: Tester les calculs objectif/réel**

Tester sélection par année, mois verts, exemple de 30 logements avec deux mois de retard = -60, un mois d'avance = +30, objectif immuable et fusion hors objectif sans doublon.

**Step 2: Implémenter le modèle mensuel**

Créer `buildObjectiveRows`, `calculateHousingGainLoss` et `mergeActualOutsideObjectives`.

**Step 3: Créer la page annuelle**

Afficher les colonnes demandées, janvier à décembre, totaux objectif/réel et bascule Objectif / Objectif + réel. Ajouter exports PDF/Excel.

**Step 4: Vérifier puis committer**

Run: `npm test -- --run src/lib/__tests__/objectives.test.ts && npm run build`
Expected: PASS.

```bash
git add src/lib/objectives.ts src/lib/__tests__/objectives.test.ts src/pages/Objectives.tsx src/App.tsx src/components/layout/Sidebar.tsx
git commit -m "feat: add annual DMO objectives tracking"
```

### Task 10: Ajouter statistiques promoteurs, CTX, livraisons, GPA et budget

**Files:**
- Create: `src/lib/statistics.ts`
- Create: `src/lib/__tests__/statistics.test.ts`
- Create: `src/components/statistics/PromoterStats.tsx`
- Create: `src/components/statistics/CtxStats.tsx`
- Create: `src/components/statistics/DeliveryStats.tsx`
- Create: `src/components/statistics/BudgetStats.tsx`
- Modify: `src/pages/Statistics.tsx`

**Step 1: Tester les agrégations**

Tester années uniques/multiples, opérations et logements livrés, réserves/logement, durée moyenne de levée, GPA de l'année antérieure, exclusions des valeurs nulles et sommes budgétaires.

**Step 2: Implémenter les agrégateurs purs**

Créer les fonctions par promoteur, CTX, livraison, réserve, GPA et budget.

**Step 3: Construire les panneaux filtrables**

Ajouter un sélecteur d'années multiples et des tableaux exportables. Conserver les indicateurs d'observations existants dans un onglet distinct.

**Step 4: Vérifier puis committer**

Run: `npm test -- --run src/lib/__tests__/statistics.test.ts && npm run build`
Expected: PASS.

```bash
git add src/lib/statistics.ts src/lib/__tests__/statistics.test.ts src/components/statistics src/pages/Statistics.tsx
git commit -m "feat: add DMO delivery and budget statistics"
```

### Task 11: Générer fiche de synthèse et revue documentaire

**Files:**
- Create: `src/lib/synthesisPdf.ts`
- Create: `src/lib/documentReview.ts`
- Create: `src/lib/__tests__/documentReview.test.ts`
- Create: `src/components/operations/DocumentsSection.tsx`
- Modify: `src/pages/OperationDetail.tsx`

**Step 1: Tester les échéances documentaires**

Reprendre les décalages du modèle `REVUE DOC LIV` et vérifier les échéances calculées, les valeurs manquantes et les dates de remise.

**Step 2: Implémenter la revue et l'upload privé**

Initialiser les lignes types, permettre la saisie des remises et téléverser plan/photos dans le bucket privé avec URL signée à durée courte.

**Step 3: Générer le PDF de synthèse**

Produire données principales, tableau typologies/financements, subventions, travaux, enjeux, planning, plan et photos. Gérer les sauts de page et images absentes.

**Step 4: Vérifier puis committer**

Run: `npm test -- --run src/lib/__tests__/documentReview.test.ts && npm run build`
Expected: PASS.

```bash
git add src/lib/synthesisPdf.ts src/lib/documentReview.ts src/lib/__tests__/documentReview.test.ts src/components/operations/DocumentsSection.tsx src/pages/OperationDetail.tsx
git commit -m "feat: add synthesis PDF and document review"
```

### Task 12: Vérification fonctionnelle, accessibilité et documentation

**Files:**
- Modify: `README.md`
- Create: `docs/acceptance-checklist.md`
- Modify: `src/index.css`

**Step 1: Exécuter toute la suite automatisée**

Run: `npm test -- --run`
Expected: tous les tests passent.

Run: `npm run lint`
Expected: aucune erreur.

Run: `npm run build`
Expected: compilation TypeScript et build Vite réussis.

**Step 2: Démarrer l'application et vérifier les parcours**

Run: `npm run dev -- --host 127.0.0.1`

Vérifier dans le navigateur : ancienne opération, création complète, calculs, collections répétables, permissions, filtre multi-critères, observation DG et validation, quatre calendriers, objectifs, statistiques, exports et PDF de synthèse. Contrôler console, responsive clavier et contraste des bandeaux.

**Step 3: Documenter le déploiement**

Mettre à jour le README avec l'application de migration, le premier administrateur, le bucket privé, les commandes de test et les limites connues. Remplir la checklist exigence par exigence.

**Step 4: Vérification finale du dépôt et commit**

Run: `git diff --check && git status --short`
Expected: aucune erreur d'espacement et uniquement les modifications attendues avant commit.

```bash
git add README.md docs/acceptance-checklist.md src/index.css
git commit -m "docs: add DMO deployment and acceptance guide"
```

Run: `npm test -- --run && npm run lint && npm run build && git status --short`
Expected: tests, lint et build réussis ; arbre de travail propre.
