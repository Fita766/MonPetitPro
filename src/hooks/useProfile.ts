import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { isSchemaMigrationError, SCHEMA_MIGRATION_MESSAGE } from '../lib/permissions';
import { useStore } from '../store/useStore';
import { normalizePermissionKeys } from '../lib/accessControl';
import type { Profile } from '../types/domain';

export function useProfile(): void {
  const user = useStore((state) => state.user);
  const setProfile = useStore((state) => state.setProfile);
  const setPermissions = useStore((state) => state.setPermissions);
  const setIsLoadingProfile = useStore((state) => state.setIsLoadingProfile);
  const setSchemaMessage = useStore((state) => state.setSchemaMessage);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      if (!user) {
        setProfile(null);
        setPermissions([]);
        setIsLoadingProfile(false);
        return;
      }

      setIsLoadingProfile(true);
      const [profileResult, permissionsResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, email, display_name, initials, role, custom_role_id, status, is_owner, must_change_password, last_seen_at, created_at, updated_at, custom_role:custom_roles(id, name, description, color_key, is_active, is_system)')
          .eq('id', user.id)
          .maybeSingle(),
        supabase.rpc('my_permissions'),
      ]);

      if (cancelled) return;

      if (profileResult.error || permissionsResult.error) {
        setProfile(null);
        setPermissions([]);
        const error = profileResult.error ?? permissionsResult.error;
        if (error && isSchemaMigrationError(error)) setSchemaMessage(SCHEMA_MIGRATION_MESSAGE);
      } else {
        setSchemaMessage(null);
        setProfile((profileResult.data as unknown as Profile | null) ?? null);
        const keys = ((permissionsResult.data ?? []) as Array<{ permission_key?: string } | string>)
          .map((row) => typeof row === 'string' ? row : row.permission_key ?? '');
        setPermissions(normalizePermissionKeys(keys));
      }
      setIsLoadingProfile(false);
    }

    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [setIsLoadingProfile, setPermissions, setProfile, setSchemaMessage, user]);
}
