export type Role = 'user' | 'admin' | 'owner';

export const ROLES: Role[] = ['user', 'admin', 'owner'];

export function isAdminRole(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'owner';
}

export function isOwnerRole(role: string | null | undefined): boolean {
  return role === 'owner';
}
