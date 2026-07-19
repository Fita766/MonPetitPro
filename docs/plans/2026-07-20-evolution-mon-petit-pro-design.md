# Évolution MonPetitPro — Design

## Objectif

Faire évoluer l'application existante pour qu'elle remplace progressivement le tableau de suivi DMO, sans importer automatiquement les classeurs et sans casser les opérations déjà enregistrées.

## Périmètre retenu

Le document « NOTE MAJ MON PETIT PRO » et les feuilles du classeur « TBX SUIVI DMO actuel » définissent les besoins. La fin de transcription relative à Fontainebleau et Ecoverde concerne une autre application et est exclue.

Les classeurs servent de référence pour les champs, listes, calculs et restitutions. Aucun import de données n'est prévu dans cette version afin d'éviter les doublons avec les opérations déjà présentes dans Supabase.

## Architecture des données

La table `operations` est étendue de façon additive. Les champs existants sont conservés pour préserver la compatibilité avec les données en production.

Une opération regroupe :

- identité : stade, numéros OF et Gesprojet, département, commune, adresse ;
- intervenants : COP, CTX, assistante, gestionnaire et promoteur ;
- programme : type MOD/VEFA/CR-démolition, logements, typologies et surfaces ;
- caractéristiques : certifications, réglementation thermique, labels et critères Clesence 2030 ;
- planning : jalons correspondant aux colonnes BA à CG du tableau de bord ;
- finances : budgets, subventions et indicateurs calculés ;
- pilotage : inclusion dans les objectifs DMO et année associée ;
- synthèse : enjeux, travaux significatifs, plan et photographies facultatives.

Les collections répétables sont normalisées dans des tables liées :

- `operation_typologies` pour les nombres et surfaces moyennes par typologie et financement ;
- `operation_subsidies` pour l'organisme, l'objet et le montant ;
- `suspensive_conditions` pour l'objet, la date butoir et la date de réalisation ;
- `operation_documents` pour le plan et les photos de synthèse ;
- `document_review_items` pour la revue documentaire et ses dates prévisionnelles/réelles.

Les profils et permissions sont portés par une table `profiles`. Quatre niveaux sont retenus : administrateur, responsable, contributeur et lecteur. L'administrateur désigne les responsables depuis l'application.

Une table d'audit conserve l'auteur, la date, l'objet modifié ainsi que les valeurs avant et après. Les règles RLS appliquent les droits côté Supabase et pas seulement dans l'interface.

## Interface

La fiche opération est organisée en onglets : Général, Programme, Planning, Budget et subventions, Conditions suspensives, Objectifs DMO et Synthèse. Les champs calculés sont identifiés visuellement et accompagnés de leur règle de calcul.

Le tableau principal affiche dans cet ordre le stade, le nom complet de l'opération puis les informations synthétiques existantes. Le bandeau suit la palette extraite du document Word :

- stade 0 : `#FFF2CC` ;
- stade 0 bis : `#F2DAF1` ;
- stade 1 : `#F2F2F2` ;
- stade 1 bis : `#BDD7EE` ;
- stade 2 : `#FBE4D5` ;
- stade 3 : `#E2EFDA` ;
- stade 4 : `#9BC2E6` ;
- stade 5 : `#EC9288` ;
- stade 6 : `#A5A5A5`.

Les listes acceptent des filtres multiples sur le stade, le département, la commune, le COP, le CTX, le promoteur, le type, les labels et les dates. L'utilisateur choisit également les colonnes visibles et exportées.

## Observations et permissions

L'auteur d'une observation est déduit du profil connecté et ses initiales sont enregistrées automatiquement. Un contributeur peut ajouter une observation et renseigner une date de résolution. Un responsable ou administrateur peut valider cette résolution et supprimer une observation.

Le marqueur DG est disponible dans le formulaire, les filtres et les exports sans surcharger la lecture quotidienne. Les autres champs d'observation existants sont conservés.

## Calendriers

Quatre vues sont prévues :

- conditions suspensives, par COP ou opération ;
- livraisons, par CTX, départements et promoteurs ;
- mises en gestion, par CTX et départements ;
- dates clés, regroupant les jalons BA à CG par opération.

Les filtres acceptent plusieurs valeurs. Pour une livraison, l'application présente la date réelle lorsqu'elle existe, sinon la prévision révisée, sinon la date contractuelle. Pour la mise en gestion, la date réelle est prioritaire sur la date prévisionnelle. Le prévisionnel et le réel ont des couleurs distinctes. Chaque vue est exportable pour une année choisie.

## Objectifs et statistiques

La vue Objectifs DMO reprend l'esprit des feuilles `GLOB 2026` et `STAT MEG` : opérations marquées pour l'année choisie, suivi de janvier à décembre, mois réalisés en vert, calcul des logements gagnés ou perdus, objectif initial immuable et vue « Objectif + réel » sans doublon.

Les statistiques couvrent les livraisons, les mises en gestion, les résultats par promoteur et année, les logements et opérations livrés par CTX, les réserves totales et par logement, le délai moyen de levée et la GPA moyenne basée sur l'année de livraison précédente. Des vues budget et suivi de livraison reprennent les feuilles de référence.

Les calculs métier sont centralisés dans des fonctions testables. Une donnée absente reste absente et n'est pas assimilée à zéro dans les moyennes.

## Documents générés

La fiche de synthèse est générée en PDF à partir de l'opération. Elle contient les données principales, typologies, financements, subventions, travaux significatifs, description, planning, plan et photos facultatifs.

La revue documentaire est gérée par opération. Ses échéances prévisionnelles sont calculées depuis les jalons de l'opération ; les dates de remise réelles sont saisissables.

## Erreurs, migration et sécurité

La migration SQL est rejouable et additive. L'application détecte un schéma distant non migré et affiche une instruction exploitable. Les suppressions sensibles demandent confirmation. Les documents sont stockés dans un bucket Supabase privé.

## Vérification

La couverture attendue comprend les calculs de dates, les objectifs, les permissions, les filtres multiples et les exports. La livraison est également vérifiée par lint, compilation de production et parcours navigateur avec contrôle de la console.
