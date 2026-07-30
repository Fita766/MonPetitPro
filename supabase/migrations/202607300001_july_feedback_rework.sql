-- Retours utilisateurs du 29 juillet 2026.
-- Migration additive : elle conserve les tables et identifiants historiques.

begin;

create extension if not exists "uuid-ossp";

create table if not exists public.reference_values (
  id uuid primary key default uuid_generate_v4(),
  kind text not null check (kind in (
    'ctx', 'cop', 'assistant', 'gpa_assistant', 'manager',
    'animation_provider', 'promoter', 'certification',
    'thermal_regulation', 'program_nature'
  )),
  label text not null,
  normalized_label text generated always as (
    lower(regexp_replace(btrim(label), '\s+', ' ', 'g'))
  ) stored,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kind, normalized_label)
);

create index if not exists reference_values_kind_active_idx
  on public.reference_values(kind, is_active, sort_order, label);

create table if not exists public.communes (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  insee_code text not null unique,
  postal_code text,
  department_code text not null,
  department_name text not null,
  region_name text,
  housing_zone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint communes_department_code_length
    check (char_length(department_code) between 2 and 3)
);

create index if not exists communes_search_idx
  on public.communes(department_code, is_active, name);

insert into public.permission_definitions (
  key, group_key, label, description, sort_order
) values
  (
    'references.view',
    'references',
    'Consulter les référentiels',
    'Utiliser les communes et listes métier',
    350
  ),
  (
    'references.manage',
    'references',
    'Gérer les référentiels',
    'Ajouter, corriger et désactiver les valeurs',
    360
  )
on conflict (key) do update
set group_key = excluded.group_key,
    label = excluded.label,
    description = excluded.description,
    sort_order = excluded.sort_order;

insert into public.permission_definitions(key, group_key, label, description, sort_order) values
  ('observations.view_assigned','observations','Voir ses observations affectées','Voir uniquement les points confiés à la personne',280),
  ('observations.view_all','observations','Voir toutes les observations','Voir tous les points, y compris sans affectation',281),
  ('observations.edit_assigned','observations','Modifier ses points affectés','Modifier le contenu des points confiés',282),
  ('observations.assign','observations','Affecter à la création','Choisir un responsable lors de la création',283),
  ('observations.reassign','observations','Réaffecter un point','Changer le responsable après création',284),
  ('observations.set_completion','observations','Renseigner la réalisation','Modifier uniquement la date de réalisation',285),
  ('observations.set_status','observations','Modifier le statut','Modifier uniquement le statut métier',286),
  ('observations.set_dg','observations','Marquer un point DG','Ajouter ou retirer le caractère DG',287)
on conflict (key) do update set
  group_key = excluded.group_key,
  label = excluded.label,
  description = excluded.description,
  sort_order = excluded.sort_order;

insert into public.permission_definitions(key, group_key, label, description, sort_order) values
  ('objectives.delete_initial','objectives','Supprimer un objectif initial','Retirer exceptionnellement un objectif initial déjà figé',521)
on conflict (key) do update set
  group_key = excluded.group_key,
  label = excluded.label,
  description = excluded.description,
  sort_order = excluded.sort_order;

insert into public.custom_role_permissions (role_id, permission_key)
select role.id, permission.key
from public.custom_roles role
cross join (values ('references.view'), ('references.manage')) permission(key)
where role.name = 'Administrateur'
on conflict (role_id, permission_key) do nothing;

insert into public.custom_role_permissions (role_id, permission_key)
select role.id, 'references.view'
from public.custom_roles role
where role.name in ('Responsable', 'Contributeur', 'Lecteur')
on conflict (role_id, permission_key) do nothing;

alter table public.profiles
  add column if not exists must_change_password boolean not null default false;

alter table public.observations
  add column if not exists assignee_user_id uuid references auth.users(id);

create index if not exists observations_assignee_idx
  on public.observations(assignee_user_id, deadline_date);

alter table public.operations
  add column if not exists commune_id uuid references public.communes(id),
  add column if not exists program_nature text,
  add column if not exists approvals_expected_date date,
  add column if not exists permit_expected_date date,
  add column if not exists tender_expected_date date,
  add column if not exists cpr_expected_date date;

-- Les anciennes valeurs mélangeaient le mode de réalisation et la nature métier.
update public.operations
set program_nature = coalesce(program_nature, operation_type),
    operation_type = 'MOD'
where operation_type is null or operation_type not in ('MOD', 'VEFA');

do $$ begin
  alter table public.operations
    add constraint operations_realization_mode_check
    check (operation_type in ('MOD', 'VEFA'));
exception when duplicate_object then null;
end $$;

create index if not exists operations_commune_id_idx
  on public.operations(commune_id);

create table if not exists public.operation_program_sections (
  id uuid primary key default uuid_generate_v4(),
  operation_id uuid not null references public.operations(id) on delete cascade,
  kind text not null check (kind in ('collective', 'individual', 'commercial', 'custom')),
  label text not null,
  enabled boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (operation_id, kind, label)
);

create index if not exists operation_program_sections_operation_idx
  on public.operation_program_sections(operation_id, sort_order);

create table if not exists public.operation_program_lines (
  id uuid primary key default uuid_generate_v4(),
  operation_id uuid not null references public.operations(id) on delete cascade,
  section_id uuid not null references public.operation_program_sections(id) on delete cascade,
  label text not null,
  product text check (product is null or product in ('PLUS', 'PLAI', 'PLS', 'LLI', 'BRS', 'PSLA')),
  units integer check (units is null or units >= 0),
  average_surface numeric check (average_surface is null or average_surface >= 0),
  sort_order integer not null default 0,
  source_typology_id uuid unique references public.operation_typologies(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists operation_program_lines_operation_idx
  on public.operation_program_lines(operation_id, section_id, sort_order);
create index if not exists operation_program_lines_section_idx
  on public.operation_program_lines(section_id);

create table if not exists public.operation_budget_lines (
  id uuid primary key default uuid_generate_v4(),
  operation_id uuid not null references public.operations(id) on delete cascade,
  family text not null check (family in ('general', 'LLS', 'LLI', 'managed')),
  realization_mode text not null check (realization_mode in ('MOD', 'VEFA')),
  forecast_ht numeric check (forecast_ht is null or forecast_ht >= 0),
  forecast_ttc numeric check (forecast_ttc is null or forecast_ttc >= 0),
  forecast_equity numeric check (forecast_equity is null or forecast_equity >= 0),
  final_ht numeric check (final_ht is null or final_ht >= 0),
  final_ttc numeric check (final_ttc is null or final_ttc >= 0),
  final_equity numeric check (final_equity is null or final_equity >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (operation_id, family, realization_mode)
);

create index if not exists operation_budget_lines_operation_idx
  on public.operation_budget_lines(operation_id, family, realization_mode);

alter table public.operation_subsidies
  add column if not exists forecast_amount numeric
    check (forecast_amount is null or forecast_amount >= 0),
  add column if not exists final_amount numeric
    check (final_amount is null or final_amount >= 0),
  add column if not exists comment text;

create table if not exists public.operation_objectives (
  id uuid primary key default uuid_generate_v4(),
  operation_id uuid not null references public.operations(id) on delete cascade,
  kind text not null check (kind in ('works_order', 'management')),
  objective_year integer not null check (objective_year between 2000 and 2200),
  category text not null check (category in ('initial', 'supplementary')),
  snapshot_date date,
  snapshot_housing_units integer check (
    snapshot_housing_units is null or snapshot_housing_units >= 0
  ),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (operation_id, kind, objective_year, category)
);

create index if not exists operation_objectives_year_kind_idx
  on public.operation_objectives(objective_year, kind, category);
create index if not exists operation_objectives_created_by_idx
  on public.operation_objectives(created_by);

create or replace function public.freeze_objective_record()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  operation_row public.operations%rowtype;
begin
  if tg_op = 'UPDATE' and old.category = 'initial' then
    if new.category is distinct from old.category
      and not public.has_permission('objectives.delete_initial') then
      raise exception 'Le reclassement d’un objectif initial nécessite une autorisation dédiée'
        using errcode = '42501';
    end if;
    new.snapshot_date := old.snapshot_date;
    new.snapshot_housing_units := old.snapshot_housing_units;
    return new;
  end if;

  if tg_op = 'INSERT' then
    select * into operation_row from public.operations where id = new.operation_id;
    new.snapshot_date := coalesce(
      new.snapshot_date,
      case new.kind
        when 'works_order' then operation_row.works_order_expected_date
        when 'management' then operation_row.management_expected_date
      end
    );
    new.snapshot_housing_units := coalesce(
      new.snapshot_housing_units,
      operation_row.total_housing_units,
      0
    );
    new.created_by := coalesce(new.created_by, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists freeze_objective_record on public.operation_objectives;
create trigger freeze_objective_record
before insert or update on public.operation_objectives
for each row execute function public.freeze_objective_record();

create or replace function public.protect_initial_objective_deletion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.category = 'initial'
    and not public.has_permission('objectives.delete_initial') then
    raise exception 'La suppression d’un objectif initial nécessite une autorisation dédiée'
      using errcode = '42501';
  end if;
  return old;
end;
$$;

drop trigger if exists protect_initial_objective_deletion on public.operation_objectives;
create trigger protect_initial_objective_deletion
before delete on public.operation_objectives
for each row execute function public.protect_initial_objective_deletion();

create table if not exists public.operation_significant_works (
  id uuid primary key default uuid_generate_v4(),
  operation_id uuid not null references public.operations(id) on delete cascade,
  label text not null,
  amount_ht numeric check (amount_ht is null or amount_ht >= 0),
  comment text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists operation_significant_works_operation_idx
  on public.operation_significant_works(operation_id, sort_order);

create table if not exists public.platform_migration_journal (
  id uuid primary key default uuid_generate_v4(),
  migration_key text not null unique,
  source_count integer not null check (source_count >= 0),
  migrated_count integer not null check (migrated_count >= 0),
  details jsonb not null default '{}'::jsonb,
  completed_at timestamptz not null default now()
);

-- Compatibilité des montants de subvention historiques.
update public.operation_subsidies
set forecast_amount = amount
where forecast_amount is null and amount is not null;

-- Une section collective de compatibilité accueille chaque typologie historique.
insert into public.operation_program_sections (
  operation_id, kind, label, enabled, sort_order
)
select operation.id, seed.kind, seed.label, seed.enabled, seed.sort_order
from public.operations operation
cross join (values
  ('collective', 'Logements collectifs', true, 0),
  ('individual', 'Logements individuels', false, 10),
  ('commercial', 'Commerces et locaux', false, 20)
) seed(kind, label, enabled, sort_order)
on conflict (operation_id, kind, label) do nothing;

insert into public.operation_program_lines (
  operation_id, section_id, label, product, units, average_surface,
  sort_order, source_typology_id
)
select
  typology.operation_id,
  section.id,
  typology.typology,
  typology.product,
  typology.units,
  typology.average_surface,
  case typology.typology
    when 'T1' then 10
    when 'T2' then 20
    when 'T3' then 30
    when 'T4' then 40
    else 90
  end,
  typology.id
from public.operation_typologies typology
join public.operation_program_sections section
  on section.operation_id = typology.operation_id
 and section.kind = 'collective'
 and section.label = 'Logements collectifs'
on conflict (source_typology_id) do nothing;

-- Si le détail historique n'expliquait pas tout le total, une ligne explicite
-- conserve exactement le volume existant au lieu de perdre silencieusement des logements.
with detailed_totals as (
  select operation_id, coalesce(sum(units), 0) as detailed_units
  from public.operation_program_lines
  group by operation_id
)
insert into public.operation_program_lines (
  operation_id, section_id, label, product, units, average_surface, sort_order
)
select
  operation.id,
  section.id,
  'Complément historique à détailler',
  null,
  operation.total_housing_units - coalesce(detailed.detailed_units, 0),
  null,
  990
from public.operations operation
join public.operation_program_sections section
  on section.operation_id = operation.id
 and section.kind = 'collective'
 and section.label = 'Logements collectifs'
left join detailed_totals detailed on detailed.operation_id = operation.id
where operation.total_housing_units > coalesce(detailed.detailed_units, 0)
  and not exists (
    select 1 from public.operation_program_lines existing
    where existing.operation_id = operation.id
      and existing.label = 'Complément historique à détailler'
  );

insert into public.operation_budget_lines (
  operation_id, family, realization_mode, forecast_ht, final_ht
)
select
  operation.id,
  'general',
  case when operation.operation_type = 'VEFA' then 'VEFA' else 'MOD' end,
  operation.initial_budget,
  operation.final_budget
from public.operations operation
where operation.initial_budget is not null or operation.final_budget is not null
on conflict (operation_id, family, realization_mode) do update
set forecast_ht = coalesce(public.operation_budget_lines.forecast_ht, excluded.forecast_ht),
    final_ht = coalesce(public.operation_budget_lines.final_ht, excluded.final_ht);

insert into public.operation_objectives (
  operation_id, kind, objective_year, category,
  snapshot_date, snapshot_housing_units, created_by
)
select
  operation.id,
  'management',
  operation.objective_year,
  'initial',
  coalesce(operation.objective_management_date, operation.management_expected_date),
  coalesce(operation.objective_housing_units, operation.total_housing_units, 0),
  operation.user_id
from public.operations operation
where operation.is_objective
  and operation.objective_year is not null
on conflict (operation_id, kind, objective_year, category) do nothing;

insert into public.operation_significant_works (
  operation_id, label, amount_ht, comment, sort_order
)
select operation.id, 'Historique à détailler', null, operation.significant_works, 0
from public.operations operation
where nullif(btrim(operation.significant_works), '') is not null
  and not exists (
    select 1 from public.operation_significant_works existing
    where existing.operation_id = operation.id
      and existing.label = 'Historique à détailler'
  );

-- Affectation sûre : une observation n'est rattachée que si une seule personne
-- active correspond au nom, aux initiales ou au préfixe de l'adresse e-mail.
with candidates as (
  select
    observation.id as observation_id,
    min(profile.id::text)::uuid as profile_id,
    count(*) as match_count
  from public.observations observation
  join public.profiles profile
    on profile.status = 'active'
   and (
     lower(btrim(profile.display_name)) = lower(btrim(observation.responsible_person))
     or lower(btrim(profile.initials)) = lower(btrim(observation.responsible_person))
     or lower(split_part(coalesce(profile.email, ''), '@', 1))
        = lower(btrim(observation.responsible_person))
   )
  where observation.assignee_user_id is null
  group by observation.id
)
update public.observations observation
set assignee_user_id = candidate.profile_id
from candidates candidate
where candidate.observation_id = observation.id
  and candidate.match_count = 1;

insert into public.platform_migration_journal (
  migration_key, source_count, migrated_count, details
)
select
  '202607300001-program-typologies',
  (select count(*) from public.operation_typologies),
  (select count(*) from public.operation_program_lines where source_typology_id is not null),
  jsonb_build_object('source_table', 'operation_typologies')
on conflict (migration_key) do update
set source_count = excluded.source_count,
    migrated_count = excluded.migrated_count,
    details = excluded.details,
    completed_at = now();

insert into public.platform_migration_journal (
  migration_key, source_count, migrated_count, details
)
select
  '202607300001-legacy-budgets',
  count(*),
  (
    select count(*)
    from public.operation_budget_lines
    where family = 'general'
  ),
  jsonb_build_object('source_columns', array['initial_budget', 'final_budget'])
from public.operations
where initial_budget is not null or final_budget is not null
on conflict (migration_key) do update
set source_count = excluded.source_count,
    migrated_count = excluded.migrated_count,
    details = excluded.details,
    completed_at = now();

insert into public.platform_migration_journal (
  migration_key, source_count, migrated_count, details
)
select
  '202607300001-legacy-objectives',
  count(*),
  (
    select count(*)
    from public.operation_objectives
    where kind = 'management' and category = 'initial'
  ),
  jsonb_build_object('source_columns', array['is_objective', 'objective_year'])
from public.operations
where is_objective and objective_year is not null
on conflict (migration_key) do update
set source_count = excluded.source_count,
    migrated_count = excluded.migrated_count,
    details = excluded.details,
    completed_at = now();

insert into public.platform_migration_journal (
  migration_key, source_count, migrated_count, details
)
select
  '202607300001-significant-works',
  count(*),
  (select count(*) from public.operation_significant_works where label = 'Historique à détailler'),
  jsonb_build_object('source_column', 'operations.significant_works')
from public.operations
where nullif(btrim(significant_works), '') is not null
on conflict (migration_key) do update
set source_count = excluded.source_count,
    migrated_count = excluded.migrated_count,
    details = excluded.details,
    completed_at = now();

insert into public.platform_migration_journal (
  migration_key, source_count, migrated_count, details
)
select
  '202607300001-subsidy-amounts',
  count(*),
  count(*) filter (
    where amount is null or forecast_amount is not distinct from amount
  ),
  jsonb_build_object('source_column', 'amount', 'target_column', 'forecast_amount')
from public.operation_subsidies
on conflict (migration_key) do update
set source_count = excluded.source_count,
    migrated_count = excluded.migrated_count,
    details = excluded.details,
    completed_at = now();

insert into public.platform_migration_journal (
  migration_key, source_count, migrated_count, details
)
select
  '202607300001-observation-assignments',
  count(*),
  count(*) filter (where assignee_user_id is not null),
  jsonb_build_object(
    'matched', count(*) filter (where assignee_user_id is not null),
    'unmatched', count(*) filter (where assignee_user_id is null)
  )
from public.observations
on conflict (migration_key) do update
set source_count = excluded.source_count,
    migrated_count = excluded.migrated_count,
    details = excluded.details,
    completed_at = now();

-- Horodatage uniforme.
do $$
declare table_with_updated_at text;
begin
  foreach table_with_updated_at in array array[
    'reference_values', 'communes', 'operation_program_sections',
    'operation_program_lines', 'operation_budget_lines',
    'operation_objectives', 'operation_significant_works'
  ] loop
    execute format(
      'drop trigger if exists set_%I_updated_at on public.%I',
      table_with_updated_at,
      table_with_updated_at
    );
    execute format(
      'create trigger set_%I_updated_at before update on public.%I
       for each row execute function public.set_updated_at()',
      table_with_updated_at,
      table_with_updated_at
    );
  end loop;
end $$;

-- Audit des nouvelles données métier.
do $$
declare table_to_audit text;
begin
  foreach table_to_audit in array array[
    'reference_values', 'communes', 'operation_program_sections',
    'operation_program_lines', 'operation_budget_lines',
    'operation_objectives', 'operation_significant_works'
  ] loop
    execute format('drop trigger if exists audit_%I on public.%I', table_to_audit, table_to_audit);
    execute format(
      'create trigger audit_%I after insert or update or delete on public.%I
       for each row execute function public.write_audit_log()',
      table_to_audit,
      table_to_audit
    );
  end loop;
end $$;

alter table public.reference_values enable row level security;
alter table public.communes enable row level security;
alter table public.operation_program_sections enable row level security;
alter table public.operation_program_lines enable row level security;
alter table public.operation_budget_lines enable row level security;
alter table public.operation_objectives enable row level security;
alter table public.operation_significant_works enable row level security;
alter table public.platform_migration_journal enable row level security;

drop policy if exists reference_values_read on public.reference_values;
create policy reference_values_read on public.reference_values
for select to authenticated
using (public.has_permission('references.view'));

drop policy if exists reference_values_insert on public.reference_values;
create policy reference_values_insert on public.reference_values
for insert to authenticated
with check (public.has_permission('references.manage'));

drop policy if exists reference_values_update on public.reference_values;
create policy reference_values_update on public.reference_values
for update to authenticated
using (public.has_permission('references.manage'))
with check (public.has_permission('references.manage'));

drop policy if exists communes_read on public.communes;
create policy communes_read on public.communes
for select to authenticated
using (public.has_permission('references.view'));

drop policy if exists communes_insert on public.communes;
create policy communes_insert on public.communes
for insert to authenticated
with check (public.has_permission('references.manage'));

drop policy if exists communes_update on public.communes;
create policy communes_update on public.communes
for update to authenticated
using (public.has_permission('references.manage'))
with check (public.has_permission('references.manage'));

do $$
declare child_config record;
begin
  for child_config in
    select * from (values
      ('operation_program_sections', 'operations.edit_program'),
      ('operation_program_lines', 'operations.edit_program'),
      ('operation_budget_lines', 'operations.edit_budget'),
      ('operation_objectives', 'objectives.manage'),
      ('operation_significant_works', 'operations.edit_synthesis')
    ) config(table_name, edit_permission)
  loop
    execute format('drop policy if exists operation_child_read on public.%I', child_config.table_name);
    execute format(
      'create policy operation_child_read on public.%I for select to authenticated
       using (public.has_permission(''operations.view''))',
      child_config.table_name
    );
    execute format('drop policy if exists operation_child_insert on public.%I', child_config.table_name);
    execute format(
      'create policy operation_child_insert on public.%I for insert to authenticated
       with check (public.has_permission(%L))',
      child_config.table_name,
      child_config.edit_permission
    );
    execute format('drop policy if exists operation_child_update on public.%I', child_config.table_name);
    execute format(
      'create policy operation_child_update on public.%I for update to authenticated
       using (public.has_permission(%L))
       with check (public.has_permission(%L))',
      child_config.table_name,
      child_config.edit_permission,
      child_config.edit_permission
    );
    execute format('drop policy if exists operation_child_delete on public.%I', child_config.table_name);
    execute format(
      'create policy operation_child_delete on public.%I for delete to authenticated
       using (public.has_permission(%L))',
      child_config.table_name,
      child_config.edit_permission
    );
  end loop;
end $$;

drop policy if exists operation_child_read on public.operation_objectives;
drop policy if exists operation_child_insert on public.operation_objectives;
drop policy if exists operation_child_update on public.operation_objectives;
drop policy if exists operation_child_delete on public.operation_objectives;
drop policy if exists operation_objectives_read on public.operation_objectives;
drop policy if exists operation_objectives_insert on public.operation_objectives;
drop policy if exists operation_objectives_update on public.operation_objectives;
drop policy if exists operation_objectives_delete on public.operation_objectives;
create policy operation_objectives_read on public.operation_objectives
for select to authenticated
using (public.has_any_permission(array['operations.view', 'objectives.view']));
create policy operation_objectives_insert on public.operation_objectives
for insert to authenticated
with check (public.has_permission('objectives.manage'));
create policy operation_objectives_update on public.operation_objectives
for update to authenticated
using (public.has_permission('objectives.manage'))
with check (public.has_permission('objectives.manage'));
create policy operation_objectives_delete on public.operation_objectives
for delete to authenticated
using (public.has_permission('objectives.manage'));

drop policy if exists platform_migration_journal_read
  on public.platform_migration_journal;
create policy platform_migration_journal_read
on public.platform_migration_journal for select to authenticated
using (public.has_permission('admin.audit.view'));

-- Autorisations au champ : les droits historiques sont développés sans perte
-- vers une clé indépendante pour chaque valeur saisissable de la fiche.
with field_groups(group_key, legacy_permission, fields) as (
  values
    ('operation_fields_identity', 'operations.edit_identity', array[
      'name','stage','of_number','gesprojet_number','department','commune','commune_id','address',
      'operation_type','program_nature','promoter_name'
    ]::text[]),
    ('operation_fields_team', 'operations.edit_team', array[
      'project_manager','operations_manager','assistant_name','gpa_assistant_name',
      'manager_name','animation_provider'
    ]::text[]),
    ('operation_fields_program', 'operations.edit_program', array[
      'total_housing_units','individual_housing_units','collective_housing_units',
      'plus_units','plai_units','pls_units','lli_units','lls_units','brs_units',
      'psla_units','student_units','specific_units','anru_units','acv_units',
      'commercial_units','other_units','thermal_regulation','certification',
      'clesence_bbca','clesence_reversible','clesence_land_sobriety',
      'clesence_green_space','zoning','category'
    ]::text[]),
    ('operation_fields_planning', 'operations.edit_planning', array[
      'co_cpi_date','cei_cef_date','csi_ca_date','development_to_assembly_date',
      'approvals_expected_date','approvals_submission_date','lls_approval_date','lli_approval_date',
      'anru_approval_date','permit_number','permit_expected_date','permit_submission_date',
      'permit_order_date','tender_expected_date','tender_date','cpr_expected_date','vefa_cpr_or_sale_agreement_date',
      'vefa_deed_or_land_purchase_date','works_order_expected_date',
      'works_order_actual_date','contractual_delivery_date','m8_actual_date',
      'assembly_to_works_date','m7_actual_date','m4_actual_date',
      'show_home_actual_date','opl_actual_date','progress_status',
      'expected_delivery_date','risk_assessment','actual_delivery_date',
      'delivery_reservations_count','justified_delay_days','penalty_amount',
      'reservations_clearance_date','daact_date','dpe','management_actual_date',
      'gpa_count','h2_actual_date'
    ]::text[]),
    ('operation_fields_budget', 'operations.edit_budget', array[
      'initial_budget','final_budget'
    ]::text[]),
    ('operation_fields_objectives', 'operations.edit_objectives', array[
      'is_objective','objective_year'
    ]::text[]),
    ('operation_fields_synthesis', 'operations.edit_synthesis', array[
      'synthesis_description','significant_works'
    ]::text[])
), expanded as (
  select group_key, legacy_permission, field, row_number() over () as sort_order
  from field_groups
  cross join lateral unnest(fields) field
)
insert into public.permission_definitions(key, group_key, label, description, sort_order)
select
  'operations.field.' || field || '.edit',
  group_key,
  'Modifier « ' || initcap(replace(field, '_', ' ')) || ' »',
  'Autorise uniquement la modification de ce champ.',
  1000 + sort_order
from expanded
on conflict (key) do update set
  group_key = excluded.group_key,
  label = excluded.label,
  description = excluded.description,
  sort_order = excluded.sort_order;

alter table public.custom_role_permissions
  disable trigger protect_system_role_permissions;

insert into public.custom_role_permissions(role_id, permission_key) values
  ('10000000-0000-0000-0000-000000000001', 'references.view'),
  ('10000000-0000-0000-0000-000000000001', 'references.manage'),
  ('10000000-0000-0000-0000-000000000002', 'references.view'),
  ('10000000-0000-0000-0000-000000000003', 'references.view'),
  ('10000000-0000-0000-0000-000000000004', 'references.view')
on conflict do nothing;

insert into public.custom_role_permissions(role_id, permission_key)
select role_id, permission_key
from (values
  ('10000000-0000-0000-0000-000000000001'::uuid, 'observations.view_all'),
  ('10000000-0000-0000-0000-000000000001'::uuid, 'observations.view_assigned'),
  ('10000000-0000-0000-0000-000000000001'::uuid, 'observations.edit_assigned'),
  ('10000000-0000-0000-0000-000000000001'::uuid, 'observations.assign'),
  ('10000000-0000-0000-0000-000000000001'::uuid, 'observations.reassign'),
  ('10000000-0000-0000-0000-000000000001'::uuid, 'observations.set_completion'),
  ('10000000-0000-0000-0000-000000000001'::uuid, 'observations.set_status'),
  ('10000000-0000-0000-0000-000000000001'::uuid, 'observations.set_dg'),
  ('10000000-0000-0000-0000-000000000001'::uuid, 'objectives.delete_initial'),
  ('10000000-0000-0000-0000-000000000002'::uuid, 'observations.view_all'),
  ('10000000-0000-0000-0000-000000000002'::uuid, 'observations.edit_assigned'),
  ('10000000-0000-0000-0000-000000000002'::uuid, 'observations.assign'),
  ('10000000-0000-0000-0000-000000000002'::uuid, 'observations.reassign'),
  ('10000000-0000-0000-0000-000000000002'::uuid, 'observations.set_completion'),
  ('10000000-0000-0000-0000-000000000002'::uuid, 'observations.set_status'),
  ('10000000-0000-0000-0000-000000000002'::uuid, 'observations.set_dg'),
  ('10000000-0000-0000-0000-000000000003'::uuid, 'observations.view_assigned'),
  ('10000000-0000-0000-0000-000000000003'::uuid, 'observations.edit_assigned'),
  ('10000000-0000-0000-0000-000000000004'::uuid, 'observations.view_all')
) seeded(role_id, permission_key)
on conflict do nothing;

with legacy_map(legacy_permission, permission_key) as (
  values
    ('observations.view', 'observations.view_all'),
    ('observations.edit_own', 'observations.edit_assigned'),
    ('observations.edit_all', 'observations.view_all'),
    ('observations.edit_all', 'observations.assign'),
    ('observations.edit_all', 'observations.reassign'),
    ('observations.edit_all', 'observations.set_completion'),
    ('observations.edit_all', 'observations.set_status'),
    ('observations.edit_all', 'observations.set_dg')
)
insert into public.custom_role_permissions(role_id, permission_key)
select existing.role_id, legacy_map.permission_key
from public.custom_role_permissions existing
join legacy_map on legacy_map.legacy_permission = existing.permission_key
on conflict do nothing;

-- Le rôle contributeur historique reste volontairement limité aux points qui
-- lui sont affectés. Sans ce retrait, son ancienne permission de lecture
-- générale serait convertie en observations.view_all par la compatibilité.
delete from public.custom_role_permissions
where role_id = '10000000-0000-0000-0000-000000000003'::uuid
  and permission_key = 'observations.view_all';

with field_groups(legacy_permission, fields) as (
  values
    ('operations.edit_identity', array['name','stage','of_number','gesprojet_number','department','commune','commune_id','address','operation_type','program_nature','promoter_name']::text[]),
    ('operations.edit_team', array['project_manager','operations_manager','assistant_name','gpa_assistant_name','manager_name','animation_provider']::text[]),
    ('operations.edit_program', array['total_housing_units','individual_housing_units','collective_housing_units','plus_units','plai_units','pls_units','lli_units','lls_units','brs_units','psla_units','student_units','specific_units','anru_units','acv_units','commercial_units','other_units','thermal_regulation','certification','clesence_bbca','clesence_reversible','clesence_land_sobriety','clesence_green_space','zoning','category']::text[]),
    ('operations.edit_planning', array['co_cpi_date','cei_cef_date','csi_ca_date','development_to_assembly_date','approvals_expected_date','approvals_submission_date','lls_approval_date','lli_approval_date','anru_approval_date','permit_number','permit_expected_date','permit_submission_date','permit_order_date','tender_expected_date','tender_date','cpr_expected_date','vefa_cpr_or_sale_agreement_date','vefa_deed_or_land_purchase_date','works_order_expected_date','works_order_actual_date','contractual_delivery_date','m8_actual_date','assembly_to_works_date','m7_actual_date','m4_actual_date','show_home_actual_date','opl_actual_date','progress_status','expected_delivery_date','risk_assessment','actual_delivery_date','delivery_reservations_count','justified_delay_days','penalty_amount','reservations_clearance_date','daact_date','dpe','management_actual_date','gpa_count','h2_actual_date']::text[]),
    ('operations.edit_budget', array['initial_budget','final_budget']::text[]),
    ('operations.edit_objectives', array['is_objective','objective_year']::text[]),
    ('operations.edit_synthesis', array['synthesis_description','significant_works']::text[])
), expanded as (
  select legacy_permission, field
  from field_groups
  cross join lateral unnest(fields) field
)
insert into public.custom_role_permissions(role_id, permission_key)
select existing.role_id, 'operations.field.' || expanded.field || '.edit'
from public.custom_role_permissions existing
join expanded on expanded.legacy_permission = existing.permission_key
on conflict do nothing;

insert into public.custom_role_permissions(role_id, permission_key)
select role_permission.role_id, 'operations.field.' || field || '.edit'
from public.custom_role_permissions role_permission
cross join unnest(array['is_objective','objective_year']) field
where role_permission.permission_key = 'objectives.manage'
on conflict do nothing;

alter table public.custom_role_permissions
  enable trigger protect_system_role_permissions;

create or replace function public.save_operation_finance(
  p_operation_id uuid,
  p_budget jsonb,
  p_subsidies jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('operations.edit_budget') then
    raise exception 'Permission budget insuffisante' using errcode = '42501';
  end if;

  if not exists (select 1 from public.operations where id = p_operation_id) then
    raise exception 'Opération introuvable';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(coalesce(p_budget, '[]'::jsonb)) as item(id uuid)
    join public.operation_budget_lines existing on existing.id = item.id
    where existing.operation_id <> p_operation_id
  ) then
    raise exception 'Ligne budgétaire étrangère à cette opération' using errcode = '42501';
  end if;

  delete from public.operation_budget_lines
  where operation_id = p_operation_id
    and id not in (
      select item.id
      from jsonb_to_recordset(coalesce(p_budget, '[]'::jsonb)) as item(id uuid)
      where item.id is not null
    );

  insert into public.operation_budget_lines (
    id, operation_id, family, realization_mode,
    forecast_ht, forecast_ttc, forecast_equity,
    final_ht, final_ttc, final_equity, sort_order
  )
  select
    item.id, p_operation_id, item.family, item.realization_mode,
    item.forecast_ht, item.forecast_ttc, item.forecast_equity,
    item.final_ht, item.final_ttc, item.final_equity, item.sort_order
  from jsonb_to_recordset(coalesce(p_budget, '[]'::jsonb)) as item(
    id uuid, family text, realization_mode text,
    forecast_ht numeric, forecast_ttc numeric, forecast_equity numeric,
    final_ht numeric, final_ttc numeric, final_equity numeric, sort_order integer
  )
  on conflict (id) do update set
    family = excluded.family,
    realization_mode = excluded.realization_mode,
    forecast_ht = excluded.forecast_ht,
    forecast_ttc = excluded.forecast_ttc,
    forecast_equity = excluded.forecast_equity,
    final_ht = excluded.final_ht,
    final_ttc = excluded.final_ttc,
    final_equity = excluded.final_equity,
    sort_order = excluded.sort_order;

  delete from public.operation_subsidies
  where operation_id = p_operation_id
    and id not in (
      select item.id
      from jsonb_to_recordset(coalesce(p_subsidies, '[]'::jsonb)) as item(id uuid)
      where item.id is not null
    );

  if exists (
    select 1
    from jsonb_to_recordset(coalesce(p_subsidies, '[]'::jsonb)) as item(id uuid)
    join public.operation_subsidies existing on existing.id = item.id
    where existing.operation_id <> p_operation_id
  ) then
    raise exception 'Subvention étrangère à cette opération' using errcode = '42501';
  end if;

  insert into public.operation_subsidies (
    id, operation_id, provider, purpose, amount,
    forecast_amount, final_amount, comment
  )
  select
    item.id, p_operation_id, item.provider, coalesce(item.purpose, ''),
    item.forecast_amount, item.forecast_amount, item.final_amount, item.comment
  from jsonb_to_recordset(coalesce(p_subsidies, '[]'::jsonb)) as item(
    id uuid, provider text, purpose text,
    forecast_amount numeric, final_amount numeric, comment text
  )
  on conflict (id) do update set
    provider = excluded.provider,
    purpose = excluded.purpose,
    amount = excluded.amount,
    forecast_amount = excluded.forecast_amount,
    final_amount = excluded.final_amount,
    comment = excluded.comment;
end;
$$;

revoke all on function public.save_operation_finance(uuid, jsonb, jsonb) from public;
grant execute on function public.save_operation_finance(uuid, jsonb, jsonb) to authenticated;

create or replace function public.can_edit_any_operation_field()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.my_permissions()
    where permission_key like 'operations.field.%.edit'
  ) or public.has_any_permission(array[
    'operations.edit_identity','operations.edit_team','operations.edit_program',
    'operations.edit_planning','operations.edit_budget','operations.edit_conditions',
    'operations.edit_objectives','operations.edit_synthesis'
  ]);
$$;

create or replace function public.enforce_operation_field_permissions()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  old_row jsonb := to_jsonb(old);
  new_row jsonb := to_jsonb(new);
  changed_field text;
  required_permission text;
begin
  if coalesce((select auth.role()), '') = 'service_role' then return new; end if;

  for changed_field in
    select new_value.key
    from jsonb_each(new_row) new_value
    where old_row -> new_value.key is distinct from new_row -> new_value.key
  loop
    required_permission := 'operations.field.' || changed_field || '.edit';
    if changed_field in ('commune', 'department', 'zoning')
       and old.commune_id is distinct from new.commune_id
       and public.has_permission('operations.field.commune_id.edit') then
      continue;
    end if;
    if exists (
      select 1 from public.permission_definitions
      where key = required_permission
    ) and not public.has_permission(required_permission) then
      raise exception 'permission manquante pour le champ : %', changed_field;
    end if;
  end loop;
  return new;
end;
$$;

drop policy if exists operations_permission_update on public.operations;
create policy operations_permission_update on public.operations
for update to authenticated
using (public.can_edit_any_operation_field())
with check (public.can_edit_any_operation_field());

create or replace function public.complete_password_change()
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform set_config('monpetitpro.password_change_completion', '1', true);
  update public.profiles
  set must_change_password = false
  where id = (select auth.uid()) and status = 'active';
  if not found then
    raise exception 'profil actif introuvable';
  end if;
end;
$$;
revoke all on function public.complete_password_change() from public, anon;
grant execute on function public.complete_password_change() to authenticated;

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

  if old.must_change_password is distinct from new.must_change_password
     and coalesce((select auth.role()), '') <> 'service_role'
     and session_user not in ('postgres', 'supabase_admin')
     and coalesce(current_setting('monpetitpro.password_change_completion', true), '') <> '1'
     and not public.has_permission('admin.users.manage') then
    raise exception 'le changement de mot de passe doit être validé par le parcours sécurisé';
  end if;
  return new;
end;
$$;

-- Observations privées par affectation, avec droits indépendants pour chaque
-- donnée sensible. Les anciennes policies sont supprimées pour éviter leur OR.
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or public.has_permission('admin.users.view')
  or public.has_permission('admin.audit.view')
  or public.has_any_permission(array['observations.assign','observations.reassign'])
);

drop policy if exists audit_admin_read on public.audit_log;
drop policy if exists audit_permission_read on public.audit_log;
create policy audit_permission_read on public.audit_log
for select to authenticated
using (public.has_permission('admin.audit.view'));

drop policy if exists observations_read on public.observations;
drop policy if exists observations_insert on public.observations;
drop policy if exists observations_contributor_update on public.observations;
drop policy if exists observations_responsible_delete on public.observations;
drop policy if exists observations_permission_read on public.observations;
drop policy if exists observations_permission_insert on public.observations;
drop policy if exists observations_permission_update on public.observations;
drop policy if exists observations_permission_delete on public.observations;

create policy observations_permission_read on public.observations
for select to authenticated using (
  (
    public.has_permission('observations.view_all')
    or (
      assignee_user_id = (select auth.uid())
      and public.has_permission('observations.view_assigned')
    )
  )
  and (not is_dg or public.has_permission('observations.view_dg'))
);

create policy observations_permission_insert on public.observations
for insert to authenticated with check (
  public.has_permission('observations.create')
  and (
    assignee_user_id = (select auth.uid())
    or public.has_permission('observations.assign')
  )
  and (not is_dg or public.has_permission('observations.set_dg'))
  and user_id = (select auth.uid())
);

create policy observations_permission_update on public.observations
for update to authenticated using (
  public.has_permission('observations.edit_all')
  or (assignee_user_id = (select auth.uid()) and public.has_permission('observations.edit_assigned'))
  or public.has_any_permission(array[
    'observations.reassign','observations.set_completion','observations.set_status',
    'observations.set_dg','observations.validate'
  ])
) with check (
  public.has_permission('observations.edit_all')
  or (assignee_user_id = (select auth.uid()) and public.has_permission('observations.edit_assigned'))
  or public.has_any_permission(array[
    'observations.reassign','observations.set_completion','observations.set_status',
    'observations.set_dg','observations.validate'
  ])
);

create policy observations_permission_delete on public.observations
for delete to authenticated using (public.has_permission('observations.delete'));

create or replace function public.enforce_observation_field_permissions()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  old_row jsonb := to_jsonb(old);
  new_row jsonb := to_jsonb(new);
  can_edit_content boolean;
begin
  if coalesce((select auth.role()), '') = 'service_role' then return new; end if;
  can_edit_content := public.has_permission('observations.edit_all')
    or (
      old.assignee_user_id = (select auth.uid())
      and public.has_permission('observations.edit_assigned')
    );

  if public.jsonb_columns_changed(old_row, new_row, array[
    'operation_id','info_date','description','deadline_date','resolution_date'
  ]) and not can_edit_content then
    raise exception 'permission manquante : modifier le contenu de cette observation';
  end if;

  if public.jsonb_columns_changed(old_row, new_row, array['assignee_user_id','responsible_person'])
     and not (
       (old.assignee_user_id is null and public.has_permission('observations.assign'))
       or public.has_permission('observations.reassign')
     ) then
    raise exception 'permission manquante : réaffecter cette observation';
  end if;

  if old.completion_date is distinct from new.completion_date
     and not public.has_permission('observations.set_completion') then
    raise exception 'permission manquante : renseigner la réalisation';
  end if;
  if old.status is distinct from new.status
     and not public.has_permission('observations.set_status') then
    raise exception 'permission manquante : modifier le statut';
  end if;
  if old.is_dg is distinct from new.is_dg
     and not public.has_permission('observations.set_dg') then
    raise exception 'permission manquante : modifier le caractère DG';
  end if;
  if public.jsonb_columns_changed(old_row, new_row, array[
    'resolution_validated_at','resolution_validated_by'
  ]) and not public.has_permission('observations.validate') then
    raise exception 'permission manquante : valider une résolution';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_observation_field_permissions on public.observations;
create trigger enforce_observation_field_permissions before update on public.observations
for each row execute function public.enforce_observation_field_permissions();

-- Assertions transactionnelles : toute divergence annule la migration.
do $$
declare source_count integer;
declare migrated_count integer;
declare unmatched_count integer;
begin
  select count(*) into source_count from public.operation_typologies;
  select count(*) into migrated_count
  from public.operation_program_lines
  where source_typology_id is not null;
  if source_count <> migrated_count then
    raise exception
      'migration programme incomplète : % source(s), % migrée(s)',
      source_count,
      migrated_count;
  end if;

  select count(*) into source_count
  from public.operations
  where initial_budget is not null or final_budget is not null;
  select count(*) into migrated_count
  from public.operation_budget_lines
  where family = 'general';
  if source_count > migrated_count then
    raise exception
      'migration budget incomplète : % source(s), % migrée(s)',
      source_count,
      migrated_count;
  end if;

  select count(*) into source_count
  from public.operations
  where is_objective and objective_year is not null;
  select count(*) into migrated_count
  from public.operation_objectives
  where kind = 'management' and category = 'initial';
  if source_count > migrated_count then
    raise exception
      'migration objectifs incomplète : % source(s), % migrée(s)',
      source_count,
      migrated_count;
  end if;

  select count(*) into source_count
  from public.operations
  where nullif(btrim(significant_works), '') is not null;
  select count(*) into migrated_count
  from public.operation_significant_works
  where label = 'Historique à détailler';
  if source_count > migrated_count then
    raise exception
      'migration travaux significatifs incomplète : % source(s), % migrée(s)',
      source_count,
      migrated_count;
  end if;

  select count(*) into source_count
  from public.operation_subsidies;
  select count(*) into migrated_count
  from public.operation_subsidies
  where amount is null or forecast_amount is not distinct from amount;
  if source_count <> migrated_count then
    raise exception
      'migration subventions incomplète : % source(s), % migrée(s)',
      source_count,
      migrated_count;
  end if;

  select count(*) into source_count from public.observations;
  select count(*) into migrated_count
  from public.observations where assignee_user_id is not null;
  select count(*) into unmatched_count
  from public.observations where assignee_user_id is null;
  if source_count <> migrated_count + unmatched_count then
    raise exception
      'migration affectations incohérente : % source(s), % affectée(s), % sans affectation',
      source_count,
      migrated_count,
      unmatched_count;
  end if;
end $$;

commit;
