-- Visibilité des observations : chacun ne voit que les observations de son espace
-- (celles qu'il a rédigées OU qui lui sont confiées comme réalisateur), sauf si son
-- rôle possède la permission `observations.view_all` (option « Voir toutes les
-- observations » cochable à la création/édition d'un rôle), qui accorde la lecture
-- de toutes les observations. Les informations DG restent réservées à
-- `observations.view_dg`.

-- 1) Restreindre la lecture par la RLS.
drop policy if exists observations_permission_read on public.observations;
create policy observations_permission_read on public.observations for select to authenticated
using (
  (
    public.has_permission('observations.view')
    and (
      -- voit TOUT : le rôle porte l'option « voir toutes les observations ».
      public.has_permission('observations.view_all')
      -- voit SON ESPACE : auteur ou réalisateur.
      or user_id = (select auth.uid())
      or assignee_user_id = (select auth.uid())
    )
  )
  -- la confidentialité DG reste protégée.
  and (not is_dg or public.has_permission('observations.view_dg'))
);
