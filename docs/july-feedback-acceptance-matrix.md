# Matrice de recette — réunion du 29 juillet

La transcription du 29 juillet est la source fonctionnelle prioritaire. Les contrôles ci-dessous couvrent aussi les fichiers Excel et la note de synthèse transmis.

| Exigence | Preuve automatisée ou scénario | Statut |
|---|---|---|
| Communes limitées au périmètre transmis | `referenceSeed.test.ts` + 4 558 communes seedées | validé |
| Département et zonage remplis depuis la commune | `references.test.ts` | validé |
| Référentiels CTX, COP, gestionnaires, promoteurs, labels administrables | `adminReferencesUi.test.ts` + `referenceSeed.test.ts` | validé |
| Type d’opération limité à MOD/VEFA | `operationPayload.test.ts` + `GeneralSection.tsx` | validé |
| Programme collectif, individuel, commerce et sections personnalisées | `program.test.ts` | validé |
| Lignes programme ajoutables librement | `ProgramLineEditor.tsx` | validé |
| Lignes et sections programme réordonnables | `program.test.ts` + boutons accessibles | validé |
| Totaux logements et produits calculés depuis les lignes | `program.test.ts` | validé |
| Planning regroupé par thèmes | `planningMilestones.test.ts` | validé |
| Paires prévisionnel/réel et écart en jours | `planningMilestones.test.ts` | validé |
| Champs MOD/VEFA conditionnels | `planningMilestones.test.ts` + `PlanningSection.tsx` | validé |
| Alertes J-30, J-15 et retard | `alerts.test.ts` | validé |
| Calendriers Programme et Travaux | `calendarEvents.test.ts` | validé |
| Export Outlook global et par événement | `ics.test.ts` | validé |
| Comptes individuels et mot de passe temporaire | `adminUsersUi.test.ts` + `admin-users/index.ts` | validé |
| Changement obligatoire à la première connexion | `changePasswordUi.test.ts` + migration SQL | validé |
| Rôles personnalisés persistants avec couleurs prédéfinies | `accessControl.test.ts` | validé |
| Rôle système duplicable avant personnalisation | `adminUsersUi.test.ts` | validé |
| Ancien transfert démo absent de l’administration | `adminUsersUi.test.ts` | validé |
| Autorisation indépendante pour chaque champ opération | `operationFieldPermissions.test.ts` | validé |
| Observations affectées à un compte | `observationAccess.test.ts` | validé |
| Conducteur auto-affecté sans pouvoir réaffecter | `observationAccess.test.ts` | validé |
| Réalisation, statut et DG protégés séparément | `observationAccess.test.ts` + RLS SQL | validé |
| File « sans affectation » réservée à la vue globale | `Observations.tsx` + RLS SQL | validé |
| Matrice budget LLS/LLI/géré × MOD/VEFA | `budget.test.ts` | validé |
| HT, TTC, fonds propres prévisionnels et finaux | `budget.test.ts` + `BudgetMatrix.tsx` | validé |
| Sauvegarde atomique budget/subventions | `julyFeedbackMigration.test.ts` | validé |
| Subventions prévisionnelles, finales et commentées | `BudgetSection.tsx` | validé |
| Objectifs OS et mise en gestion indépendants | `objectiveRecords.test.ts` | validé |
| Objectif initial figé | `objectiveRecords.test.ts` + trigger SQL | validé |
| Objectif complémentaire séparé | `objectiveRecords.test.ts` | validé |
| Réalisé hors objectif sans doublon | `objectiveRecords.test.ts` | validé |
| Logements-mois uniquement pour la MEG | `objectives.test.ts` + `objectiveRecords.test.ts` | validé |
| Statistiques livraison et OS | `statistics.test.ts` + `statisticsDrilldown.test.ts` | validé |
| Budget par base livraison ou OS | `statisticsDrilldown.test.ts` | validé |
| Détail exact derrière chaque agrégat | `statisticsDrilldown.test.ts` + dialogue navigateur | validé |
| Synthèse en six sections | `synthesisModel.test.ts` + `synthesisPdf.ts` | validé |
| Valeurs du modèle Clairoix conservées | `synthesisModel.test.ts` | validé |
| Travaux significatifs structurés et totalisés | `synthesisModel.test.ts` | validé |
| Revue documentaire recalculable sans écraser les réceptions | `documentReview.test.ts` | validé |
| Exports fondés sur les lignes filtrées | `exportRegistry.test.ts` + pages | validé |
| Colonnes choisies réellement respectées | `exportRegistry.test.ts` | validé |
| Colonnes budget/DG retirées sans autorisation | `exportRegistry.test.ts` | validé |
| Export DG dédié | `Observations.tsx` | validé |
| Historique avant/après lisible et filtrable | `audit.test.ts` + `/admin/history` | validé |
| Palette claire sans bleu vif ni fond noir | `uiPalette.test.ts` + recette Playwright | validé |
| Migration sans perte et comptages journalisés | `julyFeedbackMigration.test.ts` + requêtes post-déploiement | validé sur MonPetitPro le 31/07/2026 |
| Anciennes politiques de démo supprimées | `legacyPolicyCleanupMigration.test.ts` + inspection `pg_policies` | validé sur MonPetitPro le 31/07/2026 |
| Cloisonnement réel entre deux utilisateurs | requêtes Auth/PostgREST avec deux comptes temporaires | validé : lecture, modification, DG et opération protégées |
| Recette authentifiée des écrans | `MPP_MOCK_AUTH=1` + `scripts/verify_july_feedback_ui.py` | validé localement et avec le compte propriétaire réel |

## Déploiement Supabase du 31 juillet 2026

- Projet contrôlé : `MonPetitPro` (`vtzpkupnpinqtptrgbus`).
- Migrations appliquées jusqu’à `202607310001`.
- Fonction Edge `admin-users` déployée.
- Inscriptions publiques désactivées ; les comptes sont créés par un administrateur.
- Référentiels chargés : 4 558 communes, toutes avec une zone logement, et 226 valeurs métier.
- Données historiques conservées : 191 opérations, 289 observations et 3 profils.
- Affectations reprises automatiquement : 53 observations ; 236 restent sans affectation faute de correspondance certaine.
- Test du premier mot de passe effectué avec un compte temporaire puis nettoyé.
- Test RLS à deux utilisateurs effectué puis nettoyé : aucune lecture ou modification croisée, aucune observation DG exposée sans le droit correspondant.

## Commandes locales

```powershell
npm test -- --run
npm run build
npm run lint
git diff --check
python C:\Users\Fitanique\.codex\skills\webapp-testing\scripts\with_server.py `
  --server "npm run preview -- --host 127.0.0.1" --port 4173 `
  -- python scripts/verify_july_feedback_ui.py

$env:MPP_MOCK_AUTH = "1"
python C:\Users\Fitanique\.codex\skills\webapp-testing\scripts\with_server.py `
  --server "npm run preview -- --host 127.0.0.1" --port 4173 `
  -- python scripts/verify_july_feedback_ui.py
```

## Contrôles post-migration

```sql
select migration_key, source_count, migrated_count, details
from public.platform_migration_journal
order by migration_key;

select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

select count(*) as observations_sans_affectation
from public.observations
where assignee_user_id is null;
```
