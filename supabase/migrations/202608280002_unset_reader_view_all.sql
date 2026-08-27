-- Le rôle Lecteur historique ne doit pas voir toutes les observations par défaut :
-- il conserve `observations.view` (lire) mais perd `observations.view_all`. Un
-- administrateur peut toujours recocher l'option pour un rôle donné (y compris un
-- rôle Lecteur custom) via l'UI de gestion des rôles.
--
-- Le retrait touche un rôle système : on désactive temporairement le trigger de
-- protection, comme dans 202607300001, puis on le réactive.

alter table public.custom_role_permissions
  disable trigger protect_system_role_permissions;

delete from public.custom_role_permissions
where role_id = '10000000-0000-0000-0000-000000000004'::uuid
  and permission_key = 'observations.view_all';

alter table public.custom_role_permissions
  enable trigger protect_system_role_permissions;
