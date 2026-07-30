import type { PermissionKey } from '../types/domain';

export interface PermissionDefinition {
  key: PermissionKey;
  label: string;
  description: string;
}

export interface PermissionGroup {
  key: string;
  label: string;
  permissions: PermissionDefinition[];
}

const group = (key: string, label: string, permissions: Array<[PermissionKey, string, string]>): PermissionGroup => ({
  key,
  label,
  permissions: permissions.map(([permissionKey, permissionLabel, description]) => ({ key: permissionKey, label: permissionLabel, description })),
});

export const PERMISSION_GROUPS: PermissionGroup[] = [
  group('operations', 'Opérations', [
    ['operations.view', 'Consulter les opérations', 'Voir le tableau et les fiches opération.'],
    ['operations.create', 'Créer une opération', 'Ajouter une nouvelle opération.'],
    ['operations.edit_identity', 'Modifier l’identité', 'Stade, numéros, adresse, type et promoteur.'],
    ['operations.edit_team', 'Modifier l’équipe', 'CTX, COP, assistantes et gestionnaire.'],
    ['operations.edit_program', 'Modifier le programme', 'Logements, typologies, labels et caractéristiques.'],
    ['operations.edit_planning', 'Modifier le planning', 'Dates prévisionnelles, contractuelles et réelles.'],
    ['operations.edit_budget', 'Modifier les budgets', 'Budgets, subventions et pénalités.'],
    ['operations.edit_conditions', 'Modifier les conditions', 'Conditions suspensives et dates de levée.'],
    ['operations.edit_objectives', 'Modifier les objectifs', 'Objectif annuel et données figées.'],
    ['operations.edit_synthesis', 'Modifier la synthèse', 'Description et travaux significatifs.'],
    ['operations.delete', 'Supprimer une opération', 'Supprimer une opération et ses données liées.'],
    ['operations.export', 'Exporter les opérations', 'Créer les exports PDF et Excel.'],
  ]),
  group('observations', 'Observations', [
    ['observations.view', 'Consulter les observations', 'Voir les observations partagées.'],
    ['observations.view_dg', 'Consulter les observations DG', 'Voir les points marqués Direction générale.'],
    ['observations.create', 'Ajouter une observation', 'Créer un nouveau point de suivi.'],
    ['observations.edit_own', 'Modifier ses observations', 'Modifier les points dont la personne est l’auteur.'],
    ['observations.edit_all', 'Modifier toutes les observations', 'Modifier les points de tous les auteurs.'],
    ['observations.validate', 'Valider les résolutions', 'Confirmer qu’une résolution est acceptée.'],
    ['observations.delete', 'Supprimer des observations', 'Supprimer un point de suivi.'],
    ['observations.export', 'Exporter les observations', 'Créer les exports PDF et Excel.'],
  ]),
  group('documents', 'Documents', [
    ['documents.view', 'Consulter les documents', 'Voir la revue, les plans et les photos.'],
    ['documents.upload', 'Ajouter des documents', 'Déposer plans et photos.'],
    ['documents.review', 'Compléter la revue documentaire', 'Initialiser et renseigner les dates de réception.'],
    ['documents.delete', 'Supprimer des documents', 'Retirer un plan ou une photo.'],
  ]),
  group('references', 'Référentiels métier', [
    ['references.view', 'Consulter les référentiels', 'Utiliser les listes de communes, équipes, partenaires et caractéristiques.'],
    ['references.manage', 'Gérer les référentiels', 'Ajouter, corriger, ordonner et désactiver les valeurs proposées.'],
  ]),
  group('calendar', 'Calendriers', [
    ['calendar.view', 'Consulter les calendriers', 'Voir les jalons et agendas.'],
    ['calendar.manage', 'Gérer l’agenda libre', 'Créer, modifier et supprimer les événements libres.'],
    ['calendar.export', 'Exporter les calendriers', 'Créer les exports PDF et Excel.'],
  ]),
  group('objectives', 'Objectifs et statistiques', [
    ['objectives.view', 'Consulter les objectifs', 'Voir le suivi annuel DMO.'],
    ['objectives.manage', 'Gérer les objectifs', 'Créer et ajuster les objectifs autorisés.'],
    ['objectives.export', 'Exporter les objectifs', 'Créer les exports PDF et Excel.'],
    ['statistics.view', 'Consulter les statistiques', 'Voir les indicateurs DMO.'],
    ['statistics.export', 'Exporter les statistiques', 'Créer les exports PDF et Excel.'],
  ]),
  group('administration', 'Administration', [
    ['admin.users.view', 'Consulter les utilisateurs', 'Voir les comptes et leurs états.'],
    ['admin.users.manage', 'Modifier les utilisateurs', 'Modifier le profil et attribuer un rôle.'],
    ['admin.users.invite', 'Créer et inviter des utilisateurs', 'Envoyer une invitation ou un mot de passe temporaire.'],
    ['admin.users.suspend', 'Suspendre des utilisateurs', 'Bloquer et réactiver un compte.'],
    ['admin.roles.view', 'Consulter les rôles', 'Voir les rôles et leurs permissions.'],
    ['admin.roles.manage', 'Créer et modifier les rôles', 'Gérer la matrice des permissions.'],
    ['admin.audit.view', 'Consulter l’historique', 'Voir les actions administratives et métier.'],
    ['admin.demo_transfer', 'Transférer les données démo', 'Réaffecter les données au compte propriétaire.'],
  ]),
];

export const PERMISSION_DEFINITIONS = PERMISSION_GROUPS.flatMap((permissionGroup) => permissionGroup.permissions);
const KNOWN_KEYS = new Set<string>(PERMISSION_DEFINITIONS.map((permission) => permission.key));

export const ROLE_COLORS = [
  { key: 'teal', label: 'Vert canard', swatchClass: 'bg-teal-600', badgeClass: 'bg-teal-100 text-teal-900' },
  { key: 'emerald', label: 'Émeraude', swatchClass: 'bg-emerald-600', badgeClass: 'bg-emerald-100 text-emerald-900' },
  { key: 'green', label: 'Vert', swatchClass: 'bg-green-600', badgeClass: 'bg-green-100 text-green-900' },
  { key: 'lime', label: 'Citron vert', swatchClass: 'bg-lime-600', badgeClass: 'bg-lime-100 text-lime-900' },
  { key: 'amber', label: 'Ambre', swatchClass: 'bg-amber-500', badgeClass: 'bg-amber-100 text-amber-900' },
  { key: 'orange', label: 'Orange', swatchClass: 'bg-orange-600', badgeClass: 'bg-orange-100 text-orange-900' },
  { key: 'red', label: 'Rouge', swatchClass: 'bg-red-600', badgeClass: 'bg-red-100 text-red-900' },
  { key: 'rose', label: 'Rose', swatchClass: 'bg-rose-600', badgeClass: 'bg-rose-100 text-rose-900' },
  { key: 'fuchsia', label: 'Fuchsia', swatchClass: 'bg-fuchsia-600', badgeClass: 'bg-fuchsia-100 text-fuchsia-900' },
  { key: 'violet', label: 'Violet', swatchClass: 'bg-violet-600', badgeClass: 'bg-violet-100 text-violet-900' },
  { key: 'indigo', label: 'Indigo', swatchClass: 'bg-indigo-600', badgeClass: 'bg-indigo-100 text-indigo-900' },
  { key: 'slate', label: 'Gris ardoise', swatchClass: 'bg-slate-600', badgeClass: 'bg-slate-200 text-slate-900' },
] as const;

export type BroadPermissionAction = 'read' | 'contribute' | 'validateResolution' | 'deleteObservation' | 'deleteOperation' | 'administerUsers' | 'readAudit';

const BROAD_ACTION_KEYS: Record<BroadPermissionAction, PermissionKey[]> = {
  read: ['operations.view', 'observations.view', 'calendar.view', 'objectives.view', 'statistics.view'],
  contribute: ['operations.create', 'operations.edit_identity', 'observations.create', 'observations.edit_own'],
  validateResolution: ['observations.validate'],
  deleteObservation: ['observations.delete'],
  deleteOperation: ['operations.delete'],
  administerUsers: ['admin.users.manage', 'admin.roles.manage'],
  readAudit: ['admin.audit.view'],
};

export function normalizePermissionKeys(keys: readonly string[]): PermissionKey[] {
  return [...new Set(keys.filter((key): key is PermissionKey => KNOWN_KEYS.has(key)))];
}

export function broadActionGranted(keys: readonly PermissionKey[], action: BroadPermissionAction): boolean {
  return BROAD_ACTION_KEYS[action].some((key) => keys.includes(key));
}

export function permissionGranted(keys: readonly PermissionKey[], permission: PermissionKey): boolean {
  return keys.includes(permission);
}

export function accountAccessState(
  profile: { status?: 'pending' | 'active' | 'suspended' } | null,
): 'missing' | 'pending' | 'active' | 'suspended' {
  if (!profile) return 'missing';
  return profile.status ?? 'pending';
}
