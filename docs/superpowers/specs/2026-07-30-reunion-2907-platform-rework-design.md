# Refonte fonctionnelle MonPetitPro — retours du 29 juillet 2026

## 1. Objet et sources de vérité

Cette spécification transforme les retours de la réunion du 29 juillet 2026 en un produit cohérent et réalisable.

Ordre de priorité des sources :

1. décisions explicites prises après la réunion dans la conversation ;
2. transcription `dossiers modifs/modif_reunion_2907.md` ;
3. note `dossiers modifs/NOTE MAJ MON PETIT PRO.md` ;
4. classeur `dossiers modifs/TBX SUIVI DMO actuel.xlsx` ;
5. note de synthèse et autres fichiers de référence.

La transcription du 29 juillet remplace les anciennes règles lorsqu’elles se contredisent. Lorsque les participants annoncent un document futur qui n’a pas été remis, MonPetitPro fournit une proposition fonctionnelle immédiatement exploitable et administrable.

## 2. Principes non négociables

- Aucune opération, observation, pièce, date ou donnée existante ne doit être perdue.
- Les migrations sont additives, rejouables lorsque possible et accompagnées de contrôles de fin.
- Le classeur sert de référentiel métier, pas de source à réimporter dans les opérations. Aucun import massif d’opérations n’est ajouté à ce stade.
- Les droits sont appliqués dans l’interface et dans PostgreSQL afin qu’un appel direct à l’API ne puisse pas les contourner.
- Les utilisateurs ne saisissent pas deux fois la même information. Les totaux et dates dérivées sont calculés.
- Les valeurs par défaut proposées faute de document client sont modifiables par un administrateur lorsque cela est pertinent.
- L’interface reste claire pour des utilisateurs peu techniques : libellés métier, pas de code couleur hexadécimal, pas de jargon de base de données.

## 3. Stratégie d’évolution

L’application actuelle est conservée et renforcée. Une réécriture totale serait plus risquée pour les données et n’apporterait pas de bénéfice fonctionnel suffisant.

L’évolution est organisée autour de modules séparés :

- référentiels ;
- comptes et accès ;
- opérations et programme ;
- planning et alertes ;
- observations ;
- budget ;
- objectifs et statistiques ;
- documents, synthèse et exports.

Chaque module possède son modèle de données, ses règles d’accès, ses services de calcul et ses tests. Les pages peuvent évoluer indépendamment sans dupliquer les règles.

## 4. Référentiels métier

### 4.1 Communes et départements

Le référentiel initial est construit depuis la colonne R de la feuille `Listes` du classeur DMO et limité aux départements :

`02`, `59`, `60`, `62`, `77`, `80`, `93`, `94`, `95`.

Une commune contient au minimum :

- nom officiel ;
- code INSEE ;
- code postal principal ;
- département et libellé du département ;
- région ;
- zonage logement ;
- état actif/inactif.

Dans une fiche opération :

- l’utilisateur recherche et sélectionne une commune ;
- le département est rempli automatiquement ;
- le zonage logement est rempli automatiquement ;
- la saisie libre reste impossible pour un rôle standard ;
- un administrateur peut ajouter une commune exceptionnelle hors périmètre.

Le zonage est stocké avec la commune et peut être actualisé par un administrateur. L’application ne dépend pas d’une API externe à chaque ouverture de fiche.

### 4.2 Autres listes

Une administration des référentiels permet de gérer :

- COP ;
- CTX ;
- assistantes ;
- assistantes GPA ;
- gestionnaires ;
- prestataires d’animation ;
- promoteurs ;
- certifications ;
- réglementations thermiques ;
- catégories et natures de programme.

Chaque valeur possède un libellé, un ordre d’affichage et un état actif. Une valeur déjà utilisée peut être désactivée, mais pas supprimée de façon à casser l’historique.

Les listes du classeur amorcent les valeurs disponibles. Les listes absentes promises pendant la réunion reçoivent les valeurs distinctes déjà présentes dans les opérations, puis peuvent être corrigées depuis l’administration.

## 5. Comptes, première connexion et rôles

### 5.1 Création d’un compte

Un administrateur crée un compte avec :

- adresse électronique ;
- nom affiché ;
- initiales ;
- rôle ;
- mot de passe temporaire.

Aucun e-mail n’est envoyé. À la première connexion, l’utilisateur est redirigé vers un écran obligatoire de changement de mot de passe. Il ne peut accéder à aucune page métier avant d’avoir choisi son nouveau mot de passe.

Un administrateur peut suspendre et réactiver un compte. Une suspension n’efface aucune attribution ni aucun historique.

### 5.2 Rôles

Les rôles restent personnalisables, persistants et associés à une couleur choisie dans une palette prédéfinie.

Les rôles système servent de modèles initiaux :

- administrateur ;
- responsable/adjoint ;
- assistante habilitée ;
- conducteur ;
- lecteur.

Ils ne remplacent pas les rôles personnalisés. L’administrateur peut dupliquer un modèle et ajuster ses autorisations.

### 5.3 Permissions fines

Les permissions de modification d’une opération sont proposées champ par champ. Exemples :

- modifier la commune ;
- modifier le stade ;
- modifier le COP ;
- modifier le CTX ;
- modifier les données de programme ;
- modifier chaque date prévisionnelle ;
- modifier chaque date réelle ;
- modifier les retards justifiés ;
- modifier les pénalités ;
- modifier les budgets ;
- modifier les objectifs.

L’écran des rôles regroupe les nombreuses cases par thème et propose :

- tout cocher/décocher dans un thème ;
- recherche par libellé ;
- compteur d’autorisations ;
- description en langage métier.

Les permissions d’observation sont indépendantes :

- voir ses observations affectées ;
- voir toutes les observations ;
- voir les informations DG ;
- créer ;
- modifier sa description et sa proposition ;
- affecter une autre personne ;
- réaffecter ;
- renseigner la réalisation ;
- changer le statut ;
- valider une résolution ;
- supprimer ;
- exporter.

Des permissions distinctes couvrent les référentiels, documents, calendriers, objectifs, statistiques, exports, utilisateurs, rôles et historique.

### 5.4 Historique

Une page d’historique exploite le journal d’audit existant. Elle affiche :

- date et heure ;
- utilisateur ;
- opération ou objet concerné ;
- action ;
- anciennes et nouvelles valeurs lisibles.

Elle est filtrable par utilisateur, période, opération, table et type d’action. Seuls les rôles autorisés la consultent.

## 6. Identité d’une opération

Le mode de réalisation et la nature du programme sont séparés :

- mode de réalisation : `MOD` ou `VEFA` ;
- nature : neuf, réhabilitation, démolition, étudiant, béguinage, commerce, mixte ou valeur administrable.

Le formulaire utilise les référentiels pour le stade, la commune, l’équipe, le promoteur, la certification et la réglementation thermique.

Le numéro de permis est regroupé avec les informations administratives du permis, pas isolé parmi les jalons calculés.

Les cartes et tableaux d’opérations présentent :

1. le stade avec sa couleur ;
2. le nom complet de l’opération ;
3. les informations synthétiques actuelles.

Les filtres affichent les libellés complets des stades, par exemple `1 bis — Montage / Travaux`.

## 7. Programme flexible

### 7.1 Sections

Une opération peut activer une ou plusieurs sections :

- logements collectifs ;
- logements individuels ;
- commerces/locaux ;
- catégorie personnalisée.

Une section inactive n’encombre pas le formulaire. Elle peut être réactivée sans perdre ses lignes précédentes.

### 7.2 Lignes de programme

Chaque section accepte des lignes ajoutables et réordonnables.

Pour les logements :

- typologie libre à partir de suggestions (`T1`, `T2`, `T3`, `T4`, `T5`, studio, etc.) ;
- produit (`PLUS`, `PLAI`, `PLS`, `LLI`, `BRS`, `PSLA`) ;
- nombre ;
- surface moyenne.

Pour les commerces et locaux :

- libellé (`Local 1`, `LCR`, commerce, etc.) ;
- nombre ;
- surface moyenne.

Les anciennes lignes de `operation_typologies` sont migrées sans perte vers ce modèle.

### 7.3 Totaux

Les éléments suivants sont calculés depuis les lignes et deviennent non ressaisissables :

- total général ;
- total collectif ;
- total individuel ;
- total commerce/local ;
- totaux PLUS, PLAI, PLS, LLI, BRS et PSLA.

Les anciennes cases fixes « Étudiants » et « Spécifiques » disparaissent de l’interface. Ces réalités sont représentées par une section ou une nature personnalisée.

## 8. Planning et jalons

### 8.1 Présentation

Le planning est regroupé en cartes thématiques :

1. comités et passations ;
2. agréments ;
3. permis et appel d’offres ;
4. foncier, CPR et acte ;
5. travaux ;
6. préparation de livraison ;
7. livraison et réserves ;
8. mise en gestion, GPA et H2.

Chaque jalon saisissable présente côte à côte :

- date prévisionnelle ;
- date réelle ;
- écart calculé en jours.

Les jalons calculés affichent leur règle en langage clair, sans mettre en avant les références Excel A à CG. Le code Excel reste visible en information secondaire pour le contrôle.

### 8.2 Valeurs proposées

Faute de liste finale remise par les clients, les jalons prévisionnels par défaut sont :

- dépôt des agréments ;
- dépôt du permis ;
- obtention/arrêté du permis ;
- appel d’offres ;
- signature CPR ou compromis ;
- acte VEFA ou acquisition du terrain ;
- ordre de service travaux ;
- M-8 ;
- M-7 ;
- M-4 ;
- logement témoin ;
- livraison ;
- mise en gestion ;
- levée des réserves ;
- fin de GPA ;
- H2.

Les colonnes et formules historiques de la note initiale restent compatibles.

### 8.3 Règles MOD et VEFA

- En MOD, les dates d’OS prévisionnelle et réelle sont disponibles.
- En VEFA, les champs d’OS manuel sont sans objet et ne sont pas modifiables.
- En VEFA, l’acte sert de référence lorsque le métier l’assimile à l’OS.
- Les champs sans objet sont masqués, avec une explication concise, plutôt que laissés vides au milieu du formulaire.
- La livraison contractuelle et les jalons dérivés suivent les règles A à CG déjà documentées.

### 8.4 Retards

Pour chaque couple prévisionnel/réel :

- une valeur positive indique un retard ;
- une valeur négative indique une avance ;
- zéro indique une réalisation à la date prévue.

La livraison conserve en plus :

- retard brut ;
- retard justifié saisi par une personne autorisée ;
- retard effectif ;
- date limite autorisée ;
- statut délai respecté/retard ;
- pénalité.

Les états utilisent du texte et une couleur accessible. Le vert prévisionnel/réel est nuancé sans contraste agressif.

## 9. Alertes et Outlook

### 9.1 Alertes internes

Les rappels par défaut sont générés à J-30 et J-15 pour :

- dépôt des agréments ;
- dépôt du permis ;
- appel d’offres ;
- signature CPR/compromis ;
- OS travaux ;
- livraison ;
- mise en gestion.

Une échéance dépassée non réalisée est marquée en retard.

Le tableau de bord affiche :

- échéances dans les 30 jours ;
- échéances dans les 15 jours ;
- échéances dépassées ;
- lien direct vers l’opération.

### 9.2 Outlook

Un bouton permet :

- d’ajouter une échéance à Outlook ;
- ou d’exporter les échéances filtrées.

Le fichier ICS contient deux alarmes, à 30 et 15 jours. Aucune connexion au tenant Microsoft et aucun envoi automatique ne sont nécessaires.

## 10. Calendriers

Les vues métier sont :

- conditions suspensives ;
- programme et autorisations ;
- travaux ;
- livraisons ;
- mises en gestion ;
- agenda libre.

Toutes les dates pertinentes, y compris celles antérieures aux jalons BA à CG, alimentent le calendrier.

Chaque vue accepte, lorsque les données existent :

- opération ;
- CTX ;
- COP ;
- département ;
- promoteur ;
- stade ;
- mode MOD/VEFA ;
- nature du programme ;
- type de jalon ;
- période.

Les sélections sont multiples. Le filtre opération est disponible dans toutes les vues.

Les exports PDF, Excel et ICS respectent la vue, la période et les filtres actifs.

## 11. Observations privées et workflow

### 11.1 Attribution et visibilité

Le réalisateur est un utilisateur MonPetitPro identifié par son UUID.

Un utilisateur standard :

- voit seulement les observations qui lui sont affectées ;
- crée une observation obligatoirement affectée à lui-même ;
- ne peut pas choisir un autre réalisateur.

Un rôle possédant « voir toutes les observations » voit l’ensemble des observations. Un rôle possédant « affecter/réaffecter » peut choisir un utilisateur actif.

Après réaffectation, l’ancien réalisateur ne voit plus l’observation sauf s’il possède la vue globale. Le journal d’audit conserve l’historique.

### 11.2 Champs modifiables

Par défaut, un conducteur peut :

- choisir l’opération ;
- saisir la date d’information ;
- saisir la description ;
- choisir une date butoir ;
- proposer une date de résolution.

Il ne peut pas :

- modifier le réalisateur ;
- renseigner la réalisation réelle ;
- changer le statut final ;
- valider la résolution ;
- voir ou modifier l’indicateur DG.

Les champs visibles mais interdits sont grisés. L’information DG est entièrement absente du DOM et des réponses SQL pour un utilisateur sans permission.

### 11.3 Exports

Les observations disposent :

- d’un filtre `DG uniquement` visible aux personnes autorisées ;
- d’un export DG dédié ;
- d’un sélecteur de colonnes fiable ;
- des exports PDF et Excel fondés sur les mêmes lignes filtrées que l’écran.

Le choix d’une colonne modifie réellement l’export. Le dernier choix peut être mémorisé localement par utilisateur.

## 12. Budget et financements

### 12.1 Matrice par opération

Le budget est saisi sous forme de matrice :

- famille : `LLS`, `LLI`, `logements gérés` ;
- mode : `MOD`, `VEFA` ;
- phase : `prévisionnel`, `final` ;
- montant : `HT`, `TTC`, `fonds propres`.

Les lignes inutiles peuvent rester vides. Les totaux sont calculés par famille, mode, phase et globalement.

Les anciens budgets initial et final sont conservés comme totaux historiques et migrés dans une ligne générale lorsqu’aucune ventilation n’existe.

### 12.2 Subventions

Chaque subvention contient :

- organisme ;
- objet ;
- montant prévisionnel ;
- montant obtenu/final ;
- commentaire facultatif.

Les anciens montants sont conservés comme montants prévisionnels lorsque la distinction n’existait pas.

### 12.3 Restitution

Les statistiques budgétaires peuvent être rattachées :

- à l’année d’OS ;
- à l’année de livraison ;
- à une ou plusieurs années.

Chaque total permet d’ouvrir la liste des opérations le composant. Les exports reprennent la synthèse et le détail.

## 13. Objectifs

Une opération peut posséder plusieurs rattachements d’objectif :

- type `OS travaux` ;
- type `mise en gestion` ;
- année ;
- catégorie `initial` ou `complémentaire`.

Le type proposé répond à l’ambiguïté de la réunion et reste assez souple pour n’utiliser qu’un seul suivi.

Lors du passage en objectif initial, la date et le nombre de logements sont figés. Les modifications ultérieures de l’opération ne modifient pas cette référence.

Un objectif complémentaire :

- est affiché séparément ;
- contribue à l’atterrissage ;
- ne modifie jamais le chiffre initial présenté à la direction.

Les vues distinguent :

- objectif initial ;
- complément ;
- réalisé parmi les objectifs ;
- réalisé hors objectif.

Une même opération n’est jamais comptée deux fois dans une même restitution.

Pour la mise en gestion, les logements-mois gagnés ou perdus sont calculés par différence de mois entre date objectif et date réelle, multipliée par le nombre de logements figé.

## 14. Statistiques

Les restitutions comprennent :

- livraisons prévisionnelles et réelles par mois ;
- OS prévisionnels et réels par mois ;
- budgets par année d’OS ou de livraison ;
- objectifs initiaux, compléments et atterrissage ;
- statistiques promoteur ;
- statistiques CTX.

Les statistiques promoteur et CTX incluent :

- nombre d’opérations livrées ;
- nombre de logements livrés ;
- collectif et individuel ;
- nombre de réserves ;
- réserves par logement ;
- délai moyen de levée des réserves ;
- nombre moyen de GPA par opération ;
- GPA de l’année précédente lorsque nécessaire.

Chaque graphique ou total possède une action « Voir le détail ». Le détail utilise les mêmes critères que le chiffre affiché et peut être imprimé ou exporté.

Les années peuvent être sélectionnées seules ou en combinaison lorsque le calcul le permet.

## 15. Synthèse et revue documentaire

### 15.1 Fiche de synthèse

La fiche PDF suit le modèle transmis :

1. données principales du programme ;
2. financements et subventions ;
3. travaux supplémentaires significatifs ;
4. enjeux et description ;
5. planning prévisionnel ;
6. illustrations.

Elle contient notamment :

- répartition collectif/individuel/local ;
- typologies ;
- financements ;
- coût global HT ;
- prix au m² SHAB ;
- détail et total des subventions ;
- détail et total des travaux significatifs ;
- réglementation thermique et certifications ;
- permis, OS et livraisons ;
- plans et photos légendés.

Les champs manquants sont clairement indiqués à l’écran avant génération. Le PDF reste générable avec les données disponibles.

### 15.2 Travaux significatifs

Les travaux significatifs deviennent des lignes structurées :

- libellé ;
- montant HT ;
- commentaire.

Le total est automatique et alimente la synthèse.

### 15.3 Revue documentaire

La liste de pièces reprend la feuille `REVUE DOC LIV`. Les dates prévisionnelles sont calculées depuis la date de référence et le décalage de chaque catégorie. Les dates de réception restent saisissables par les rôles autorisés.

## 16. Exports communs

Un registre partagé définit les colonnes exportables, leurs libellés, leur format et la permission nécessaire.

Les exports :

- utilisent exactement les données filtrées ;
- respectent l’ordre et les colonnes sélectionnées ;
- formatent les dates et montants ;
- différencient prévisionnel et réel ;
- ne divulguent jamais un champ sans permission ;
- proposent PDF et Excel lorsque le format est pertinent.

Les exports volumineux restent lisibles en orientation et format adaptés.

## 17. Compatibilité et migration

Les migrations doivent :

- conserver tous les identifiants d’opération ;
- rattacher les observations existantes à un utilisateur lorsque la correspondance est certaine ;
- placer les observations sans correspondance dans une file d’affectation réservée aux administrateurs ;
- migrer les typologies existantes vers les nouvelles lignes de programme ;
- migrer les budgets historiques vers une ligne générale ;
- migrer l’objectif existant vers un objectif `mise en gestion / initial` ;
- conserver les anciennes colonnes tant que les écrans et exports de compatibilité en dépendent ;
- journaliser les nombres de lignes migrées ;
- échouer si les contrôles de comptage ne correspondent pas.

Les données de démonstration déjà transférées au compte propriétaire ne sont pas recréées ni dupliquées.

## 18. Gestion des erreurs

- Une erreur d’enregistrement indique la section et le champ concernés.
- Les erreurs de permission sont traduites en message métier.
- Une référence désactivée déjà utilisée reste affichée avec la mention « inactive ».
- Un export impossible n’efface aucun filtre.
- Un fichier image incompatible n’empêche pas la génération du reste de la synthèse.
- Une observation sans affectation après migration est invisible aux conducteurs et visible dans la file administrative.

## 19. Validation et preuves attendues

La réalisation n’est considérée complète qu’avec :

- tests unitaires des calculs de dates, retards, objectifs, budgets et statistiques ;
- tests des migrations et des contrôles de comptage ;
- tests RLS avec un administrateur, un responsable, une assistante, deux conducteurs et un lecteur ;
- preuve qu’un conducteur ne peut ni lire ni modifier l’observation d’un autre ;
- preuve qu’un utilisateur sans droit DG ne reçoit aucune donnée DG ;
- test de première connexion et changement obligatoire de mot de passe ;
- test des permissions de champs par appel direct à Supabase ;
- tests des filtres et exports ;
- validation d’un fichier ICS dans Outlook ;
- génération et inspection d’une fiche de synthèse avec photos ;
- tests navigateur des parcours principaux sur ordinateur et écran étroit ;
- build, lint et suite de tests complète sans erreur.

## 20. Ordre de réalisation

1. Schéma cible, migration et référentiels.
2. Première connexion, administration et permissions fines.
3. Observations privées et workflow.
4. Identité, programme flexible et totaux.
5. Planning, retards, alertes, calendrier et ICS.
6. Budget et subventions.
7. Objectifs et statistiques.
8. Synthèse, revue documentaire et exports communs.
9. Migration réelle, tests de sécurité et validation visuelle.

Cet ordre sécurise d’abord les données et les accès, puis construit les écrans métier sur des fondations stables.
