# Recette fonctionnelle MonPetitPro

## Préparation

- [ ] Sauvegarder la base Supabase.
- [ ] Appliquer `202607200001_dmo_extension.sql` sans erreur.
- [ ] Vérifier que les opérations et observations antérieures sont toujours présentes.
- [ ] Désigner le premier administrateur, puis attribuer les autres rôles depuis l’application.

## Opérations

- [ ] Créer puis modifier une opération MOD, VEFA et CR.
- [ ] Vérifier les champs équipe, localisation, programme, typologies, budget et subventions.
- [ ] Vérifier le calcul des dates M8, M7, M4, livraison, MEG, M3, M10, GPA et H2.
- [ ] Vérifier les neuf couleurs de stades, de 0 à 6.
- [ ] Filtrer le tableau sur plusieurs valeurs, changer les colonnes et exporter en PDF/Excel.

## Observations et droits

- [ ] Un contributeur peut créer et mettre à jour une observation.
- [ ] Un responsable peut valider une résolution et supprimer selon les règles prévues.
- [ ] Un lecteur ne peut rien modifier.
- [ ] Les filtres CTX, COP, promoteur, type, réalisateur, DG et statut se combinent.
- [ ] L’administrateur voit l’action dans l’historique.

## Calendriers, objectifs et statistiques

- [ ] Les calendriers privilégient les dates réelles, puis prévisionnelles, puis contractuelles.
- [ ] Un événement libre peut être ajouté à l’agenda.
- [ ] L’objectif annuel reste figé après sa création et le gain/perte est cohérent.
- [ ] Les statistiques promoteur, CTX, livraison, budget et observations correspondent aux données.
- [ ] Les exports PDF et Excel s’ouvrent correctement.

## Documents

- [ ] Initialiser une revue documentaire et contrôler plusieurs échéances calculées.
- [ ] Saisir une date de réception et la retrouver après rechargement.
- [ ] Ajouter un plan et une photo ; vérifier qu’ils ne sont pas publiquement accessibles.
- [ ] Générer une fiche de synthèse PDF avec les informations, typologies, budgets et images.

## Affichage et non-régression

- [ ] Tester ordinateur, tablette et téléphone ; la navigation doit rester accessible.
- [ ] Vérifier clavier, libellés de formulaires, contrastes et messages d’erreur.
- [ ] Exécuter `npm test -- --run`, `npm run lint` et `npm run build`.
- [ ] Confirmer qu’aucun import Excel n’est proposé et qu’aucun doublon n’a été créé.
