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
select distinct operation_id, 'collective', 'Logements collectifs', true, 0
from public.operation_typologies
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
declare child_table text;
begin
  foreach child_table in array array[
    'operation_program_sections', 'operation_program_lines',
    'operation_budget_lines', 'operation_objectives',
    'operation_significant_works'
  ] loop
    execute format('drop policy if exists operation_child_read on public.%I', child_table);
    execute format(
      'create policy operation_child_read on public.%I for select to authenticated
       using (public.has_permission(''operations.view''))',
      child_table
    );
    execute format('drop policy if exists operation_child_insert on public.%I', child_table);
    execute format(
      'create policy operation_child_insert on public.%I for insert to authenticated
       with check (public.has_any_permission(array[
         ''operations.edit_program'', ''operations.edit_budget'',
         ''operations.edit_objectives'', ''operations.edit_synthesis''
       ]))',
      child_table
    );
    execute format('drop policy if exists operation_child_update on public.%I', child_table);
    execute format(
      'create policy operation_child_update on public.%I for update to authenticated
       using (public.has_any_permission(array[
         ''operations.edit_program'', ''operations.edit_budget'',
         ''operations.edit_objectives'', ''operations.edit_synthesis''
       ]))
       with check (public.has_any_permission(array[
         ''operations.edit_program'', ''operations.edit_budget'',
         ''operations.edit_objectives'', ''operations.edit_synthesis''
       ]))',
      child_table
    );
    execute format('drop policy if exists operation_child_delete on public.%I', child_table);
    execute format(
      'create policy operation_child_delete on public.%I for delete to authenticated
       using (public.has_any_permission(array[
         ''operations.edit_program'', ''operations.edit_budget'',
         ''operations.edit_objectives'', ''operations.edit_synthesis''
       ]))',
      child_table
    );
  end loop;
end $$;

drop policy if exists platform_migration_journal_read
  on public.platform_migration_journal;
create policy platform_migration_journal_read
on public.platform_migration_journal for select to authenticated
using (public.has_permission('admin.audit.view'));

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
