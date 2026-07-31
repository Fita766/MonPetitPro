# Migrations de la base MonPetitPro

Les migrations sont additives : elles conservent les tables et les données historiques.
La migration du 29 juillet transforme les anciennes valeurs en structures plus détaillées
et annule toute la transaction si un comptage de contrôle échoue.

## Ordre d’application

1. Sauvegarder la base Supabase.
2. Vérifier que le projet CLI lié est bien **MonPetitPro**.
3. Appliquer, dans l’ordre :

   - `202607200001_dmo_extension.sql`
   - `202607210001_custom_access_control.sql`
   - `202607300001_july_feedback_rework.sql`
   - `202607310001_remove_legacy_broad_policies.sql`

4. Charger `supabase/seed/july_feedback_references.sql`.
5. Déployer la fonction Edge `admin-users`.
6. Désactiver les inscriptions publiques dans Supabase Auth.

```bash
supabase link --project-ref VOTRE_PROJECT_REF
supabase db push
supabase functions deploy admin-users
```

## Données transformées le 29 juillet

La migration conserve les colonnes historiques et initialise :

- le programme détaillé depuis les typologies existantes ;
- les budgets depuis `initial_budget` et `final_budget` ;
- les objectifs initiaux depuis les objectifs historiques ;
- les travaux significatifs depuis le texte existant ;
- les montants prévisionnels de subvention depuis les anciens montants ;
- les affectations d’observation lorsqu’une seule correspondance certaine existe.

Les correspondances ambiguës d’observation restent volontairement sans affectation.
Les volumes sont enregistrés dans `platform_migration_journal`.

## Contrôles après déploiement

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

select tablename, policyname
from pg_policies
where schemaname = 'public'
  and tablename in ('operations', 'observations')
  and cmd = 'ALL'
  and 'authenticated' = any(roles)
  and coalesce(trim(qual), '') in ('true', '(true)');
```

Vérifier aussi que le bucket privé `operation-documents` existe, puis se reconnecter
à l’application afin de recharger le profil et ses autorisations.
La dernière requête ne doit retourner aucune ligne.

## Compatibilité

Les anciennes colonnes restent disponibles. Le mapping conservé est :

- `contractual_delivery_date` : livraison contractuelle ;
- `expected_delivery_date` : dernière livraison prévisionnelle ;
- `actual_delivery_date` : livraison réelle ;
- `daact_date` : dépôt DAACT.

Une opération créée avant les migrations reste donc lisible et modifiable.
