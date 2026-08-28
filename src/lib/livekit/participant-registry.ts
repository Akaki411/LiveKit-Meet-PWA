import type { Role } from '@/lib/auth/roles';

export interface ParticipantInfo {
  ip: string | null;
  role: Role;
  name: string;
  login: string | null;
  ts: number;
}

const TTL_MS = 12 * 60 * 60 * 1000;
const MAX_ENTRIES = 5000;

const globalForRegistry = globalThis as unknown as {
  __cfParticipants?: Map<string, ParticipantInfo>;
};
const registry: Map<string, ParticipantInfo> = globalForRegistry.__cfParticipants ?? new Map();
globalForRegistry.__cfParticipants = registry;

const key = (roomName: string, identity: string): string => `${roomName} ${identity}`;

const prune = (): void => {
  const now = Date.now();
  for (const [k, info] of registry) {
    if (now - info.ts > TTL_MS) registry.delete(k);
  }
  while (registry.size > MAX_ENTRIES) {
    const oldest = registry.keys().next().value;
    if (oldest === undefined) break;
    registry.delete(oldest);
  }
};

export const recordParticipant = (
  roomName: string,
  identity: string,
  info: Omit<ParticipantInfo, 'ts'>,
): void => {
  registry.set(key(roomName, identity), { ...info, ts: Date.now() });
  prune();
};

export const getParticipantInfo = (
  roomName: string,
  identity: string,
): ParticipantInfo | null => registry.get(key(roomName, identity)) ?? null;

export const forgetParticipant = (roomName: string, identity: string): void => {
  registry.delete(key(roomName, identity));
};
