-- Lier une observation au CTX (profil utilisateur auth) concerné, indépendamment de l'opération.
-- Additif et idempotent : les observations existantes gardent ctx_user_id = null.
alter table public.observations
  add column if not exists ctx_user_id uuid references auth.users(id) on delete set null;

create index if not exists observations_ctx_user_idx on public.observations(ctx_user_id);
