-- Extension DMO de MonPetitPro.
-- Migration additive et rejouable : aucune donnée existante n'est supprimée.

create extension if not exists "uuid-ossp";

do $$ begin
  create type public.user_role as enum ('admin', 'responsable', 'contributeur', 'lecteur');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.operation_stage as enum ('0', '0bis', '1', '1bis', '2', '3', '4', '5', '6');
exception when duplicate_object then null;
end $$;

-- Profil applicatif lié à auth.users.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  initials text,
  role public.user_role not null default 'contributeur',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_initials_length check (initials is null or char_length(initials) between 1 and 6)
);

-- Colonnes A à CG utiles du tableau TBL BORD.
alter table public.operations
  add column if not exists stage public.operation_stage,
  add column if not exists of_number text,
  add column if not exists gesprojet_number text,
  add column if not exists department text,
  add column if not exists commune text,
  add column if not exists address text,
  add column if not exists plus_units integer not null default 0,
  add column if not exists anru_units integer not null default 0,
  add column if not exists acv_units integer not null default 0,
  add column if not exists commercial_units integer not null default 0,
  add column if not exists other_units integer not null default 0,
  add column if not exists operations_manager text,
  add column if not exists assistant_name text,
  add column if not exists gpa_assistant_name text,
  add column if not exists manager_name text,
  add column if not exists animation_provider text,
  add column if not exists thermal_regulation text,
  add column if not exists certification text,
  add column if not exists clesence_bbca boolean,
  add column if not exists clesence_reversible boolean,
  add column if not exists clesence_land_sobriety boolean,
  add column if not exists clesence_green_space boolean,
  add column if not exists zoning text,
  add column if not exists category text,
  add column if not exists student_units integer not null default 0,
  add column if not exists specific_units integer not null default 0,
  add column if not exists co_cpi_date date,
  add column if not exists cei_cef_date date,
  add column if not exists csi_ca_date date,
  add column if not exists development_to_assembly_date date,
  add column if not exists approvals_submission_date date,
  add column if not exists lls_approval_date date,
  add column if not exists lli_approval_date date,
  add column if not exists anru_approval_date date,
  add column if not exists permit_number text,
  add column if not exists permit_submission_date date,
  add column if not exists permit_order_date date,
  add column if not exists tender_date date,
  add column if not exists vefa_cpr_or_sale_agreement_date date,
  add column if not exists vefa_deed_or_land_purchase_date date,
  add column if not exists works_order_expected_date date,
  add column if not exists works_order_actual_date date,
  add column if not exists m8_expected_date date,
  add column if not exists m8_actual_date date,
  add column if not exists assembly_to_works_date date,
  add column if not exists m7_expected_date date,
  add column if not exists m7_actual_date date,
  add column if not exists m4_expected_date date,
  add column if not exists m4_actual_date date,
  add column if not exists show_home_expected_date date,
  add column if not exists show_home_actual_date date,
  add column if not exists opl_actual_date date,
  add column if not exists progress_status text,
  add column if not exists risk_assessment text,
  add column if not exists delivery_reservations_count integer,
  add column if not exists reservations_per_housing numeric,
  add column if not exists delivery_delay_days integer,
  add column if not exists justified_delay_days integer,
  add column if not exists effective_delay_days integer,
  add column if not exists authorized_deadline_date date,
  add column if not exists deadline_status text,
  add column if not exists penalty_amount numeric,
  add column if not exists reservations_clearance_date date,
  add column if not exists dpe text,
  add column if not exists management_expected_date date,
  add column if not exists management_actual_date date,
  add column if not exists m3_reservations_meeting_date date,
  add column if not exists m10_date date,
  add column if not exists gpa_end_date date,
  add column if not exists gpa_count integer,
  add column if not exists h2_deadline_date date,
  add column if not exists h2_actual_date date,
  add column if not exists objective_year integer,
  add column if not exists is_objective boolean not null default false,
  add column if not exists objective_management_date date,
  add column if not exists objective_housing_units integer,
  add column if not exists synthesis_description text,
  add column if not exists significant_works text,
  add column if not exists updated_at timestamptz not null default now();

-- Les noms déjà utilisés par le frontend restent la source de compatibilité :
-- contractual_delivery_date = AZ, expected_delivery_date = BL,
-- actual_delivery_date = BN, daact_date = BX.

create index if not exists operations_stage_idx on public.operations(stage);
create index if not exists operations_department_idx on public.operations(department);
create index if not exists operations_commune_idx on public.operations(commune);
create index if not exists operations_cop_idx on public.operations(operations_manager);
create index if not exists operations_ctx_idx on public.operations(project_manager);
create index if not exists operations_promoter_idx on public.operations(promoter_name);
create index if not exists operations_objective_idx on public.operations(objective_year) where is_objective;

create table if not exists public.operation_typologies (
  id uuid primary key default uuid_generate_v4(),
  operation_id uuid not null references public.operations(id) on delete cascade,
  typology text not null check (typology in ('T1', 'T2', 'T3', 'T4', 'Global')),
  product text not null check (product in ('PLUS', 'PLAI', 'PLS', 'LLI', 'BRS', 'PSLA')),
  units integer check (units is null or units >= 0),
  average_surface numeric check (average_surface is null or average_surface >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(operation_id, typology, product)
);

create table if not exists public.operation_subsidies (
  id uuid primary key default uuid_generate_v4(),
  operation_id uuid not null references public.operations(id) on delete cascade,
  provider text not null,
  purpose text not null default '',
  amount numeric check (amount is null or amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.suspensive_conditions (
  id uuid primary key default uuid_generate_v4(),
  operation_id uuid not null references public.operations(id) on delete cascade,
  subject text not null,
  deadline_date date,
  completion_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.operation_documents (
  id uuid primary key default uuid_generate_v4(),
  operation_id uuid not null references public.operations(id) on delete cascade,
  kind text not null check (kind in ('plan', 'photo')),
  storage_path text not null unique,
  caption text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.document_review_items (
  id uuid primary key default uuid_generate_v4(),
  operation_id uuid not null references public.operations(id) on delete cascade,
  category text not null,
  label text not null,
  offset_months integer,
  expected_date date,
  received_date date,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Agenda libre conservé à côté des calendriers métier calculés.
create table if not exists public.events (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  event_date date not null,
  event_time time,
  description text,
  operation_id uuid references public.operations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists events_date_idx on public.events(event_date);
create index if not exists events_operation_idx on public.events(operation_id);

alter table public.observations
  add column if not exists author_initials text,
  add column if not exists resolution_date date,
  add column if not exists resolution_validated_at timestamptz,
  add column if not exists resolution_validated_by uuid references auth.users(id),
  add column if not exists is_dg boolean not null default false,
  add column if not exists status text;

create index if not exists observations_dg_idx on public.observations(is_dg) where is_dg;
create index if not exists suspensive_conditions_deadline_idx on public.suspensive_conditions(deadline_date);

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  record_id uuid,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  changed_by uuid references auth.users(id) on delete set null,
  old_values jsonb,
  new_values jsonb,
  changed_at timestamptz not null default now()
);
create index if not exists audit_log_record_idx on public.audit_log(table_name, record_id, changed_at desc);

-- Les comptes créés avant cette migration reçoivent eux aussi un profil.
insert into public.profiles (id, email, display_name, initials)
select id, email, coalesce(raw_user_meta_data ->> 'full_name', split_part(coalesce(email, ''), '@', 1)),
       upper(left(coalesce(raw_user_meta_data ->> 'full_name', email, '??'), 2))
from auth.users
on conflict (id) do nothing;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.freeze_operation_objective()
returns trigger language plpgsql set search_path = public as $$
begin
  if not new.is_objective then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.objective_management_date := coalesce(new.objective_management_date, new.management_expected_date);
    new.objective_housing_units := coalesce(new.objective_housing_units, new.total_housing_units, 0);
  elsif old.is_objective is distinct from true
    or old.objective_year is distinct from new.objective_year
    or old.objective_management_date is null then
    new.objective_management_date := coalesce(new.objective_management_date, new.management_expected_date);
    new.objective_housing_units := coalesce(new.objective_housing_units, new.total_housing_units, 0);
  else
    new.objective_management_date := old.objective_management_date;
    new.objective_housing_units := old.objective_housing_units;
  end if;
  return new;
end;
$$;

drop trigger if exists freeze_operation_objective on public.operations;
create trigger freeze_operation_objective before insert or update on public.operations
for each row execute function public.freeze_operation_objective();

create or replace function public.current_user_role()
returns public.user_role language sql stable security definer set search_path = public as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'lecteur'::public.user_role);
$$;

create or replace function public.can_edit_operations()
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_user_role() in ('admin', 'responsable', 'contributeur');
$$;

create or replace function public.can_validate_observations()
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_user_role() in ('admin', 'responsable');
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name, initials)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1)),
    upper(left(coalesce(new.raw_user_meta_data ->> 'display_name', new.email, '?'), 2))
  ) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.write_audit_log()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  row_id uuid;
begin
  row_id := case when tg_op = 'DELETE' then old.id else new.id end;
  insert into public.audit_log(table_name, record_id, action, changed_by, old_values, new_values)
  values (
    tg_table_name,
    row_id,
    tg_op,
    auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

do $$
declare table_to_audit text;
begin
  foreach table_to_audit in array array[
    'operations', 'observations', 'operation_typologies', 'operation_subsidies',
    'suspensive_conditions', 'operation_documents', 'document_review_items', 'events', 'profiles'
  ] loop
    execute format('drop trigger if exists audit_%I on public.%I', table_to_audit, table_to_audit);
    execute format(
      'create trigger audit_%I after insert or update or delete on public.%I for each row execute function public.write_audit_log()',
      table_to_audit, table_to_audit
    );
  end loop;
end $$;

do $$
declare table_with_updated_at text;
begin
  foreach table_with_updated_at in array array[
    'operations', 'profiles', 'operation_typologies', 'operation_subsidies',
    'suspensive_conditions', 'document_review_items', 'events'
  ] loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', table_with_updated_at, table_with_updated_at);
    execute format(
      'create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      table_with_updated_at, table_with_updated_at
    );
  end loop;
end $$;

-- RLS uniforme : lecture authentifiée, écriture contributeur+, suppression responsable+.
alter table public.profiles enable row level security;
alter table public.operations enable row level security;
alter table public.observations enable row level security;
alter table public.operation_typologies enable row level security;
alter table public.operation_subsidies enable row level security;
alter table public.suspensive_conditions enable row level security;
alter table public.operation_documents enable row level security;
alter table public.document_review_items enable row level security;
alter table public.events enable row level security;
alter table public.audit_log enable row level security;

do $$
declare shared_table text;
begin
  foreach shared_table in array array[
    'operations', 'operation_typologies', 'operation_subsidies',
    'suspensive_conditions', 'operation_documents', 'document_review_items', 'events'
  ] loop
    execute format('drop policy if exists authenticated_read on public.%I', shared_table);
    execute format('create policy authenticated_read on public.%I for select to authenticated using (true)', shared_table);
    execute format('drop policy if exists contributors_insert on public.%I', shared_table);
    execute format('create policy contributors_insert on public.%I for insert to authenticated with check (public.can_edit_operations())', shared_table);
    execute format('drop policy if exists contributors_update on public.%I', shared_table);
    execute format('create policy contributors_update on public.%I for update to authenticated using (public.can_edit_operations()) with check (public.can_edit_operations())', shared_table);
    execute format('drop policy if exists responsible_delete on public.%I', shared_table);
    execute format('create policy responsible_delete on public.%I for delete to authenticated using (public.can_validate_observations())', shared_table);
  end loop;
end $$;

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated using (true);
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid() and role = public.current_user_role());
drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles for update to authenticated
using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');

drop policy if exists observations_read on public.observations;
create policy observations_read on public.observations for select to authenticated using (true);
drop policy if exists observations_insert on public.observations;
create policy observations_insert on public.observations for insert to authenticated
with check (public.can_edit_operations() and user_id = auth.uid());
drop policy if exists observations_contributor_update on public.observations;
create policy observations_contributor_update on public.observations for update to authenticated
using (public.can_edit_operations()) with check (
  public.can_edit_operations()
  and (resolution_validated_at is null or public.can_validate_observations())
);
drop policy if exists observations_responsible_delete on public.observations;
create policy observations_responsible_delete on public.observations for delete to authenticated
using (public.can_validate_observations());

drop policy if exists audit_admin_read on public.audit_log;
create policy audit_admin_read on public.audit_log for select to authenticated
using (public.current_user_role() = 'admin');

insert into storage.buckets (id, name, public)
values ('operation-documents', 'operation-documents', false)
on conflict (id) do update set public = false;

drop policy if exists operation_documents_read on storage.objects;
create policy operation_documents_read on storage.objects for select to authenticated
using (bucket_id = 'operation-documents');
drop policy if exists operation_documents_insert on storage.objects;
create policy operation_documents_insert on storage.objects for insert to authenticated
with check (bucket_id = 'operation-documents' and public.can_edit_operations());
drop policy if exists operation_documents_update on storage.objects;
create policy operation_documents_update on storage.objects for update to authenticated
using (bucket_id = 'operation-documents' and public.can_edit_operations());
drop policy if exists operation_documents_delete on storage.objects;
create policy operation_documents_delete on storage.objects for delete to authenticated
using (bucket_id = 'operation-documents' and public.can_validate_observations());

-- Amorçage : après application, promouvoir explicitement le premier administrateur :
-- update public.profiles set role = 'admin' where email = 'adresse@exemple.fr';

-- Assertions de fin de migration : une transaction échoue si le socle est incomplet.
do $$
declare missing_count integer;
begin
  select count(*) into missing_count
  from (values
    ('profiles'), ('operation_typologies'), ('operation_subsidies'),
    ('suspensive_conditions'), ('operation_documents'),
    ('document_review_items'), ('events'), ('audit_log')
  ) expected(table_name)
  where to_regclass('public.' || expected.table_name) is null;

  if missing_count > 0 then
    raise exception 'Migration DMO incomplète : % table(s) manquante(s)', missing_count;
  end if;

  select count(*) into missing_count
  from (values
    ('stage'), ('of_number'), ('gesprojet_number'), ('department'), ('commune'),
    ('operations_manager'), ('management_expected_date'), ('management_actual_date'),
    ('objective_year'), ('is_objective')
  ) expected(column_name)
  where not exists (
    select 1 from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'operations'
      and c.column_name = expected.column_name
  );

  if missing_count > 0 then
    raise exception 'Migration DMO incomplète : % colonne(s) operations manquante(s)', missing_count;
  end if;
end $$;
