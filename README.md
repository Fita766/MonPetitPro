# MonPetitPro — suivi des opérations immobilières

MonPetitPro centralise le pilotage DMO des opérations : programme, équipe, budget, jalons, livraisons, mise en gestion, observations, objectifs annuels et documents.

## Fonctions principales

- fiche opération structurée selon le tableau de bord métier, avec calculs de dates sécurisés ;
- tableau global filtrable sur plusieurs critères et exportable en PDF ou Excel ;
- observations avec auteur, responsable, échéance, résolution, validation et indicateur DG ;
- calendriers des conditions suspensives, livraisons, mises en gestion, dates clés et agenda libre ;
- objectifs DMO annuels figés, suivi mensuel et calcul des gains/pertes ;
- statistiques promoteurs, CTX, livraisons, budget et observations ;
- revue documentaire calculée depuis l’OS travaux, la livraison et la DAACT ;
- fiche de synthèse PDF avec plans et photos stockés dans un espace privé ;
- rôles `administrateur`, `responsable`, `contributeur` et `lecteur`, avec historique des modifications.

L’import du classeur de référence n’est volontairement **pas proposé** : il sert à définir les écrans et les règles, mais n’est jamais injecté dans la base. Cela évite les doublons avec les opérations déjà saisies.

## Installation

```bash
npm install
```

Créer `.env.local` :

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-cle-anonyme
```

Appliquer la migration [`supabase/migrations/202607200001_dmo_extension.sql`](supabase/migrations/202607200001_dmo_extension.sql) dans Supabase, puis promouvoir une première fois le compte administrateur :

```sql
update public.profiles
set role = 'admin'
where email = 'votre-adresse@example.com';
```

La migration est additive et rejouable : elle conserve les opérations et observations existantes, crée les tables manquantes, reprend les comptes Auth existants et active les politiques de sécurité.

## Commandes

```bash
npm run dev      # serveur de développement
npm test -- --run
npm run lint
npm run build
```

## Déploiement et données

- Exécuter la migration avant de déployer cette version du frontend.
- Le bucket Supabase `operation-documents` est privé ; l’application utilise des liens temporaires.
- Ne jamais commiter `.env.local` ni le dossier local `dossiers modifs/`.
- Avant mise en production, suivre la [check-list de recette](docs/acceptance-checklist.md).

Stack : React 19, TypeScript, Vite, Tailwind CSS, Supabase, Zustand, Vitest, jsPDF et ExcelJS.
