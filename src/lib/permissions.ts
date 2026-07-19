import type { UserRole } from '../types/domain';

export type PermissionAction =
  | 'read'
  | 'contribute'
  | 'validateResolution'
  | 'deleteObservation'
  | 'deleteOperation'
  | 'administerUsers'
  | 'readAudit';

export type RolePermissions = Record<PermissionAction, boolean>;

const READER_PERMISSIONS: RolePermissions = {
  read: true,
  contribute: false,
  validateResolution: false,
  deleteObservation: false,
  deleteOperation: false,
  administerUsers: false,
  readAudit: false,
};

const PERMISSIONS: Record<UserRole, RolePermissions> = {
  lecteur: READER_PERMISSIONS,
  contributeur: {
    ...READER_PERMISSIONS,
    contribute: true,
  },
  responsable: {
    ...READER_PERMISSIONS,
    contribute: true,
    validateResolution: true,
    deleteObservation: true,
    deleteOperation: true,
  },
  admin: {
    read: true,
    contribute: true,
    validateResolution: true,
    deleteObservation: true,
    deleteOperation: true,
    administerUsers: true,
    readAudit: true,
  },
};

export function permissionsForRole(role: UserRole | null | undefined): RolePermissions {
  return PERMISSIONS[role ?? 'lecteur'];
}

export function can(
  role: UserRole | null | undefined,
  action: PermissionAction,
): boolean {
  return permissionsForRole(role)[action];
}

export function isSchemaMigrationError(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('code' in error)) return false;
  const code = String(error.code);
  return code === '42P01' || code === '42703' || code === 'PGRST204';
}

export const SCHEMA_MIGRATION_MESSAGE =
  "La base Supabase n'est pas encore à jour. Appliquez la migration DMO décrite dans docs/database-migration.md.";
