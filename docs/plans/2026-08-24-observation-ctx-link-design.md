# Lier une observation à un CTX (profil) — Design

**Date** : 2026-08-24
**Statut** : Validé

## Objectif

Permettre d'associer une observation au **CTX (profil utilisateur)** concerné, indépendamment de l'opération liée. Aujourd'hui le « CTX » d'une observation est hérité de l'opération (`operation.project_manager` affiché via `operations.operations_manager` / `project_manager` — plus précisément le CTX provient de `operation.project_manager`). L'utilisateur ne peut pas désigner un CTX précis quand le point concerne une autre personne que le CTX de l'opération.

## Rappel du modèle actuel

- `observations` : liée à **une opération obligatoire** (`operation_id`), + `assignee_user_id` (la personne **responsable de la résolution** — sémantique distincte).
- `operations` : possède déjà des **liens profils** `cop_user_id` / `ctx_user_id` → `profiles(id)`, utilisés pour le périmètre du calendrier. Ce pattern fait autorité pour le périmètre ; la colonne texte (`project_manager` / `operations_manager`) reste la source d'affichage historique.
- Le formulaire d'observation (`ObservationForm`) sélectionne une opération ; le CTX n'est pas sélectionnable.

## Décisions validées

1. **Opération obligatoire + CTX optionnel** : on garde `operation_id` requis, on ajoute un CTX concerné facultatif.
2. **Lien profil** (`ctx_user_id` → `profiles.id`), même pattern que les opérations — pas de texte libre.
3. **Filtre CTX basé sur le lien profil** (`ctx_user_id`), en remplacement du filtrage textuel hérité.
4. **Pré-remplissage automatique** depuis l'opération sélectionnée : `operation.ctx_user_id` s'il existe, sinon repli sur `operation.project_manager` (nom) recherché dans les profils actifs ; modifiable ensuite.

## Approche retenue

### 1. Modèle de données (migration SQL additive)

Ajouter sur `public.observations` :

```sql
alter table public.observations
  add column if not exists ctx_user_id uuid references public.profiles(id) on delete set null;
create index if not exists observations_ctx_user_idx on public.observations(ctx_user_id);
```

- `nullable`, `on delete set null` : si le profil est supprimé, le lien se neutralise (pas d'erreur FK, pas de suppression en cascade de l'observation).
- Migration additive, idempotente, au même format que les migrations existantes.

### 2. Formulaire (`ObservationForm`, `Observations.tsx`)

- **Nouveau champ « CTX concerné »** : `ReferenceSelect` (recherche de profil), optionnel, même apparence que le sélecteur d'équipe des opérations.
- **Pré-remplissage** : quand l'utilisateur choisit une opération, si le formulaire est en création et que `ctx_user_id` n'a pas été touché manuellement, on pré-remplit :
  - `operation.ctx_user_id` si renseigné ;
  - sinon on cherche un profil actif dont le `display_name`/`initials` correspond à `operation.project_manager` (repli texte hérité).
- **Permissions** : champ éditable selon la même règle que `operation_id` (contenu : `observations.create` / `edit_assigned` / `edit_all`). Pas de permission-champ dédiée : cohérent avec le formulaire actuel et simple.

### 3. Affichage, filtres, exports (`Observations.tsx`)

- **Vue structurée** : badge « CTX : {label profil} » sur chaque point, via le profil lié (`ctx_user_id` → map vers `displayName`), sinon repli texte sur `operation.project_manager`.
- **Vue tableau** : colonne CTX = profil lié prioritaire, repli texte.
- **Filtre CTX** : basé sur `ctx_user_id`. `ObservationWithOperation.operations` doit remonter `ctx_user_id` (déjà sélectionné dans la requête opérations) ; les options du filtre sont les profils CTX distincts issus des opérations + des observations liées.
- **Exports** : la colonne CTX utilise le profil lié.

### 4. RLS / sécurité

- Aucune nouvelle politique RLS : la visibilité reste gouvernée par `observations.view` (`has_permission('observations.view')` + `is_dg`). Le filtre CTX est un **filtre d'affichage** (comme le CTX hérité aujourd'hui).
- `ctx_user_id` est un simple attribut de l'observation, pas un vector de permission.

### 5. Types & payload

- `ObservationFormData` gagne `ctx_user_id: string`.
- `ObservationRow` / `Observation` gagnent `ctx_user_id?: string | null`.
- `buildObservationPayload` publie `ctx_user_id: form.ctx_user_id || null`.
- `EMPTY_OBSERVATION_FORM` initialise `ctx_user_id: ''`.

## Tests

- Payload : `buildObservationPayload` inclut `ctx_user_id` (null si vide, valeur sinon).
- Pré-remplissage : sélectionner une opération remplit `ctx_user_id` (depuis `operation.ctx_user_id`, et depuis le nom texte en repli).
- Filtre : la liste filtrée respecte le `ctx_user_id` sélectionné.

## Hors périmètre (volontairement)

- Pas de permission-champ dédiée pour `ctx_user_id` (ni `cop_user_id`).
- Pas de changement du périmètre calendrier (déjà piloté par `operations.ctx_user_id`).
- Pas de scoping RLS par CTX sur les observations.

## Déploiement

- Migration SQL additive à appliquer en Supabase (fichier `supabase/migrations/202608240001_observation_ctx_link.sql`).
- Compatible avec l'existant : les observations existantes gardent `ctx_user_id = null` (aucun impact), l'affichage/filtre retombent sur le CTX hérité de l'opération.
