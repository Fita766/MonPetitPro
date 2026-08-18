-- Backfill des liens COP/CTX vers les comptes utilisateurs (retour #11).
-- Associe operations.cop_user_id / ctx_user_id depuis les valeurs texte
-- historiques (operations.operations_manager / project_manager, souvent des
-- initiales) vers le compte actif dont le nom affiché OU les initiales
-- correspondent, uniquement lorsqu'il y a une correspondance EXACTE et
-- UNIQUE (insensible à la casse/espaces).
-- Idempotent : ne remplit que les lignes encore NULL (ne modifie jamais un
-- lien déjà posé, ni une valeur sans correspondance unique).

begin;

update public.operations op
set cop_user_id = u.id
from (
  select names.operation_id, (max(p.id::text))::uuid as id
  from (
    select id as operation_id, lower(btrim(operations_manager)) as name
    from public.operations
    where nullif(btrim(operations_manager), '') is not null
  ) names
  join (
    select distinct id, name
    from (
      select p.id, lower(btrim(p.display_name)) as name
      from public.profiles p
      where p.status = 'active' and nullif(btrim(p.display_name), '') is not null
      union all
      select p.id, lower(btrim(p.initials)) as name
      from public.profiles p
      where p.status = 'active' and nullif(btrim(p.initials), '') is not null
    ) prof_names
  ) p on p.name = names.name
  group by names.operation_id
  having count(*) = 1
) u
where op.id = u.operation_id
  and op.cop_user_id is null;

update public.operations op
set ctx_user_id = u.id
from (
  select names.operation_id, (max(p.id::text))::uuid as id
  from (
    select id as operation_id, lower(btrim(project_manager)) as name
    from public.operations
    where nullif(btrim(project_manager), '') is not null
  ) names
  join (
    select distinct id, name
    from (
      select p.id, lower(btrim(p.display_name)) as name
      from public.profiles p
      where p.status = 'active' and nullif(btrim(p.display_name), '') is not null
      union all
      select p.id, lower(btrim(p.initials)) as name
      from public.profiles p
      where p.status = 'active' and nullif(btrim(p.initials), '') is not null
    ) prof_names
  ) p on p.name = names.name
  group by names.operation_id
  having count(*) = 1
) u
where op.id = u.operation_id
  and op.ctx_user_id is null;

commit;
