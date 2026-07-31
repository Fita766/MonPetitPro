# Palette minérale claire et export Outlook explicite

**Date :** 31 juillet 2026  
**Surface :** application métier MonPetitPro  
**Mode Impeccable :** Operate / Quieter  
**Statut :** validé avec la contrainte « aucun dark mode »

## 1. Objectif

Rendre MonPetitPro calme et confortable pour un usage professionnel prolongé,
sans modifier son organisation ni ses données. Le turquoise actuellement utilisé
comme couleur dominante est trop saturé et concurrence le contenu. La nouvelle
identité doit rester claire, chaleureuse et immédiatement lisible.

Le même lot corrige la découvrabilité de l’export Outlook. La génération ICS
existe déjà, mais le libellé global « Outlook » et la petite icône par événement
ne suffisent pas à faire comprendre l’action disponible.

Enfin, la recette finale reprend toutes les exigences de la réunion du 29 juillet
et distingue une preuve de comportement d’une simple présence dans le code.

## 2. Contraintes immuables

- L’application est exclusivement en thème clair.
- Aucun dark mode, sélecteur de thème ou palette sombre alternative n’est ajouté.
- Aucun noir pur, turquoise fluorescent, bleu vif, halo coloré ou grand dégradé
  décoratif n’est utilisé.
- Le contenu, les fonctions métier, les libellés factuels et les permissions sont
  conservés, sauf correction explicitement justifiée par la transcription.
- Les couleurs ne sont jamais l’unique moyen de transmettre un état.
- Les couleurs de stade issues des références métier restent disponibles sur les
  badges concernés ; elles ne deviennent pas des couleurs de structure.

## 3. Direction visuelle : « minéral calme »

### 3.1 Palette

| Usage | Couleur | Valeur cible |
|---|---|---|
| Fond général | ivoire minéral | `#F6F4EF` |
| Surface principale | blanc chaud | `#FFFEFB` |
| Surface secondaire | lin clair | `#F0ECE4` |
| Texte principal | graphite teinté | `#2D3331` |
| Texte secondaire | sauge grisée | `#69716C` |
| Bordure | pierre | `#D8D2C7` |
| Action principale | terre cuite profonde | `#8F4938` |
| Action survolée | terre cuite sombre | `#743A2E` |
| Accent pâle | argile claire | `#F7E9E3` |
| Succès uniquement | olive sourd | `#5D745A` |
| Avertissement | ocre | `#94651F` |
| Danger | brique | `#A13F39` |

Le vert olive est réservé aux états « réussi », « terminé » ou « réel ». Il
n’apparaît jamais sur la navigation, les boutons principaux, les titres ou les
fonds de grande surface.

### 3.2 Hiérarchie et composants

- Les titres utilisent le graphite, sans couleur d’accent systématique.
- Les boutons primaires utilisent la terre cuite ; les boutons secondaires restent
  blancs avec une bordure pierre.
- La navigation active utilise un fond argile clair, un texte terre cuite sombre et
  un repère discret, pas un grand pavé saturé.
- Les cartes sont plus plates : bordure fine, ombre très légère uniquement lorsque
  la séparation avec le fond l’exige.
- Les bandeaux en dégradé sont remplacés par des surfaces chaudes unies.
- Les tableaux utilisent un en-tête lin clair et du texte graphite.
- Les focus restent très visibles avec un anneau terre cuite à faible opacité.
- La densité, la taille des contrôles et la typographie existantes sont préservées
  afin de ne pas perturber les utilisateurs habituels.

### 3.3 Mise en œuvre

La palette est centralisée dans les variables Tailwind/CSS afin que les écrans
partagent les mêmes tons. Les classes historiques `teal`, `emerald` et `slate`
sont remappées vers la palette minérale lorsqu’elles représentent la structure,
puis les exceptions métier sont corrigées explicitement. Les couleurs codées en
dur des exports PDF/Excel sont harmonisées avec les mêmes valeurs.

## 4. Parcours Outlook

### 4.1 Calendrier

La barre d’actions affiche un bouton textuel :

> **Exporter les échéances vers Outlook (.ics)**

Une aide immédiatement adjacente précise :

> Exporte la vue filtrée avec les rappels J-30 et J-15.

Chaque échéance visible propose une action textuelle secondaire
**Ajouter à Outlook**. Sur les cellules étroites, le texte peut être placé dans
le panneau de détail ouvert par l’événement, mais il ne peut pas être remplacé
uniquement par une icône sans explication accessible.

### 4.2 Tableau de bord

Les échéances J-30, J-15 et en retard affichées dans le tableau de bord proposent
également **Ajouter à Outlook**. Un bouton global permet d’exporter toutes les
échéances actuellement affichées. L’action Outlook ne remplace pas le lien vers
la fiche opération.

### 4.3 Résultat et erreurs

- Un export vide est désactivé et explique qu’aucune échéance ne correspond aux
  filtres.
- Après génération, une confirmation indique le nombre d’échéances exportées et
  rappelle la présence des alertes J-30/J-15.
- Une erreur de génération est affichée sans modifier les filtres.
- Les fichiers restent des ICS locaux : aucune connexion Microsoft ni envoi
  automatique n’est ajouté.

## 5. Audit fonctionnel complet

La matrice de recette du 29 juillet est reprise ligne par ligne. Chaque exigence
reçoit l’un des niveaux de preuve suivants :

1. **Comportement navigateur :** le parcours est réellement exécuté et le résultat
   utilisateur est contrôlé.
2. **Comportement Supabase :** les permissions, migrations ou données sont testées
   par requête réelle avec plusieurs profils lorsque nécessaire.
3. **Test métier :** un calcul pur est couvert avec des entrées et sorties précises.
4. **Inspection d’artefact :** le contenu téléchargé (ICS, PDF ou Excel) est ouvert
   ou analysé, pas seulement généré.

Une ligne ne peut plus être déclarée validée uniquement parce qu’un fichier ou un
bouton existe. Les lacunes découvertes sont corrigées dans ce lot lorsqu’elles
relèvent des demandes déjà formulées ; aucune nouvelle fonctionnalité étrangère à
la réunion n’est ajoutée.

## 6. Preuves de recette attendues

- Détection mécanique Impeccable sur toutes les cibles UI modifiées.
- Captures desktop et mobile de la connexion, du tableau de bord, du calendrier,
  des observations, d’une fiche opération et de l’administration.
- Vérification qu’aucune grande surface turquoise, noire ou sombre ne subsiste.
- Contrôle de contraste des textes et actions principales.
- Clic sur l’export Outlook global et individuel, interception du téléchargement,
  puis vérification du contenu ICS et des alarmes `-P30D` et `-P15D`.
- Contrôle que les filtres du calendrier déterminent bien les événements exportés.
- Suite Vitest complète, lint, build de production et `git diff --check`.
- Mise à jour de la matrice d’acceptation avec la preuve exacte de chaque demande.

## 7. Critères de fin

Le lot est terminé uniquement lorsque la nouvelle palette est cohérente sur tous
les écrans, qu’aucun dark mode n’existe, que les actions Outlook sont explicites
et réellement téléchargeables, que les écarts de la réunion ont été corrigés ou
documentés avec une preuve solide, puis que le commit final est poussé en avance
rapide sur `main`.
