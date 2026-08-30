# AGENTS.md — MonPetitPro (suivi des opérations immobilières)

Guide à destination des agents IA travaillant sur ce dépôt. Le projet est
entièrement en **français** : libellés d’interface, identifiants métier,
commentaires de code, messages de commit, noms de tests et documentation.
Le code, les identifiants, les noms de fichiers et les commandes restent dans
leur forme originale.

## Vue d’ensemble

MonPetitPro (nom du dépôt : `papa-suivi-action-immo`) est une application web
interne de **pilotage DMO (Direction de la Maîtrise d’Ouvrage)** des opérations
immobilières : programme, équipe, budget, jalons, livraisons, mise en gestion,
observations, objectifs annuels, statistiques, revue documentaire et documents
(plans/photos).

Le point de départ à lire avant toute modification : `README.md` (fonctions et
installation), `docs/database-migration.md` (historique des migrations) et
`docs/acceptance-checklist.md` (recette avant production).

## Stack technique

- **Frontend** : React 19, TypeScript 5.9 (mode strict), Vite 8, Tailwind CSS 4
  (config CSS-first dans `src/index.css` via `@theme`, plugin `@tailwindcss/vite`).
- **État** : Zustand 5 (`src/store/useStore.ts`).
- **Routage** : React Router 7 (`src/App.tsx`).
- **Backend** : Supabase hébergé — Auth, Postgres 17, RLS, Storage (bucket privé
  `operation-documents`), Edge Functions (Deno).
- **Exports** : `jspdf` + `jspdf-autotable` (PDF), `exceljs` (exports Excel),
  `xlsx` (aperçu du classeur à l’import), export iCal maison (`src/lib/ics.ts`).
- **Autres** : `date-fns`, `lucide-react`, `clsx` + `tailwind-merge`.
- **Tests** : Vitest 4 + Testing Library + jsdom.
- **CLI Supabase** : `supabase` v2 en devDependency (migrations, fonctions
  Edge, studio local via `supabase/config.toml`).

## Commandes

```bash
npm install                       # installer les dépendances
npm run dev                       # serveur de développement (Vite)
npm run build                     # tsc -b && vite build (compilation + build de prod)
npm run lint                      # ESLint (flat config, eslint.config.js)
npm test -- --run                 # exécution unique de tous les tests Vitest
npm run test:watch                # Vitest en mode watch (équivaut à npm test)
npm run preview                   # prévisualise le build de production
```

Vérifié en août 2026 : `npm test -- --run` (820 tests / 117 fichiers, verts),
`npm run lint` (aucune erreur), `npm run build` (réussi, avec un
avertissement de chunk principal > 500 ko non bloquant — le code-splitting
n’est pas encore fait).

## Structure du code

```
src/
  main.tsx / App.tsx / index.css   # point d'entrée, routes + gardes, thème Tailwind
  pages/                           # une page par route applicative
  components/
    layout/                        # AppLayout, Sidebar (navigation filtrée par permissions)
    operations/                    # sections de la fiche opération (budget/, planning/, program/, synthesis/)
    dashboard/                     # tableau de bord (KPI, radar des échéances, filtres)
    observations/ statistics/ calendar/ filters/ exports/
  lib/                             # logique métier pure (fonctions TS, sans JSX)
    __tests__/                     # tests unitaires co-localisés (39 fichiers)
  hooks/                           # useProfile (chargement profil + permissions)
  store/                           # useStore (Zustand)
  types/domain.ts                  # tous les types du domaine (Operation, Observation, PermissionKey…)
  test/setup.ts                    # setup Vitest (@testing-library/jest-dom)

supabase/
  migrations/                      # migrations SQL ordonnées par préfixe date, additives et idempotentes
  seed/july_feedback_references.sql # référentiels + communes (généré, ne pas éditer à la main)
  functions/admin-users/index.ts   # unique Edge Function (administration compte, Deno)
  config.toml                      # config du développement local Supabase

docs/
  plans/ + docs/superpowers/       # plans d'implémentation et design (voir « Conventions »)
  database-migration.md            # ordre d'application et contrôles des migrations
  access-control-rollout.md        # mise en service des accès personnalisés
  acceptance-checklist.md          # recette fonctionnelle avant production

scripts/                           # outils Python (voir « Vérifications UI »)
supabase_table.sql                 # schéma de CONTEXTE seulement (non exécutable, voir migrations)
```

### Rôle des couches

- `src/pages/*.tsx` : écrans, consommés par les routes de `App.tsx`. Toutes les
  routes applicatives sont protégées (voir « Contrôle d’accès »).
- `src/components/*` : composants, groupés par domaine métier.
- `src/lib/*.ts` : **logique métier pure, testée unitairement et sans JSX** :
  `operationCalculations` (calculs de dates M4/M7/M8, livraisons, MEG, retards),
  `planningMilestones`, `budget`, `program`, `statistics`, `calendarEvents`,
  `calendarScoping`, `alerts`, `objectives`, `objectiveRecords`, `documentReview`,
  `observation*`, `operationPayload` (mapping formulaire → payload Supabase),
  `operationFilters`, `operationExport` + `exportRegistry`, `synthesisModel` +
  `synthesisPdf`, `audit`, `references`, `importWorkbook`, `ics`, `accessControl`
  (catalogue `PERMISSION_GROUPS`/`PERMISSION_DEFINITIONS`), `permissions`
  (compatibilité rôle historique), `supabase` (client), `toastUtils`.
- `src/hooks/useProfile.ts` : après authentification, charge le profil
  (`profiles`) et les permissions effectives via `my_permissions()`.

## Architecture et flux de données

Application **SPA React + Supabase** : le client Supabase (clé anon, côté
navigateur) interroge Postgres via PostgREST ; toutes les tables sont protégées
par **RLS** et les règles métier sont contrôlées par des fonctions SQL
`security definer` (`has_permission`, `has_any_permission`, `my_permissions`,
`calendar_operations`, `list_active_profiles`…).

- Connexion : `supabase.auth` (sessions, mot de passe). Les inscriptions
  publiques sont désactivées en production ; le premier compte est rendu
  propriétaire via `bootstrap_owner('sd@familleducastel.com')` (réservé au
  rôle service).
- **Profil bloqué** : un compte `pending` ou `suspended` est redirigé vers un
  écran explicatif ; un mot de passe temporaire (`must_change_password`) force
  le passage par `/change-password`.
- **Compatibilité des colonnes** : quelques colonnes « sensibles » de
  `operations` gardent des noms historiques directement utilisés par le
  frontend (`contractual_delivery_date`, `expected_delivery_date`,
  `actual_delivery_date`, `daact_date`…) : ne pas les renommer.

## Contrôle d’accès

Les rôles dits « historiques » (`admin`, `responsable`, `contributeur`,
`lecteur`) restent en compatibilité, mais la sécurité repose sur un **catalogue
granulaire de permissions** (`PermissionKey` dans `src/types/domain.ts`,
défini aussi en SQL dans `permission_definitions`), des **rôles personnalisés**
(`custom_roles` + `custom_role_permissions`) et l’état du compte
(`profile.status`, `is_owner`).

- Le frontend masque routes et actions selon les permissions chargées
  (`permissionGranted`, `normalizePermissionKeys`). **Le cache des boutons
  n’est jamais une alternative au contrôle RLS/triggers côté base.**
- Les RLS des tables données vérifient explicitement `has_permission(...)` ;
  des triggers (`enforce_operation_field_permissions`,
  `enforce_observation_field_permissions`) refusent toute mise à jour
  champ-à-champ sans la permission adéquate, même via un appel API direct.
- Les rôles système (`is_system`) sont protégés par trigger contre toute
  modification/suppression (désactivé temporairement dans certaines migrations,
  toujours réactivé avant le commit).
- Le dernier propriétaire actif ne peut être ni retiré ni suspendu
  (`prevent_last_owner_change`).

## Conventions de développement

- **Langue** : tout le contenu visible/commenté/testé est en français ; les
  noms techniques (fichiers, fonctions, libellés SQL) utilisent l’anglais.
- **TDD** : on écrit les tests d’abord (`src/lib/__tests__/*.test.ts`), on
  vérifie leur échec, puis on implémente et on fait passer le test avant de
  committer. Les migrations sont testées par **assertions statiques** : les
  tests `*Migration.test.ts` lisent le fichier SQL et vérifient la présence des
  tables/colonnes/fonctions/triggers attendus (aucune base réelle n’est utilisée).
- **Migration SQL additive** : toute évolution de base est une migration
  numérotée `supabase/migrations/YYYYMMDDNNNN_sujet.sql`, additive et
  idempotente (`create table if not exists`, `add column if not exists`,
  `create or replace function`, `on conflict do nothing`), qui **ne supprime
  jamais de données** métier et annule la transaction si un contrôle de
  comptage échoue. Se référer aux patterns de `202607300001` pour les garde-fous.
- **Plans** : les évolutions sont préparées par un plan dans
  `docs/plans/` ou `docs/superpowers/plans/` (avec son design en
  `docs/superpowers/specs/`), puis exécutées tâche par tâche via le workflow
  `superpowers:executing-plans`.
- **Branches / worktrees** : le travail sur une fonctionnalité se fait sur une
  branche dédiée, généralement dans un worktree isolé (`.worktrees/`, ignoré de
  git). Présent en août 2026 : `feature/july-feedback` et
  `feature/dashboard-redesign`. Attention : `npm test` balaie aussi les
  fichiers de test des worktrees.
- **Commits** : messages conventionnels avec portée, ex. `feat(db): …`,
  `feat(observations): …`, `fix(migrations): …`, `docs: …`.

## Stratégie de test

- **Vitest** en environnement `jsdom`, `globals: true`, setup
  `src/test/setup.ts`. Les tests sont **co-localisés** dans
  `src/lib/__tests__/` (imports relatifs `../`).
- Tests de la logique pure (calculs, budget, planning, program, statistiques,
  filtres, permissions, export, ICS, payload…), tests **statiques de
  migration** et quelques tests de composants/UI (`adminUsersUi`,
  `adminReferencesUi`).
- Les `describe`/`it` sont rédigés en français.

### Vérifications UI (scripts Python)

`scripts/` contient des parcours navigateur Playwright hors-norme Vitest
(`verify_login_ui.py`, `verify_admin_ui.py`, `verify_july_feedback_ui.py`).
Ils s’appuient sur l’environnement : `MPP_BASE_URL` (défaut
`http://127.0.0.1:4173`, c’est-à-dire `npm run preview`), `MPP_TEST_EMAIL` /
`MPP_TEST_PASSWORD`, `MPP_MOCK_AUTH=1` pour un auth simulé. Ils écrivent leurs
captures dans `test-results/` (ignoré de git). Privilégier les tests Vitest ;
ces scripts servent de recette manuelle/structurelle.

## Base de données et déploiement

Ne pas déployer le frontend avant d’avoir appliqué les migrations. Procédure
détaillée dans `docs/database-migration.md` et `docs/access-control-rollout.md`
(résumé) :

1. Sauvegarder la base Supabase.
2. `supabase link --project-ref VOTRE_PROJECT_REF`
3. Appliquer toutes les migrations dans l’ordre (`supabase db push`) ; l’une
   d’elles exige un seed (charger `supabase/seed/` avec le SQL de références).
4. `supabase functions deploy admin-users`.
5. Dans Auth, désactiver les inscriptions publiques (désactivées depuis le
   31/07/2026 en production).
6. Rendre le compte attendu propriétaire :
   `select public.bootstrap_owner('sd@familleducastel.com');` (fonction
   réservée au rôle service, jamais exécutable anonymement).
7. Créer rôles et utilisateurs depuis **Administration → Utilisateurs**
   (aucun e-mail d’invitation : un compte est créé avec un mot de passe
   temporaire, communiqué par le canal de l’équipe).
8. Passer la recette `docs/acceptance-checklist.md`.

Le bucket `operation-documents` est **privé** ; l’application utilise des liens
temporaires (signed URLs), jamais d’URL publique.

## Considérations de sécurité

- La clé **anon** (frontend) ne permet que ce que la RLS autorise. La clé
  **service** ne doit **jamais** apparaître dans un fichier `VITE_*` ni dans
  le navigateur : elle ne vit que dans les secrets de l’Edge Function
  `admin-users` (actions `invite`, `create`, `update`, `reset-password`,
  `suspend`, `reactivate`, `transfer-demo`), qui authentifie l’appelant et
  contrôle sa permission via `admin.users.invite`/`admin.users.manage`/… avant
  d’agir.
- Ne jamais committer `.env.local` (variables `VITE_SUPABASE_URL` /
  `VITE_SUPABASE_ANON_KEY`), le dossier local `dossiers modifs/`, les
  worktrees `.worktrees/` ni les captures `test-results/`.
- `src/lib/supabase.ts` contient un repli codé en dur (URL de projet + clé
  factice) qui n’est là que pour éviter un crash au dev sans `.env.local` — un
  avertissement console signale l’absence de configuration réelle.
- Toute nouvelle table exposée à l’API doit activer la RLS et être couverte
  par des permissions du catalogue ; les données sensibles (DG, affectations,
  avancement) doivent rester filtrées par la RLS (voir la migration de
  visibilité des observations).
