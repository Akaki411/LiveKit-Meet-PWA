export type Role = 'guest' | 'user' | 'admin' | 'owner';

export const ROLES: Role[] = ['user', 'admin', 'owner'];

const RANK: Record<Role, number> = { guest: 0, user: 1, admin: 2, owner: 3 };

export const roleRank = (role: string | null | undefined): number =>
  RANK[(role as Role) ?? 'guest'] ?? 0;

export const isAdminRole = (role: string | null | undefined): boolean =>
  role === 'admin' || role === 'owner';

export const isOwnerRole = (role: string | null | undefined): boolean => role === 'owner';

export interface ConferenceFlags {
  creator: boolean;
  admin: boolean;
}

export const conferenceAuthority = (flags: ConferenceFlags): number => {
  if (flags.creator) return 3;
  if (flags.admin) return 2;
  return 0;
};

export const canModerate = (actor: ConferenceFlags, target: ConferenceFlags): boolean => {
  const a = conferenceAuthority(actor);
  return a >= 2 && a > conferenceAuthority(target);
};
