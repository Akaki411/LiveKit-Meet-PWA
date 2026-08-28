import type { Role } from '@/lib/auth/roles';

export interface ParticipantMeta {
  role: Role;
  admin: boolean;
  creator: boolean;
  login: string | null;
  avatar: string | null;
}

export const parseParticipantMeta = (metadata: string | undefined): ParticipantMeta => {
  const fallback: ParticipantMeta = {
    role: 'guest',
    admin: false,
    creator: false,
    login: null,
    avatar: null,
  };
  if (!metadata) return fallback;
  try {
    const parsed = JSON.parse(metadata) as Partial<ParticipantMeta>;
    const role = (parsed.role as Role) ?? (parsed.admin ? 'admin' : 'user');
    return {
      role,
      admin: role === 'admin' || role === 'owner',
      creator: parsed.creator === true,
      login: typeof parsed.login === 'string' ? parsed.login : null,
      avatar: typeof parsed.avatar === 'string' ? parsed.avatar : null,
    };
  } catch {
    return fallback;
  }
};
