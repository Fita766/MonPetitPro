-- Rôles personnalisés, comptes administrables et permissions granulaires.
-- Migration additive : aucune donnée métier n'est supprimée.

do $$ begin
  create type public.profile_status as enum ('pending', 'active', 'suspended');
exception when duplicate_object then null;
end $$;

create table if not exists public.permission_definitions (
  key text primary key,
  group_key text not null,
  label text not null,
  description text not null default '',
  sort_order integer not null default 0
);

create table if not exists public.custom_roles (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  description text,
  color_key text not null default 'teal' check (color_key in ('teal','emerald','green','lime','amber','orange','red','rose','fuchsia','violet','indigo','slate')),
  is_active boolean not null default true,
  is_system boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.custom_role_permissions (
  role_id uuid not null references public.custom_roles(id) on delete cascade,
  permission_key text not null references public.permission_definitions(key) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_key)
);

create table if not exists public.account_data_transfers (
  id uuid primary key default uuid_generate_v4(),
  source_user_id uuid references auth.users(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  source_email text not null,
  target_email text not null,
  operations_count integer not null default 0,
  observations_count integer not null default 0,
  events_count integer not null default 0,
  transferred_by uuid references auth.users(id) on delete set null,
  transferred_at timestamptz not null default now(),
  details jsonb not null default '{}'::jsonb
);

alter table public.profiles
  add column if not exists custom_role_id uuid references public.custom_roles(id) on delete restrict,
  add column if not exists status public.profile_status not null default 'pending',
  add column if not exists is_owner boolean not null default false,
  add column if not exists last_seen_at timestamptz;

create index if not exists profiles_custom_role_id_idx on public.profiles(custom_role_id);
create index if not exists profiles_status_idx on public.profiles(status);
create index if not exists custom_roles_created_by_idx on public.custom_roles(created_by);
create index if not exists custom_role_permissions_role_id_idx on public.custom_role_permissions(role_id);
create index if not exists custom_role_permissions_permission_key_idx on public.custom_role_permissions(permission_key);
create index if not exists account_data_transfers_source_user_id_idx on public.account_data_transfers(source_user_id);
create index if not exists account_data_transfers_target_user_id_idx on public.account_data_transfers(target_user_id);

insert into public.permission_definitions(key, group_key, label, description, sort_order) values
  ('operations.view','operations','Consulter les opérations','Voir le tableau et les fiches opération',10),
  ('operations.create','operations','Créer une opération','Ajouter une opération',20),
  ('operations.edit_identity','operations','Modifier l’identité','Stade, numéros, adresse, type et promoteur',30),
  ('operations.edit_team','operations','Modifier l’équipe','CTX, COP, assistantes et gestionnaire',40),
  ('operations.edit_program','operations','Modifier le programme','Logements, typologies, labels et caractéristiques',50),
  ('operations.edit_planning','operations','Modifier le planning','Dates prévisionnelles, contractuelles et réelles',60),
  ('operations.edit_budget','operations','Modifier les budgets','Budgets, subventions et pénalités',70),
  ('operations.edit_conditions','operations','Modifier les conditions','Conditions suspensives et levées',80),
  ('operations.edit_objectives','operations','Modifier les objectifs','Objectifs annuels',90),
  ('operations.edit_synthesis','operations','Modifier la synthèse','Description et travaux',100),
  ('operations.delete','operations','Supprimer une opération','Supprimer une opération',110),
  ('operations.export','operations','Exporter les opérations','Exports PDF et Excel',120),
  ('observations.view','observations','Consulter les observations','Voir les observations',200),
  ('observations.view_dg','observations','Consulter les observations DG','Voir les points DG',210),
  ('observations.create','observations','Ajouter une observation','Créer un point',220),
  ('observations.edit_own','observations','Modifier ses observations','Modifier ses propres points',230),
  ('observations.edit_all','observations','Modifier toutes les observations','Modifier tous les points',240),
  ('observations.validate','observations','Valider les résolutions','Valider une résolution',250),
  ('observations.delete','observations','Supprimer des observations','Supprimer un point',260),
  ('observations.export','observations','Exporter les observations','Exports PDF et Excel',270),
  ('documents.view','documents','Consulter les documents','Voir revue, plans et photos',300),
  ('documents.upload','documents','Ajouter des documents','Déposer plans et photos',310),
  ('documents.review','documents','Compléter la revue documentaire','Renseigner les réceptions',320),
  ('documents.delete','documents','Supprimer des documents','Retirer plans et photos',330),
  ('calendar.view','calendar','Consulter les calendriers','Voir les agendas',400),
  ('calendar.manage','calendar','Gérer l’agenda libre','Créer et modifier des événements',410),
  ('calendar.export','calendar','Exporter les calendriers','Exports PDF et Excel',420),
  ('objectives.view','objectives','Consulter les objectifs','Voir le suivi DMO',500),
  ('objectives.manage','objectives','Gérer les objectifs','Modifier les objectifs',510),
  ('objectives.export','objectives','Exporter les objectifs','Exports PDF et Excel',520),
  ('statistics.view','objectives','Consulter les statistiques','Voir les indicateurs',530),
  ('statistics.export','objectives','Exporter les statistiques','Exports PDF et Excel',540),
  ('admin.users.view','administration','Consulter les utilisateurs','Voir les comptes',600),
  ('admin.users.manage','administration','Modifier les utilisateurs','Profils et rôles',610),
  ('admin.users.invite','administration','Créer et inviter des utilisateurs','Invitations et mots de passe temporaires',620),
  ('admin.users.suspend','administration','Suspendre des utilisateurs','Bloquer et réactiver',630),
  ('admin.roles.view','administration','Consulter les rôles','Voir les rôles',640),
  ('admin.roles.manage','administration','Créer et modifier les rôles','Gérer les permissions',650),
  ('admin.audit.view','administration','Consulter l’historique','Voir les actions',660),
  ('admin.demo_transfer','administration','Transférer les données démo','Réaffecter les données au propriétaire',670)
on conflict (key) do update set
  group_key = excluded.group_key, label = excluded.label,
  description = excluded.description, sort_order = excluded.sort_order;

insert into public.custom_roles(id, name, description, color_key, is_system) values
  ('10000000-0000-0000-0000-000000000001','Administrateur historique','Compatibilité avec les anciens administrateurs','teal',true),
  ('10000000-0000-0000-0000-000000000002','Responsable historique','Compatibilité avec les anciens responsables','emerald',true),
  ('10000000-0000-0000-0000-000000000003','Contributeur historique','Compatibilité avec les anciens contributeurs','amber',true),
  ('10000000-0000-0000-0000-000000000004','Lecteur historique','Compatibilité avec les anciens lecteurs','slate',true)
on conflict (id) do nothing;

insert into public.custom_role_permissions(role_id, permission_key)
select '10000000-0000-0000-0000-000000000001'::uuid, key from public.permission_definitions
on conflict do nothing;

insert into public.custom_role_permissions(role_id, permission_key)
select '10000000-0000-0000-0000-000000000002'::uuid, key
from public.permission_definitions
where key not like 'admin.%' and key not in ('admin.demo_transfer')
on conflict do nothing;

insert into public.custom_role_permissions(role_id, permission_key) values
  ('10000000-0000-0000-0000-000000000003','operations.view'),
  ('10000000-0000-0000-0000-000000000003','operations.create'),
  ('10000000-0000-0000-0000-000000000003','operations.edit_identity'),
  ('10000000-0000-0000-0000-000000000003','operations.edit_team'),
  ('10000000-0000-0000-0000-000000000003','operations.edit_program'),
  ('10000000-0000-0000-0000-000000000003','operations.edit_planning'),
  ('10000000-0000-0000-0000-000000000003','observations.view'),
  ('10000000-0000-0000-0000-000000000003','observations.create'),
  ('10000000-0000-0000-0000-000000000003','observations.edit_own'),
  ('10000000-0000-0000-0000-000000000003','documents.view'),
  ('10000000-0000-0000-0000-000000000003','calendar.view'),
  ('10000000-0000-0000-0000-000000000003','objectives.view'),
  ('10000000-0000-0000-0000-000000000003','statistics.view'),
  ('10000000-0000-0000-0000-000000000004','operations.view'),
  ('10000000-0000-0000-0000-000000000004','observations.view'),
  ('10000000-0000-0000-0000-000000000004','documents.view'),
  ('10000000-0000-0000-0000-000000000004','calendar.view'),
  ('10000000-0000-0000-0000-000000000004','objectives.view'),
  ('10000000-0000-0000-0000-000000000004','statistics.view')
on conflict do nothing;

update public.profiles set
  custom_role_id = case role::text
    when 'admin' then '10000000-0000-0000-0000-000000000001'::uuid
    when 'responsable' then '10000000-0000-0000-0000-000000000002'::uuid
    when 'contributeur' then '10000000-0000-0000-0000-000000000003'::uuid
    else '10000000-0000-0000-0000-000000000004'::uuid end,
  status = 'active'
where custom_role_id is null;

create or replace function public.has_permission(requested_permission text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.profiles p
    left join public.custom_roles r on r.id = p.custom_role_id
    left join public.custom_role_permissions rp on rp.role_id = r.id
    where p.id = (select auth.uid())
      and p.status = 'active'
      and (p.is_owner or (r.is_active and rp.permission_key = requested_permission))
  );
$$;

create or replace function public.has_any_permission(requested_permissions text[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from unnest(requested_permissions) p where public.has_permission(p));
$$;

create or replace function public.my_permissions()
returns table(permission_key text) language sql stable security definer set search_path = '' as $$
  select d.key
  from public.permission_definitions d
  where exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.status = 'active' and p.is_owner
  )
  or exists (
    select 1
    from public.profiles p
    join public.custom_roles r on r.id = p.custom_role_id and r.is_active
    join public.custom_role_permissions rp on rp.role_id = r.id and rp.permission_key = d.key
    where p.id = (select auth.uid()) and p.status = 'active'
  )
  order by d.sort_order;
$$;

create or replace function public.prevent_last_owner_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.is_owner and old.status = 'active'
     and (not new.is_owner or new.status <> 'active')
     and not exists (
       select 1 from public.profiles p
       where p.id <> old.id and p.is_owner and p.status = 'active'
     ) then
    raise exception 'Le dernier propriétaire actif ne peut pas être retiré ou suspendu';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_last_owner_change on public.profiles;
create trigger prevent_last_owner_change before update on public.profiles
for each row execute function public.prevent_last_owner_change();

-- Un utilisateur peut modifier son nom et ses initiales, mais jamais s'accorder
-- lui-même un rôle, le statut actif ou les droits de propriétaire.
create or replace function public.protect_profile_security_fields()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (old.custom_role_id is distinct from new.custom_role_id
      or old.status is distinct from new.status
      or old.is_owner is distinct from new.is_owner
      or old.role is distinct from new.role)
     and coalesce((select auth.role()), '') <> 'service_role'
     and session_user not in ('postgres', 'supabase_admin')
     and not public.has_permission('admin.users.manage') then
    raise exception 'vous ne pouvez pas modifier vos propres droits ou votre statut';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_security_fields on public.profiles;
create trigger protect_profile_security_fields before update on public.profiles
for each row execute function public.protect_profile_security_fields();

create or replace function public.protect_system_roles()
returns trigger language plpgsql security definer set search_path = '' as $$
declare protected_role_id uuid;
begin
  if tg_table_name = 'custom_roles' then
    if old.is_system then raise exception 'un rôle système ne peut pas être modifié ou supprimé'; end if;
  else
    protected_role_id := case when tg_op = 'INSERT' then new.role_id else old.role_id end;
    if exists (select 1 from public.custom_roles where id = protected_role_id and is_system) then
      raise exception 'les permissions d’un rôle système sont protégées';
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
drop trigger if exists protect_system_roles on public.custom_roles;
create trigger protect_system_roles before update or delete on public.custom_roles
for each row execute function public.protect_system_roles();
drop trigger if exists protect_system_role_permissions on public.custom_role_permissions;
create trigger protect_system_role_permissions before insert or update or delete on public.custom_role_permissions
for each row execute function public.protect_system_roles();

create or replace function public.bootstrap_owner(target_email text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare target_id uuid;
begin
  select id into target_id from auth.users where lower(email) = lower(target_email);
  if target_id is null then raise exception 'Compte propriétaire introuvable : %', target_email; end if;
  update public.profiles set is_owner = true, status = 'active', custom_role_id = '10000000-0000-0000-0000-000000000001'
  where id = target_id;
  return target_id;
end;
$$;
revoke all on function public.bootstrap_owner(text) from public, anon, authenticated;
grant execute on function public.bootstrap_owner(text) to service_role;

-- Réaffectation atomique des données créées avec le compte de démonstration.
-- Les lignes sont mises à jour en place : aucun doublon métier n'est créé.
create or replace function public.transfer_account_data(
  source_email text,
  target_email text,
  target_initials text default 'SD'
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  source_id uuid;
  target_id uuid;
  transfer_id uuid;
  moved_operations integer := 0;
  moved_observations integer := 0;
  moved_events integer := 0;
begin
  if not public.has_permission('admin.demo_transfer')
     or not exists (
       select 1 from public.profiles
       where id = (select auth.uid()) and is_owner and status = 'active'
     ) then
    raise exception 'seul un propriétaire actif peut transférer les données du compte démo';
  end if;

  perform pg_advisory_xact_lock(hashtext('monpetitpro:account-data-transfer'));

  select id into source_id from auth.users where lower(email) = lower(source_email);
  if source_id is null then raise exception 'compte source introuvable : %', source_email; end if;

  select id into target_id from auth.users where lower(email) = lower(target_email);
  if target_id is null then raise exception 'compte cible introuvable : %', target_email; end if;
  if source_id = target_id then raise exception 'les comptes source et cible doivent être différents'; end if;

  update public.operations set user_id = target_id where user_id = source_id;
  get diagnostics moved_operations = row_count;

  update public.observations
  set user_id = target_id,
      author_initials = coalesce(nullif(btrim(author_initials), ''), target_initials)
  where user_id = source_id;
  get diagnostics moved_observations = row_count;

  update public.events set user_id = target_id where user_id = source_id;
  get diagnostics moved_events = row_count;

  -- Un second clic retourne le journal existant au lieu de créer un faux transfert à zéro.
  if moved_operations + moved_observations + moved_events = 0 then
    select t.id into transfer_id
    from public.account_data_transfers t
    where t.source_user_id = source_id and t.target_user_id = target_id
    order by t.transferred_at desc limit 1;
    if transfer_id is not null then return transfer_id; end if;
  end if;

  insert into public.account_data_transfers (
    source_user_id, target_user_id, source_email, target_email,
    operations_count, observations_count, events_count, transferred_by, details
  ) values (
    source_id, target_id, lower(source_email), lower(target_email),
    moved_operations, moved_observations, moved_events, (select auth.uid()),
    jsonb_build_object('target_initials', target_initials)
  ) returning id into transfer_id;

  return transfer_id;
end;
$$;
revoke all on function public.transfer_account_data(text, text, text) from public, anon;
grant execute on function public.transfer_account_data(text, text, text) to authenticated;

create or replace function public.jsonb_columns_changed(old_row jsonb, new_row jsonb, column_names text[])
returns boolean language sql immutable set search_path = '' as $$
  select exists (
    select 1 from unnest(column_names) column_name
    where old_row -> column_name is distinct from new_row -> column_name
  );
$$;

-- La policy autorise l'accès à la ligne ; ce trigger contrôle en plus chaque
-- famille de champs afin qu'un appel API manuel ne contourne pas les cases du rôle.
create or replace function public.enforce_operation_field_permissions()
returns trigger language plpgsql security definer set search_path = '' as $$
declare old_row jsonb := to_jsonb(old); new_row jsonb := to_jsonb(new);
begin
  if coalesce((select auth.role()), '') = 'service_role' then return new; end if;

  if public.jsonb_columns_changed(old_row, new_row, array[
    'name','stage','of_number','gesprojet_number','department','commune','address',
    'operation_type','promoter_name','zoning','category'
  ]) and not public.has_permission('operations.edit_identity') then
    raise exception 'permission manquante : modifier l’identité de l’opération';
  end if;

  if public.jsonb_columns_changed(old_row, new_row, array[
    'project_manager','operations_manager','assistant_name','gpa_assistant_name',
    'manager_name','animation_provider'
  ]) and not public.has_permission('operations.edit_team') then
    raise exception 'permission manquante : modifier l’équipe de l’opération';
  end if;

  if public.jsonb_columns_changed(old_row, new_row, array[
    'total_housing_units','lli_units','lls_units','plai_units','plus_units','pls_units',
    'brs_units','psla_units','anru_units','acv_units','commercial_units','other_units',
    'student_units','specific_units','individual_housing_units','collective_housing_units',
    'thermal_regulation','certification','clesence_bbca','clesence_reversible',
    'clesence_land_sobriety','clesence_green_space'
  ]) and not public.has_permission('operations.edit_program') then
    raise exception 'permission manquante : modifier le programme';
  end if;

  if public.jsonb_columns_changed(old_row, new_row, array[
    'contractual_delivery_date','expected_delivery_date','actual_delivery_date','daact_date',
    'co_cpi_date','cei_cef_date','csi_ca_date','development_to_assembly_date',
    'approvals_submission_date','lls_approval_date','lli_approval_date','anru_approval_date',
    'permit_number','permit_submission_date','permit_order_date','tender_date',
    'vefa_cpr_or_sale_agreement_date','vefa_deed_or_land_purchase_date',
    'works_order_expected_date','works_order_actual_date','m8_expected_date','m8_actual_date',
    'assembly_to_works_date','m7_expected_date','m7_actual_date','m4_expected_date','m4_actual_date',
    'show_home_expected_date','show_home_actual_date','opl_actual_date','progress_status',
    'risk_assessment','delivery_reservations_count','reservations_per_housing','delivery_delay_days',
    'justified_delay_days','effective_delay_days','authorized_deadline_date','deadline_status',
    'reservations_clearance_date','dpe','management_expected_date','management_actual_date',
    'm3_reservations_meeting_date','m10_date','gpa_end_date','gpa_count','h2_deadline_date','h2_actual_date'
  ]) and not public.has_permission('operations.edit_planning') then
    raise exception 'permission manquante : modifier le planning';
  end if;

  if public.jsonb_columns_changed(old_row, new_row, array['initial_budget','final_budget','penalty_amount'])
     and not public.has_permission('operations.edit_budget') then
    raise exception 'permission manquante : modifier le budget';
  end if;

  if public.jsonb_columns_changed(old_row, new_row, array[
    'objective_year','is_objective','objective_management_date','objective_housing_units'
  ]) and not public.has_any_permission(array['operations.edit_objectives','objectives.manage']) then
    raise exception 'permission manquante : modifier les objectifs';
  end if;

  if public.jsonb_columns_changed(old_row, new_row, array['synthesis_description','significant_works'])
     and not public.has_permission('operations.edit_synthesis') then
    raise exception 'permission manquante : modifier la synthèse';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_operation_field_permissions on public.operations;
create trigger enforce_operation_field_permissions before update on public.operations
for each row execute function public.enforce_operation_field_permissions();

create or replace function public.enforce_observation_field_permissions()
returns trigger language plpgsql security definer set search_path = '' as $$
declare old_row jsonb := to_jsonb(old); new_row jsonb := to_jsonb(new);
begin
  if coalesce((select auth.role()), '') = 'service_role' then return new; end if;
  if public.jsonb_columns_changed(old_row, new_row, array['resolution_validated_at','resolution_validated_by'])
     and not public.has_permission('observations.validate') then
    raise exception 'permission manquante : valider une résolution';
  end if;
  if public.jsonb_columns_changed(old_row, new_row, array[
    'operation_id','info_date','description','responsible_person','deadline_date',
    'completion_date','author_initials','resolution_date','is_dg','status'
  ]) and not (
    public.has_permission('observations.edit_all')
    or (old.user_id = (select auth.uid()) and public.has_permission('observations.edit_own'))
  ) then
    raise exception 'permission manquante : modifier cette observation';
  end if;
  return new;
end;
$$;
drop trigger if exists enforce_observation_field_permissions on public.observations;
create trigger enforce_observation_field_permissions before update on public.observations
for each row execute function public.enforce_observation_field_permissions();

-- RLS du catalogue et des rôles.
alter table public.permission_definitions enable row level security;
alter table public.custom_roles enable row level security;
alter table public.custom_role_permissions enable row level security;
alter table public.account_data_transfers enable row level security;

drop policy if exists permission_definitions_read on public.permission_definitions;
create policy permission_definitions_read on public.permission_definitions for select to authenticated
using (public.has_permission('admin.roles.view') or public.has_permission('admin.roles.manage'));
drop policy if exists custom_roles_read on public.custom_roles;
create policy custom_roles_read on public.custom_roles for select to authenticated
using (id = (select custom_role_id from public.profiles where id = (select auth.uid())) or public.has_permission('admin.roles.view'));
drop policy if exists custom_roles_manage on public.custom_roles;
create policy custom_roles_manage on public.custom_roles for all to authenticated
using (public.has_permission('admin.roles.manage')) with check (public.has_permission('admin.roles.manage'));
drop policy if exists custom_role_permissions_read on public.custom_role_permissions;
create policy custom_role_permissions_read on public.custom_role_permissions for select to authenticated
using (role_id = (select custom_role_id from public.profiles where id = (select auth.uid())) or public.has_permission('admin.roles.view'));
drop policy if exists custom_role_permissions_manage on public.custom_role_permissions;
create policy custom_role_permissions_manage on public.custom_role_permissions for all to authenticated
using (public.has_permission('admin.roles.manage')) with check (public.has_permission('admin.roles.manage'));
drop policy if exists account_data_transfers_read on public.account_data_transfers;
create policy account_data_transfers_read on public.account_data_transfers for select to authenticated
using (public.has_permission('admin.audit.view') or public.has_permission('admin.demo_transfer'));

-- Profils.
drop policy if exists profiles_read on public.profiles;
drop policy if exists profiles_self_update on public.profiles;
drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_read on public.profiles for select to authenticated
using (id = (select auth.uid()) or public.has_permission('admin.users.view'));
create policy profiles_self_update on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));
create policy profiles_admin_update on public.profiles for update to authenticated
using (public.has_permission('admin.users.manage'))
with check (public.has_permission('admin.users.manage'));

-- Opérations.
drop policy if exists authenticated_read on public.operations;
drop policy if exists contributors_insert on public.operations;
drop policy if exists contributors_update on public.operations;
drop policy if exists responsible_delete on public.operations;
create policy operations_permission_read on public.operations for select to authenticated
using (public.has_permission('operations.view'));
create policy operations_permission_insert on public.operations for insert to authenticated
with check (public.has_permission('operations.create'));
create policy operations_permission_update on public.operations for update to authenticated
using (public.has_any_permission(array['operations.edit_identity','operations.edit_team','operations.edit_program','operations.edit_planning','operations.edit_budget','operations.edit_conditions','operations.edit_objectives','operations.edit_synthesis']))
with check (public.has_any_permission(array['operations.edit_identity','operations.edit_team','operations.edit_program','operations.edit_planning','operations.edit_budget','operations.edit_conditions','operations.edit_objectives','operations.edit_synthesis']));
create policy operations_permission_delete on public.operations for delete to authenticated
using (public.has_permission('operations.delete'));

-- Observations.
drop policy if exists observations_read on public.observations;
drop policy if exists observations_insert on public.observations;
drop policy if exists observations_contributor_update on public.observations;
drop policy if exists observations_responsible_delete on public.observations;
create policy observations_permission_read on public.observations for select to authenticated
using (public.has_permission('observations.view') and (not is_dg or public.has_permission('observations.view_dg')));
create policy observations_permission_insert on public.observations for insert to authenticated
with check (public.has_permission('observations.create') and user_id = (select auth.uid()));
create policy observations_permission_update on public.observations for update to authenticated
using (public.has_permission('observations.edit_all') or (user_id = (select auth.uid()) and public.has_permission('observations.edit_own')) or public.has_permission('observations.validate'))
with check (public.has_permission('observations.edit_all') or (user_id = (select auth.uid()) and public.has_permission('observations.edit_own')) or public.has_permission('observations.validate'));
create policy observations_permission_delete on public.observations for delete to authenticated
using (public.has_permission('observations.delete'));

-- Tables liées aux opérations.
do $$
declare table_name text;
begin
  foreach table_name in array array['operation_typologies'] loop
    execute format('drop policy if exists authenticated_read on public.%I', table_name);
    execute format('drop policy if exists contributors_insert on public.%I', table_name);
    execute format('drop policy if exists contributors_update on public.%I', table_name);
    execute format('drop policy if exists responsible_delete on public.%I', table_name);
    execute format('create policy permission_read on public.%I for select to authenticated using (public.has_permission(''operations.view''))', table_name);
    execute format('create policy permission_insert on public.%I for insert to authenticated with check (public.has_permission(''operations.edit_program''))', table_name);
    execute format('create policy permission_update on public.%I for update to authenticated using (public.has_permission(''operations.edit_program'')) with check (public.has_permission(''operations.edit_program''))', table_name);
    execute format('create policy permission_delete on public.%I for delete to authenticated using (public.has_permission(''operations.edit_program''))', table_name);
  end loop;
end $$;

drop policy if exists authenticated_read on public.operation_subsidies;
drop policy if exists contributors_insert on public.operation_subsidies;
drop policy if exists contributors_update on public.operation_subsidies;
drop policy if exists responsible_delete on public.operation_subsidies;
create policy permission_read on public.operation_subsidies for select to authenticated using (public.has_permission('operations.view'));
create policy permission_insert on public.operation_subsidies for insert to authenticated with check (public.has_permission('operations.edit_budget'));
create policy permission_update on public.operation_subsidies for update to authenticated using (public.has_permission('operations.edit_budget')) with check (public.has_permission('operations.edit_budget'));
create policy permission_delete on public.operation_subsidies for delete to authenticated using (public.has_permission('operations.edit_budget'));

drop policy if exists authenticated_read on public.suspensive_conditions;
drop policy if exists contributors_insert on public.suspensive_conditions;
drop policy if exists contributors_update on public.suspensive_conditions;
drop policy if exists responsible_delete on public.suspensive_conditions;
create policy permission_read on public.suspensive_conditions for select to authenticated using (public.has_permission('operations.view'));
create policy permission_insert on public.suspensive_conditions for insert to authenticated with check (public.has_permission('operations.edit_conditions'));
create policy permission_update on public.suspensive_conditions for update to authenticated using (public.has_permission('operations.edit_conditions')) with check (public.has_permission('operations.edit_conditions'));
create policy permission_delete on public.suspensive_conditions for delete to authenticated using (public.has_permission('operations.edit_conditions'));

drop policy if exists authenticated_read on public.operation_documents;
drop policy if exists contributors_insert on public.operation_documents;
drop policy if exists contributors_update on public.operation_documents;
drop policy if exists responsible_delete on public.operation_documents;
create policy permission_read on public.operation_documents for select to authenticated using (public.has_permission('documents.view'));
create policy permission_insert on public.operation_documents for insert to authenticated with check (public.has_permission('documents.upload'));
create policy permission_update on public.operation_documents for update to authenticated using (public.has_permission('documents.upload')) with check (public.has_permission('documents.upload'));
create policy permission_delete on public.operation_documents for delete to authenticated using (public.has_permission('documents.delete'));

drop policy if exists authenticated_read on public.document_review_items;
drop policy if exists contributors_insert on public.document_review_items;
drop policy if exists contributors_update on public.document_review_items;
drop policy if exists responsible_delete on public.document_review_items;
create policy permission_read on public.document_review_items for select to authenticated using (public.has_permission('documents.view'));
create policy permission_insert on public.document_review_items for insert to authenticated with check (public.has_permission('documents.review'));
create policy permission_update on public.document_review_items for update to authenticated using (public.has_permission('documents.review')) with check (public.has_permission('documents.review'));
create policy permission_delete on public.document_review_items for delete to authenticated using (public.has_permission('documents.review'));

drop policy if exists authenticated_read on public.events;
drop policy if exists contributors_insert on public.events;
drop policy if exists contributors_update on public.events;
drop policy if exists responsible_delete on public.events;
create policy permission_read on public.events for select to authenticated using (public.has_permission('calendar.view'));
create policy permission_insert on public.events for insert to authenticated with check (public.has_permission('calendar.manage') and user_id = (select auth.uid()));
create policy permission_update on public.events for update to authenticated using (public.has_permission('calendar.manage')) with check (public.has_permission('calendar.manage'));
create policy permission_delete on public.events for delete to authenticated using (public.has_permission('calendar.manage'));

drop policy if exists audit_admin_read on public.audit_log;
create policy audit_permission_read on public.audit_log for select to authenticated
using (public.has_permission('admin.audit.view'));

drop policy if exists operation_documents_read on storage.objects;
drop policy if exists operation_documents_insert on storage.objects;
drop policy if exists operation_documents_update on storage.objects;
drop policy if exists operation_documents_delete on storage.objects;
create policy operation_documents_read on storage.objects for select to authenticated
using (bucket_id = 'operation-documents' and public.has_permission('documents.view'));
create policy operation_documents_insert on storage.objects for insert to authenticated
with check (bucket_id = 'operation-documents' and public.has_permission('documents.upload'));
create policy operation_documents_update on storage.objects for update to authenticated
using (bucket_id = 'operation-documents' and public.has_permission('documents.upload'));
create policy operation_documents_delete on storage.objects for delete to authenticated
using (bucket_id = 'operation-documents' and public.has_permission('documents.delete'));

grant execute on function public.has_permission(text) to authenticated;
grant execute on function public.has_any_permission(text[]) to authenticated;
grant execute on function public.my_permissions() to authenticated;
