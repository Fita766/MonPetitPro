-- Complément des retours utilisateurs du 17 août 2026 (A1-A7, tâche 16, #5, #12).
-- Migration additive et idempotente : elle s'applique sur la base créée par la
-- migration 202607300001 (version juillet) sans la relancer. Elle ne supprime
-- ni ne renomme aucune donnée.

begin;

-- ---------------------------------------------------------------
-- 1. Colonnes opérations : SO (CSI/CA + LLI), Terrain, comptes COP/CTX,
--    date prévisionnelle « Signature de l'acte ».
-- ---------------------------------------------------------------
alter table public.operations
  add column if not exists so_csi_ca boolean not null default false,
  add column if not exists so_lli_approval boolean not null default false,
  add column if not exists terrain boolean not null default false,
  add column if not exists cop_user_id uuid references auth.users(id),
  add column if not exists ctx_user_id uuid references auth.users(id),
  add column if not exists vefa_deed_expected_date date;

create index if not exists operations_cop_user_idx on public.operations(cop_user_id);
create index if not exists operations_ctx_user_idx on public.operations(ctx_user_id);

-- ---------------------------------------------------------------
-- 2. Permissions de champ : ajoutées dans permission_definitions pour que le
--    trigger enforce_operation_field_permissions les applique en base.
-- ---------------------------------------------------------------
insert into public.permission_definitions(key, group_key, label, description, sort_order) values
  ('operations.field.so_csi_ca.edit', 'operation_fields_planning', 'Modifier « SO CSI / CA »', 'Autorise uniquement la modification de ce champ.', 1040),
  ('operations.field.so_lli_approval.edit', 'operation_fields_planning', 'Modifier « SO agrément LLI »', 'Autorise uniquement la modification de ce champ.', 1041),
  ('operations.field.vefa_deed_expected_date.edit', 'operation_fields_planning', 'Modifier « Signature de l''acte prévisionnelle »', 'Autorise uniquement la modification de ce champ.', 1042),
  ('operations.field.terrain.edit', 'operation_fields_program', 'Modifier « Terrain »', 'Autorise uniquement la modification de ce champ.', 1043),
  ('operations.field.cop_user_id.edit', 'operation_fields_team', 'Modifier « COP (compte) »', 'Autorise uniquement la modification de ce champ.', 1044),
  ('operations.field.ctx_user_id.edit', 'operation_fields_team', 'Modifier « CTX (compte) »', 'Autorise uniquement la modification de ce champ.', 1045)
on conflict (key) do update set
  group_key = excluded.group_key,
  label = excluded.label,
  description = excluded.description,
  sort_order = excluded.sort_order;

-- ---------------------------------------------------------------
-- 3. Permissions fonctionnelles ajoutées en août : calendrier par équipe
--    (calendar.view_all) et import admin (operations.import).
-- ---------------------------------------------------------------
insert into public.permission_definitions(key, group_key, label, description, sort_order) values
  ('calendar.view_all','calendar','Voir tous les calendriers','Voir les jalons et agendas de toutes les opérations, sans restriction d''équipe',405),
  ('operations.import','operations','Importer des opérations (Excel)','Créer de nouvelles opérations depuis un classeur, après aperçu, sans jamais écraser l''existant',130)
on conflict (key) do update set
  group_key = excluded.group_key,
  label = excluded.label,
  description = excluded.description,
  sort_order = excluded.sort_order;

-- ---------------------------------------------------------------
-- 4. Rattachements de permissions (rôles système + rôles granulaire).
-- ---------------------------------------------------------------
alter table public.custom_role_permissions disable trigger protect_system_role_permissions;

insert into public.custom_role_permissions(role_id, permission_key) values
  ('10000000-0000-0000-0000-000000000001', 'calendar.view_all'),
  ('10000000-0000-0000-0000-000000000002', 'calendar.view_all'),
  ('10000000-0000-0000-0000-000000000001', 'operations.import')
on conflict do nothing;

-- Rôles détenant les permissions « de groupe » récupèrent les permissions de
-- champ des nouvelles colonnes (cohérent avec le seed granulaire de juillet).
insert into public.custom_role_permissions(role_id, permission_key)
select existing.role_id, 'operations.field.' || new_field.field || '.edit'
from public.custom_role_permissions existing
join (values
  ('operations.edit_planning', 'so_csi_ca'),
  ('operations.edit_planning', 'so_lli_approval'),
  ('operations.edit_planning', 'vefa_deed_expected_date'),
  ('operations.edit_program', 'terrain'),
  ('operations.edit_team', 'cop_user_id'),
  ('operations.edit_team', 'ctx_user_id')
) as new_field(legacy_permission, field)
  on existing.permission_key = new_field.legacy_permission
on conflict do nothing;

alter table public.custom_role_permissions enable trigger protect_system_role_permissions;

-- ---------------------------------------------------------------
-- 5. Fonction list_active_profiles (sélecteurs COP/CTX par compte).
-- ---------------------------------------------------------------
create or replace function public.list_active_profiles()
returns table(
  id uuid,
  display_name text,
  initials text
)
language sql stable security definer set search_path = '' as $$
  select p.id, p.display_name, p.initials
  from public.profiles p
  where p.status = 'active'
    and public.has_any_permission(array[
      'operations.create',
      'operations.edit_team',
      'operations.field.project_manager.edit',
      'operations.field.operations_manager.edit'
    ])
  order by lower(coalesce(p.display_name, '')) asc, p.display_name asc nulls last
$$;
revoke all on function public.list_active_profiles() from public, anon;
grant execute on function public.list_active_profiles() to authenticated;

-- ---------------------------------------------------------------
-- 6. Calendrier scopé par équipe : fonction security definer
--    public.calendar_operations() retournant les opérations visibles
--    (toutes si calendar.view_all, sinon celles dont l'utilisateur est
--    COP ou CTX). La RLS sur les vues n'est pas disponible sur l'instance
--    Supabase (ALTER ... ENABLE ROW LEVEL SECURITY refusé sur les vues) ;
--    cette fonction est le backstop universel, cohérent avec
--    list_active_profiles. La coupure COP/CTX à l'OS reste côté client
--    (elle dépend de la date de chaque jalon).
-- ---------------------------------------------------------------
create or replace function public.calendar_operations()
returns setof public.operations
language sql stable security definer set search_path = '' as $$
  select *
  from public.operations
  where public.has_permission('calendar.view_all')
     or cop_user_id = (select auth.uid())
     or ctx_user_id = (select auth.uid())
  order by name
$$;
revoke all on function public.calendar_operations() from public, anon;
grant execute on function public.calendar_operations() to authenticated;

-- ---------------------------------------------------------------
-- 7. Référentiel « Catégories » : élargissement du contrôle kind + amorçage
--    depuis les valeurs distinctes déjà présentes dans les opérations.
-- ---------------------------------------------------------------
alter table public.reference_values drop constraint if exists reference_values_check;
alter table public.reference_values drop constraint if exists reference_values_kind_check;
alter table public.reference_values add constraint reference_values_kind_check check (kind in (
  'ctx', 'cop', 'assistant', 'gpa_assistant', 'manager',
  'animation_provider', 'promoter', 'certification',
  'thermal_regulation', 'program_nature', 'category'
));

insert into public.reference_values (kind, label, sort_order)
select 'category', btrim(operation.category),
       row_number() over (order by lower(btrim(operation.category)))
from (
  select distinct btrim(o.category) as category
  from public.operations o
  where nullif(btrim(o.category), '') is not null
) as operation
on conflict (kind, normalized_label) do nothing;

commit;
