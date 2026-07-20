# Light Green UI Harmonization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remplacer les surfaces presque noires et les accents bleu vif des nouveaux écrans par une identité claire et verte cohérente avec MonPetitPro.

**Architecture:** La modification reste purement visuelle et s’appuie sur les classes Tailwind existantes. Les états fonctionnels et les couleurs exactes des stades ne changent pas ; seules les surfaces structurelles et la couleur du prévisionnel sont harmonisées.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, Vitest, Playwright.

---

### Task 1: Créer le garde-fou de palette

**Files:**
- Create: `src/test/uiPalette.test.ts`

1. Écrire un test qui parcourt les composants concernés et refuse `bg-slate-950` hors overlays ainsi que les classes `sky`.
2. Exécuter `npm test -- --run src/test/uiPalette.test.ts` et confirmer l’échec.
3. Centraliser dans le test la liste explicite des fichiers métier contrôlés.

### Task 2: Éclaircir les écrans de pilotage

**Files:**
- Modify: `src/pages/Dashboard.tsx`
- Modify: `src/pages/Observations.tsx`
- Modify: `src/pages/OperationDetail.tsx`
- Modify: `src/pages/CalendarView.tsx`
- Modify: `src/pages/Objectives.tsx`
- Modify: `src/pages/Statistics.tsx`
- Modify: `src/pages/AdminUsers.tsx`

1. Remplacer les en-têtes noirs par `bg-slate-100` ou `bg-teal-50`, avec texte anthracite/vert foncé.
2. Remplacer les états actifs noirs par `bg-teal-700 text-white` ou une variante claire bordée.
3. Remplacer le bleu `sky` du prévisionnel par un teal désaturé.

### Task 3: Éclaircir les composants réutilisables

**Files:**
- Modify: `src/components/operations/*.tsx`
- Modify: `src/components/statistics/*.tsx`
- Modify: `src/components/calendar/CalendarLegend.tsx`

1. Éclaircir les cartes de planning, budget, conditions, documents et typologies.
2. Conserver des boutons primaires vert foncé avec texte blanc.
3. Exécuter le test de palette jusqu’à réussite.

### Task 4: Vérifier et livrer

**Files:**
- Modify if needed: affected UI files

1. Exécuter `npm test -- --run`, `npm run lint` et `npm run build`.
2. Contrôler le rendu téléphone et ordinateur avec Playwright.
3. Corriger les contrastes ou débordements observés.
4. Committer et pousser `main`.
