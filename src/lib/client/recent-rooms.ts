'use client';

export interface RecentRoom {
  name: string;
  ts: number;
}

const STORAGE_KEY = 'cf_recent_rooms';
const MAX_ROOMS = 8;

const safeDecode = (name: string): string => {
  try {
    let decoded = name;
    for (let i = 0; i < 3 && /%[0-9a-fA-F]{2}/.test(decoded); i++) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
    return decoded;
  } catch {
    return name;
  }
};

export const getRecentRooms = (): RecentRoom[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (r): r is RecentRoom => !!r && typeof r.name === 'string' && typeof r.ts === 'number',
      )
      .map((r) => ({ ...r, name: safeDecode(r.name) }));
  } catch {
    return [];
  }
};

export const addRecentRoom = (name: string): void => {
  if (typeof window === 'undefined' || !name) return;
  try {
    const rooms = getRecentRooms().filter((r) => r.name !== name);
    rooms.unshift({ name, ts: Date.now() });
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms.slice(0, MAX_ROOMS)));
  } catch {
  }
};

export const removeRecentRoom = (name: string): void => {
  if (typeof window === 'undefined') return;
  try {
    const rooms = getRecentRooms().filter((r) => r.name !== name);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
  } catch {
  }
};
