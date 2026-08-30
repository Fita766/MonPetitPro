-- Le champ « CTX concerné » devient « Responsable » : la personne désignée pour
-- réaliser la tâche. La colonne observations.ctx est renommée responsable.
-- Garde-fou : ne renomme que si l'ancienne colonne existe et que la nouvelle n'existe pas.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'observations' and column_name = 'ctx'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'observations' and column_name = 'responsable'
  ) then
    alter table public.observations rename column ctx to responsable;
  end if;
end $$;

drop index if exists observations_ctx_idx;
create index if not exists observations_responsable_idx
  on public.observations(responsable) where responsable is not null;
