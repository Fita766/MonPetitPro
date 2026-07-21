# Custom Roles and Autonomous Administration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Donner à `sd@familleducastel.com` un compte propriétaire capable de créer des rôles personnalisés, gérer les utilisateurs et transférer sans perte les données du compte démo.

**Architecture:** Une migration additive introduit les rôles, permissions et états de compte, puis remplace les politiques globales par des vérifications RLS indexées via fonctions `security definer`. Une Edge Function détient seule la clé secrète nécessaire à Supabase Auth. Le frontend charge les permissions effectives et présente un dashboard d’administration en quatre onglets.

**Tech Stack:** PostgreSQL/Supabase RLS, Supabase Edge Functions (Deno), React 19, TypeScript, Zustand, Tailwind CSS, Vitest.

---

### Task 1: Catalogue typé des permissions

**Files:**
- Create: `src/lib/accessControl.ts`
- Create: `src/lib/__tests__/accessControl.test.ts`
- Modify: `src/types/domain.ts`

1. Écrire les tests du catalogue, des groupes, de la palette fermée et du calcul des autorisations larges existantes.
2. Vérifier l’échec faute de module.
3. Définir les clés stables par domaine, 12 couleurs prédéfinies et les types `CustomRole`, `ProfileStatus`, `EffectiveAccess`.
4. Faire passer les tests et committer.

### Task 2: Migration additive rôles, états et propriétaire

**Files:**
- Create: `supabase/migrations/202607210001_custom_access_control.sql`
- Create: `docs/access-control-rollout.md`
- Test: `src/lib/__tests__/accessControlMigration.test.ts`

1. Écrire un test statique exigeant les tables `custom_roles`, `permission_definitions`, `custom_role_permissions`, `account_data_transfers`, les index de clés étrangères, RLS et fonctions d’accès.
2. Vérifier l’échec.
3. Ajouter les colonnes `custom_role_id`, `status`, `is_owner`, `last_seen_at` à `profiles` avec état initial sûr.
4. Créer et indexer les tables, amorcer le catalogue et créer les rôles hérités pour compatibilité.
5. Créer `has_permission`, `has_any_permission`, `my_permissions`, les protections du dernier propriétaire et les politiques RLS.
6. Documenter l’amorçage non destructif de `sd@familleducastel.com`.
7. Faire passer le test et committer.

### Task 3: Transfert transactionnel du compte démo

**Files:**
- Modify: `supabase/migrations/202607210001_custom_access_control.sql`
- Create: `src/lib/__tests__/demoTransferMigration.test.ts`

1. Écrire les assertions statiques pour le verrouillage, les comptages, les mises à jour `operations`, `observations`, `events`, le journal et l’idempotence.
2. Vérifier l’échec.
3. Implémenter `transfer_account_data(source_email, target_email)` réservé au propriétaire.
4. Préserver les initiales existantes, renseigner seulement les initiales vides et refuser source/cible manquante.
5. Faire passer les tests et committer.

### Task 4: Edge Function d’administration Auth

**Files:**
- Create: `supabase/functions/admin-users/index.ts`
- Create: `supabase/functions/admin-users/deno.json`
- Create: `src/lib/__tests__/adminUsersFunction.test.ts`

1. Écrire les tests statiques interdisant l’exposition de secret, exigeant la vérification JWT et les actions `invite`, `create`, `suspend`, `reactivate`, `reset-password` et `revoke-sessions`.
2. Vérifier l’échec.
3. Implémenter une fonction CORS qui authentifie l’appelant, contrôle sa permission, utilise un client secret séparé et journalise l’action.
4. Faire passer les tests et committer.

### Task 5: Chargement des permissions et écrans de compte bloqué

**Files:**
- Modify: `src/hooks/useProfile.ts`
- Modify: `src/store/useStore.ts`
- Modify: `src/lib/permissions.ts`
- Modify: `src/App.tsx`
- Create: `src/components/auth/AccountUnavailable.tsx`
- Test: `src/lib/__tests__/permissions.test.ts`

1. Étendre les tests de permissions pour un propriétaire, un rôle personnalisé, un compte pending et un compte suspendu.
2. Vérifier l’échec.
3. Charger `my_permissions()` avec le profil et stocker les clés effectives.
4. Bloquer toute route applicative pour un compte non actif avec un message explicite.
5. Conserver une compatibilité temporaire avec les quatre anciens rôles.
6. Faire passer les tests et committer.

### Task 6: Connexion privée

**Files:**
- Modify: `src/pages/Login.tsx`
- Create: `src/pages/SetPassword.tsx`
- Modify: `src/App.tsx`
- Test: `src/test/loginSecurity.test.tsx`

1. Écrire le test vérifiant l’absence d’identifiants démo et de bouton d’inscription publique.
2. Vérifier l’échec.
3. Afficher des champs vides, un lien mot de passe oublié et un écran de définition du mot de passe après invitation.
4. Faire passer les tests et committer.

### Task 7: Dashboard des rôles

**Files:**
- Create: `src/components/admin/RoleList.tsx`
- Create: `src/components/admin/RoleEditor.tsx`
- Create: `src/components/admin/PermissionMatrix.tsx`
- Modify: `src/pages/AdminUsers.tsx`
- Test: `src/components/admin/__tests__/PermissionMatrix.test.tsx`

1. Écrire le test de sélection par groupe, recherche et palette sans hexadécimal.
2. Vérifier l’échec.
3. Construire les cartes de rôles, duplication, édition et matrice détaillée.
4. Empêcher la suppression d’un rôle attribué et afficher le nombre d’utilisateurs.
5. Faire passer les tests et committer.

### Task 8: Dashboard des utilisateurs et appels sécurisés

**Files:**
- Create: `src/lib/adminUsers.ts`
- Create: `src/components/admin/UserList.tsx`
- Create: `src/components/admin/UserDialog.tsx`
- Create: `src/components/admin/DemoTransferPanel.tsx`
- Modify: `src/pages/AdminUsers.tsx`
- Test: `src/lib/__tests__/adminUsers.test.ts`

1. Écrire les tests des payloads d’invitation, création, suspension et transfert.
2. Vérifier l’échec.
3. Ajouter les formulaires accessibles, confirmations destructives et états de chargement.
4. Ajouter le panneau guidé de transfert démo avec compteurs et journal.
5. Faire passer les tests et committer.

### Task 9: Appliquer les permissions granulaires dans l’interface

**Files:**
- Modify: `src/pages/Dashboard.tsx`
- Modify: `src/pages/OperationForm.tsx`
- Modify: `src/pages/OperationDetail.tsx`
- Modify: `src/pages/Observations.tsx`
- Modify: `src/pages/CalendarView.tsx`
- Modify: `src/pages/Objectives.tsx`
- Modify: `src/pages/Statistics.tsx`
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/components/operations/*.tsx`
- Test: `src/lib/__tests__/permissions.test.ts`

1. Ajouter des assertions de correspondance entre actions historiques et permissions granulaires.
2. Masquer les routes et actions sans permission.
3. Rendre séparément éditables les sections identité, équipe, programme, planning, budget, conditions, objectifs et synthèse.
4. Vérifier que l’absence de bouton ne remplace jamais le contrôle RLS.
5. Faire passer les tests et committer.

### Task 10: Documentation, recette et livraison locale

**Files:**
- Modify: `README.md`
- Modify: `docs/acceptance-checklist.md`
- Modify: `docs/access-control-rollout.md`

1. Documenter les secrets, le déploiement de la fonction, la désactivation des inscriptions et l’invitation du propriétaire.
2. Exécuter `npm test -- --run`, `npm run lint`, `npm run build` et `git diff --check`.
3. Tester les états propriétaire, rôle limité, pending et suspended avec Playwright ou mocks de session.
4. S’arrêter avant l’invitation réelle si les secrets Supabase ne sont pas disponibles.
