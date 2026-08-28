interface RoomMeta {
  creatorIdentity: string | null;
  creatorLogin: string | null;
  ts: number;
}

const TTL_MS = 12 * 60 * 60 * 1000;
const MAX_ENTRIES = 5000;

const globalForRooms = globalThis as unknown as { __cfRooms?: Map<string, RoomMeta> };
const rooms: Map<string, RoomMeta> = globalForRooms.__cfRooms ?? new Map();
globalForRooms.__cfRooms = rooms;

const prune = (): void => {
  const now = Date.now();
  for (const [name, meta] of rooms) {
    if (now - meta.ts > TTL_MS) rooms.delete(name);
  }
  while (rooms.size > MAX_ENTRIES) {
    const oldest = rooms.keys().next().value;
    if (oldest === undefined) break;
    rooms.delete(oldest);
  }
};

export const getRoomMeta = (roomName: string): RoomMeta | null => rooms.get(roomName) ?? null;

export const setRoomCreator = (
  roomName: string,
  creatorIdentity: string,
  creatorLogin: string | null,
): void => {
  rooms.set(roomName, { creatorIdentity, creatorLogin, ts: Date.now() });
  prune();
};

export const isRoomCreator = (
  roomName: string,
  identity: string | null,
  login: string | null,
): boolean => {
  const meta = rooms.get(roomName);
  if (!meta) return false;
  if (login && meta.creatorLogin && meta.creatorLogin === login) return true;
  return !!identity && meta.creatorIdentity === identity;
};

export const forgetRoom = (roomName: string): void => {
  rooms.delete(roomName);
};
