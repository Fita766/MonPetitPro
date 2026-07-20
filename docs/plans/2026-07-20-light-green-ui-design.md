# Harmonisation claire et verte de MonPetitPro

## Intention

Les nouveaux écrans doivent retrouver le caractère clair de l’application existante. Les grandes surfaces presque noires et les accents turquoise ou bleu lumineux sont supprimés.

## Palette

- surfaces principales : blanc et `slate-50` ;
- surfaces mises en avant : `teal-50` avec bordure `teal-200` ;
- titres et actions principales : `teal-800` ou `teal-900` ;
- texte courant : `slate-700` à `slate-950` ;
- en-têtes de tableaux : `slate-100`, texte `slate-700` ;
- états métier uniquement : vert pour réalisé, rouge pour retard, ambre pour vigilance ;
- aucun bleu `sky` dans les composants métier : le prévisionnel utilise un teal désaturé.

## Application

L’harmonisation couvre le tableau des opérations, les observations, le détail et le formulaire d’opération, les calendriers, les objectifs, les statistiques, les documents et l’administration. Les fonds d’overlay de fenêtres modales peuvent rester sombres et translucides : ils servent uniquement à détacher la boîte de dialogue et ne constituent pas une surface de lecture.

## Vérification

- recherche statique des aplats `bg-slate-950` et des accents `sky` hors overlays ;
- tests, lint et build ;
- contrôle visuel en navigateur aux largeurs ordinateur et téléphone.
