import type { NextRequest } from 'next/server';
import { ROOM_TOKEN_COOKIE, verifyRoomToken, type RoomTokenData } from '@/lib/auth/room-token';
import { listParticipants } from './server';

const CACHE_MS = 5000;
const cache = new Map<string, { ids: Set<string>; ts: number }>();

const connectedIdentities = async (roomName: string): Promise<Set<string>> => {
  const now = Date.now();
  const cached = cache.get(roomName);
  if (cached && now - cached.ts < CACHE_MS) return cached.ids;
  let ids = new Set<string>();
  try {
    const participants = await listParticipants(roomName);
    ids = new Set(participants.map((p) => p.identity));
  } catch {
  }
  cache.set(roomName, { ids, ts: now });
  return ids;
};

export const verifyRoomAccess = async (request: NextRequest): Promise<RoomTokenData | null> => {
  const token = await verifyRoomToken(request.cookies.get(ROOM_TOKEN_COOKIE)?.value);
  if (!token) return null;
  const ids = await connectedIdentities(token.room);
  if (!ids.has(token.identity)) return null;
  return token;
};
