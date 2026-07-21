# Typographie apaisée et création directe des comptes

## Objectif

Alléger la graisse typographique dans toute l’application et simplifier la gestion des comptes lorsque aucun service d’envoi d’e-mails n’est configuré.

## Design validé

- Texte courant en graisse normale (400).
- Libellés, boutons et petits repères en graisse moyenne (500).
- Titres structurants uniquement en semi-gras (600).
- Suppression des graisses 700 à 900 et des `font-black` dans toute l’interface.
- Conservation de la palette claire vert canard, sans thème sombre ni accent fluorescent.
- L’administration ne propose plus d’invitation : le responsable crée directement l’utilisateur, choisit son rôle et définit un mot de passe temporaire.
- L’onglet « Sécuriser la démo » disparaît puisque le transfert a déjà été exécuté et journalisé.

## Sécurité et comportement

La création directe continue de passer par la fonction Edge `admin-users`, avec confirmation immédiate de l’adresse et mot de passe temporaire de 12 caractères minimum. Les permissions de création restent contrôlées côté serveur. La fonction de transfert reste disponible en base pour l’historique et la réversibilité, mais n’est plus exposée dans l’interface.

## Vérification

Les tests doivent confirmer l’absence du mode invitation et de l’onglet démo, ainsi que la validation du mot de passe. Une recherche statique garantit l’absence de `font-black` et de graisses supérieures à 600 dans les composants, puis le build, le lint et les tests complets valident l’ensemble.
