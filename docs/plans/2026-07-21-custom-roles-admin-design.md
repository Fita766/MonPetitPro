# Administration autonome des accès — conception

## Objectif

Permettre au propriétaire de MonPetitPro de créer des rôles personnalisés très détaillés, de les attribuer aux utilisateurs et d’administrer les comptes sans intervention technique. Le premier propriétaire sera `sd@familleducastel.com`.

## Comptes et cycle de vie

Chaque profil possède un état `pending`, `active` ou `suspended`. Un nouveau compte ne reçoit aucun droit tant qu’un rôle ne lui est pas attribué et activé. Les inscriptions publiques et les identifiants de démonstration disparaissent de la page de connexion.

Le propriétaire est représenté par un attribut système distinct des rôles personnalisés. Au moins un propriétaire doit toujours rester actif. Un propriétaire ne peut pas se suspendre, se rétrograder ni supprimer le dernier propriétaire.

L’administration Supabase Auth passe exclusivement par une Edge Function utilisant la clé secrète côté serveur. Le navigateur ne reçoit jamais cette clé. L’interface permet l’invitation par email, la création avec mot de passe temporaire, le renvoi d’invitation, la suspension, la réactivation et la demande de réinitialisation.

## Rôles personnalisés

Un utilisateur possède au plus un rôle. Un rôle contient : nom, description, couleur choisie dans une palette fermée, état actif et ensemble de permissions. Les rôles sont persistés en base, duplicables et modifiables. La suppression est refusée tant que le rôle est attribué.

Les permissions sont des clés stables regroupées par domaine : opérations, observations, documents, calendriers, objectifs, statistiques, exports et administration. Elles distinguent notamment les sections d’une opération et les actions consulter, créer, modifier, supprimer, valider ou administrer.

Les contrôles sont appliqués à deux niveaux : l’interface masque ou désactive les fonctions indisponibles, tandis que les politiques RLS et fonctions SQL refusent réellement les accès non autorisés.

## Transfert du compte démo

Une fonction transactionnelle réservée au propriétaire transfère les références `user_id` des opérations, observations et événements depuis `demo@papa-immo.fr` vers `sd@familleducastel.com`. Elle conserve les initiales historiques non vides et remplit uniquement les initiales manquantes avec `SD`.

La fonction compte les lignes avant et après, refuse toute cible absente, reste rejouable sans créer de doublons et inscrit le résultat dans une table de journal de transfert. Le compte démo est suspendu seulement après réussite et contrôle du transfert. Son utilisateur Auth n’est pas supprimé afin de préserver les références et l’historique.

## Interface d’administration

Le dashboard comprend quatre onglets :

1. **Utilisateurs** : état, rôle, dernière connexion, actions de compte.
2. **Rôles** : cartes colorées, nombre d’utilisateurs, duplication et édition.
3. **Matrice des permissions** : cases à cocher regroupées, recherche et actions tout cocher/décocher par rubrique.
4. **Historique** : changements de rôles, comptes et transfert démo.

Les formulations sont explicites et les couleurs proposées visuellement, sans code hexadécimal.

## Mise en service

1. Déployer la migration et l’Edge Function.
2. Configurer le secret Supabase côté fonction et désactiver les inscriptions publiques.
3. Inviter `sd@familleducastel.com`.
4. Attendre que le propriétaire choisisse son mot de passe.
5. Exécuter l’amorçage propriétaire et le transfert depuis le dashboard.
6. Vérifier les compteurs, puis suspendre le compte démo.

L’implémentation locale s’arrête avant les étapes nécessitant les secrets du projet ou l’acceptation de l’invitation.
