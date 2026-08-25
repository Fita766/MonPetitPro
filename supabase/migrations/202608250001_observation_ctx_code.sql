-- Correction : le CTX d'une observation est un CODE du référentiel CTX (réference_values kind='ctx'),
-- pas un identifiant de compte utilisateur. La colonne ctx_user_id (uuid) ajoutée par erreur dans
-- 202608240001 est remplacée par ctx (texte = code du référentiel, ex. 'EB', 'AC').
-- Additive puis retrait de la colonne erronée (fraîche, aucun usage légitime en base).

alter table public.observations
  add column if not exists ctx text;

drop index if exists observations_ctx_user_idx;
alter table public.observations
  drop column if exists ctx_user_id;

create index if not exists observations_ctx_idx on public.observations(ctx) where ctx is not null;
