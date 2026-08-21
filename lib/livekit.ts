import { RoomServiceClient } from 'livekit-server-sdk';

function resolveHost(): string {
  if (process.env.LIVEKIT_SERVER_URL) return process.env.LIVEKIT_SERVER_URL;
  const url = process.env.LIVEKIT_URL;
  if (url) return url.replace(/^wss:\/\//i, 'https://').replace(/^ws:\/\//i, 'http://');
  return 'http://127.0.0.1:7880';
}

const HOST = resolveHost();
const API_KEY = process.env.LIVEKIT_API_KEY || '';
const API_SECRET = process.env.LIVEKIT_API_SECRET || '';

let client: RoomServiceClient | null = null;
function svc(): RoomServiceClient {
  if (!client) client = new RoomServiceClient(HOST, API_KEY, API_SECRET);
  return client;
}

export interface ActiveRoom {
  name: string;
  numParticipants: number;
}

export interface LiveParticipant {
  identity: string;
  name: string;
  isAdmin: boolean;
  joinedAt: number;
}

export async function listActiveRooms(): Promise<ActiveRoom[]> {
  const rooms = await svc().listRooms();
  return rooms.map((r) => ({ name: r.name, numParticipants: r.numParticipants }));
}

export async function listParticipants(roomName: string): Promise<LiveParticipant[]> {
  const participants = await svc().listParticipants(roomName);
  return participants.map((p) => {
    let isAdmin = false;
    try {
      isAdmin = !!JSON.parse(p.metadata || '{}').admin;
    } catch {
    }
    return {
      identity: p.identity,
      name: p.name || p.identity,
      isAdmin,
      joinedAt: Number(p.joinedAt),
    };
  });
}

export async function kickParticipant(roomName: string, identity: string): Promise<void> {
  await svc().removeParticipant(roomName, identity);
}
