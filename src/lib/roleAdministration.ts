import { normalizePermissionKeys } from './accessControl';

export function buildRolePermissionRows(roleId: string, keys: readonly string[]) {
  return normalizePermissionKeys(keys).map((permissionKey) => ({
    role_id: roleId,
    permission_key: permissionKey,
  }));
}

export function validateNewUser(input: { email: string; mode: 'invite' | 'create'; password: string }): string | null {
  if (!/^\S+@\S+\.\S+$/.test(input.email.trim())) return 'Saisissez une adresse e-mail valide.';
  if (input.mode === 'create' && input.password.length < 12) {
    return 'Le mot de passe temporaire doit contenir au moins 12 caractères.';
  }
  return null;
}
