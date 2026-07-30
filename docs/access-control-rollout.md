# Mise en service des accès personnalisés

Cette procédure ne supprime aucune donnée métier. Il n’existe plus de parcours
« Sécuriser la démo » : le regroupement des données historiques a déjà été traité.

## Avant le déploiement

1. Sauvegarder la base Supabase.
2. Appliquer toutes les migrations décrites dans `docs/database-migration.md`.
3. Dans Supabase Auth, désactiver **Allow new users to sign up**.
4. Déployer la fonction `admin-users`.

```bash
supabase link --project-ref VOTRE_PROJECT_REF
supabase db push
supabase functions deploy admin-users
```

La clé secrète Supabase reste exclusivement dans les secrets de la fonction Edge.
Elle ne doit jamais être ajoutée à un fichier `VITE_*` ni copiée dans le navigateur.

## Compte propriétaire

Le compte propriétaire attendu est `sd@familleducastel.com`. S’il n’est pas encore
propriétaire, exécuter depuis le SQL Editor avec un compte de service :

```sql
select public.bootstrap_owner('sd@familleducastel.com');
```

La fonction n’est exécutable ni anonymement ni par un utilisateur authentifié
ordinaire.

## Création des utilisateurs

Depuis **Administration → Utilisateurs**, le propriétaire :

1. crée ou modifie les rôles ;
2. choisit leur couleur parmi les couleurs proposées ;
3. coche séparément chaque autorisation ;
4. crée un compte avec son adresse, son rôle et un mot de passe temporaire ;
5. transmet ce mot de passe à la personne par le canal de son choix.

Il n’y a aucun e-mail d’invitation à configurer. À la première connexion,
MonPetitPro bloque l’accès aux données tant que l’utilisateur n’a pas remplacé
son mot de passe temporaire.

Le propriétaire peut ensuite suspendre ou réactiver un compte, lui attribuer un
autre rôle, définir un nouveau mot de passe temporaire et révoquer ses sessions.

## Règles de sécurité

- Chaque personne utilise son propre compte.
- Les rôles et autorisations sont permanents en base.
- Les restrictions sont contrôlées dans l’interface et par les politiques RLS.
- Les droits d’édition du programme, du budget, des objectifs et de la synthèse
  sont indépendants.
- Les observations DG et les observations affectées à d’autres personnes ne sont
  visibles que si le rôle l’autorise explicitement.
- Aucun compte de démonstration ne doit rester utilisable en production.
