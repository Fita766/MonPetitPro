-- Retire les anciennes politiques de démonstration qui court-circuitaient
-- les autorisations granulaires installées par les migrations DMO.

begin;

drop policy if exists "Allow authenticated full access on operations"
  on public.operations;
drop policy if exists "Allow authenticated full access on observations"
  on public.observations;

-- La migration doit échouer si une politique équivalente reste active sur
-- les deux tables les plus sensibles.
do $$
declare
  broad_policy_count integer;
begin
  select count(*)
    into broad_policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename in ('operations', 'observations')
    and 'authenticated' = any(roles)
    and cmd = 'ALL'
    and coalesce(trim(qual), '') in ('true', '(true)')
    and coalesce(trim(with_check), '') in ('true', '(true)');

  if broad_policy_count > 0 then
    raise exception
      'Sécurité incomplète : % politique(s) authentifiée(s) sans restriction subsiste(nt)',
      broad_policy_count;
  end if;
end;
$$;

commit;
