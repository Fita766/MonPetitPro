# Mise en service des accès personnalisés

Cette procédure ne supprime aucune donnée métier.

## Avant le déploiement

1. Sauvegarder la base Supabase.
2. Appliquer `202607200001_dmo_extension.sql`, puis `202607210001_custom_access_control.sql`.
3. Dans Supabase Auth, désactiver **Allow new users to sign up**.
4. Déployer la fonction `admin-users`. Elle utilise les secrets Supabase fournis automatiquement ; `SUPABASE_SECRET_KEY` reste une surcharge optionnelle.

Commandes Supabase CLI, depuis la racine du projet :

```bash
supabase link --project-ref VOTRE_PROJECT_REF
supabase db push
supabase secrets set INVITE_REDIRECT_URL=https://votre-domaine.fr
supabase functions deploy admin-users
```

La clé secrète Supabase reste exclusivement dans les secrets de la fonction Edge.
Elle ne doit jamais être ajoutée à un fichier `VITE_*` ni copiée dans le navigateur.

## Premier propriétaire

1. Depuis Supabase Dashboard, inviter `sd@familleducastel.com`.
2. Attendre que l’invitation soit acceptée et que le mot de passe soit défini.
3. Exécuter depuis SQL Editor avec un compte de service :

```sql
select public.bootstrap_owner('sd@familleducastel.com');
```

La fonction n’est exécutable ni par un utilisateur anonyme ni par un utilisateur authentifié ordinaire.

Après sa première connexion, le propriétaire ouvre **Utilisateurs** dans le menu,
crée ses rôles, coche leurs autorisations puis invite les membres de son équipe.

## Compte démo

Le transfert initial utilise `demo@papa-immo.fr` comme source,
`sd@familleducastel.com` comme cible et `SD` comme initiales de remplacement.
La fonction `transfer_account_data` réaffecte en une transaction les opérations,
observations et événements. Elle conserve les initiales déjà renseignées,
complète uniquement celles qui sont vides et journalise les volumes déplacés.
Elle ne copie ni ne supprime aucune ligne métier.

Ne pas supprimer `demo@papa-immo.fr`. Le transfert guidé réaffecte ses données,
puis suspend ce compte afin de préserver les références historiques. Cette action
reste bloquée derrière une confirmation explicite dans l’onglet **Sécuriser la démo**.
