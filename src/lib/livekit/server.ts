import { EgressClient, RoomServiceClient } from 'livekit-server-sdk';

const resolveHost = (): string => {
  if (process.env.LIVEKIT_SERVER_URL) return process.env.LIVEKIT_SERVER_URL;
  const url = process.env.LIVEKIT_URL;
  if (url) return url.replace(/^wss:\/\//i, 'https://').replace(/^ws:\/\//i, 'http://');
  return 'http://127.0.0.1:7880';
};

const HOST = resolveHost();
const API_KEY = process.env.LIVEKIT_API_KEY || '';
const API_SECRET = process.env.LIVEKIT_API_SECRET || '';

let client: RoomServiceClient | null = null;
const svc = (): RoomServiceClient => {
  if (!client) client = new RoomServiceClient(HOST, API_KEY, API_SECRET);
  return client;
};

let egress: EgressClient | null = null;
export const getEgressClient = (): EgressClient => {
  if (!egress) egress = new EgressClient(HOST, API_KEY, API_SECRET);
  return egress;
};

export interface ActiveRoom {
  name: string;
  numParticipants: number;
  createdAt: number;
}

export interface LiveParticipant {
  identity: string;
  name: string;
  isAdmin: boolean;
  role: string;
  joinedAt: number;
}

const parseRole = (metadata: string | undefined): string => {
  try {
    const meta = JSON.parse(metadata || '{}');
    if (typeof meta.role === 'string') return meta.role;
    return meta.admin ? 'admin' : 'user';
  } catch {
    return 'user';
  }
};

export const listActiveRooms = async (): Promise<ActiveRoom[]> => {
  const rooms = await svc().listRooms();
  return rooms.map((r) => ({
    name: r.name,
    numParticipants: r.numParticipants,
    createdAt: Number(r.creationTime) * 1000,
  }));
};

export const isRoomActive = async (roomName: string): Promise<boolean> => {
  try {
    const rooms = await svc().listRooms([roomName]);
    return rooms.some((r) => r.name === roomName && r.numParticipants > 0);
  } catch {
    return false;
  }
};

export const listParticipants = async (roomName: string): Promise<LiveParticipant[]> => {
  const participants = await svc().listParticipants(roomName);
  return participants.map((p) => {
    const role = parseRole(p.metadata);
    return {
      identity: p.identity,
      name: p.name || p.identity,
      isAdmin: role === 'admin' || role === 'owner',
      role,
      joinedAt: Number(p.joinedAt),
    };
  });
};

export const getParticipantRole = async (
  roomName: string,
  identity: string,
): Promise<string | null> => {
  try {
    const p = await svc().getParticipant(roomName, identity);
    return parseRole(p.metadata);
  } catch {
    return null;
  }
};

export interface ParticipantFlags {
  role: string;
  admin: boolean;
  creator: boolean;
}

export const getParticipantFlags = async (
  roomName: string,
  identity: string,
): Promise<ParticipantFlags | null> => {
  try {
    const p = await svc().getParticipant(roomName, identity);
    const role = parseRole(p.metadata);
    let creator = false;
    try {
      creator = JSON.parse(p.metadata || '{}').creator === true;
    } catch {
    }
    return { role, admin: role === 'admin' || role === 'owner', creator };
  } catch {
    return null;
  }
};

export const kickParticipant = async (roomName: string, identity: string): Promise<void> => {
  await svc().removeParticipant(roomName, identity);
};

export const endRoom = async (roomName: string): Promise<void> => {
  await svc().deleteRoom(roomName);
};
