# Mise en service des accès personnalisés

Cette procédure ne supprime aucune donnée métier.

## Avant le déploiement

1. Sauvegarder la base Supabase.
2. Appliquer `202607200001_dmo_extension.sql`, puis `202607210001_custom_access_control.sql`.
3. Dans Supabase Auth, désactiver **Allow new users to sign up**.
4. Déployer la fonction `admin-users` avec les secrets `SUPABASE_URL`, `SUPABASE_ANON_KEY` et `SUPABASE_SECRET_KEY`.

## Premier propriétaire

1. Depuis Supabase Dashboard, inviter `sd@familleducastel.com`.
2. Attendre que l’invitation soit acceptée et que le mot de passe soit défini.
3. Exécuter depuis SQL Editor avec un compte de service :

```sql
select public.bootstrap_owner('sd@familleducastel.com');
```

La fonction n’est exécutable ni par un utilisateur anonyme ni par un utilisateur authentifié ordinaire.

## Compte démo

Ne pas supprimer `demo@papa-immo.fr`. Le transfert guidé réaffectera ses données, puis le compte sera suspendu afin de préserver les références historiques.
