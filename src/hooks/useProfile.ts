import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { isSchemaMigrationError, SCHEMA_MIGRATION_MESSAGE } from '../lib/permissions';
import { useStore } from '../store/useStore';
import type { Profile } from '../types/domain';

export function useProfile(): void {
  const user = useStore((state) => state.user);
  const setProfile = useStore((state) => state.setProfile);
  const setIsLoadingProfile = useStore((state) => state.setIsLoadingProfile);
  const setSchemaMessage = useStore((state) => state.setSchemaMessage);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      if (!user) {
        setProfile(null);
        setIsLoadingProfile(false);
        return;
      }

      setIsLoadingProfile(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, display_name, initials, role, created_at, updated_at')
        .eq('id', user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        setProfile(null);
        if (isSchemaMigrationError(error)) setSchemaMessage(SCHEMA_MIGRATION_MESSAGE);
      } else {
        setSchemaMessage(null);
        setProfile((data as Profile | null) ?? null);
      }
      setIsLoadingProfile(false);
    }

    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [setIsLoadingProfile, setProfile, setSchemaMessage, user]);
}
