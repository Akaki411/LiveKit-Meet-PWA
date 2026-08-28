import type { Role } from './roles';

interface RoleChange {
  role: Role;
  ts: number;
}

const TTL_MS = 60 * 60 * 1000;
const MAX_ENTRIES = 1000;

const globalForCache = globalThis as unknown as { __cfRoleChanges?: Map<string, RoleChange> };
const changes: Map<string, RoleChange> = globalForCache.__cfRoleChanges ?? new Map();
globalForCache.__cfRoleChanges = changes;

const prune = (): void => {
  const now = Date.now();
  for (const [login, change] of changes) {
    if (now - change.ts > TTL_MS) changes.delete(login);
  }
  while (changes.size > MAX_ENTRIES) {
    const oldest = changes.keys().next().value;
    if (oldest === undefined) break;
    changes.delete(oldest);
  }
};

export const markRoleChange = (login: string, role: Role): void => {
  changes.delete(login);
  changes.set(login, { role, ts: Date.now() });
  prune();
};

export const getRoleChange = (login: string): Role | null => {
  const change = changes.get(login);
  if (!change) return null;
  if (Date.now() - change.ts > TTL_MS) {
    changes.delete(login);
    return null;
  }
  return change.role;
};
