import bcrypt from 'bcrypt';
import database from './database';

export interface PublicRoom {
  id: number;
  name: string;
  adminOnly: boolean;
  hasPassword: boolean;
  createdBy: string | null;
}

function toPublic(row: any): PublicRoom {
  const v = row?.dataValues ?? row;
  return {
    id: v.id,
    name: v.name,
    adminOnly: !!v.adminOnly,
    hasPassword: !!v.password,
    createdBy: v.createdBy ?? null,
  };
}

async function findRoom(name: string) {
  await database.ready;
  return database.Room.findOne({ where: { name } });
}

export async function listRooms(): Promise<PublicRoom[]> {
  await database.ready;
  const rooms = await database.Room.findAll({ order: [['id', 'ASC']] });
  return rooms.map(toPublic);
}

export async function createRoom(
  name: string,
  opts: { password?: string; adminOnly?: boolean; createdBy?: string },
): Promise<PublicRoom> {
  await database.ready;
  const password = opts.password ? await bcrypt.hash(opts.password, 10) : null;
  const room = await database.Room.create({
    name,
    password,
    adminOnly: !!opts.adminOnly,
    createdBy: opts.createdBy ?? null,
  });
  return toPublic(room);
}

export async function deleteRoom(id: number): Promise<boolean> {
  await database.ready;
  const removed = await database.Room.destroy({ where: { id } });
  return removed > 0;
}

export interface RoomInfo {
  exists: boolean;
  adminOnly: boolean;
  requiresPassword: boolean;
}

export async function getRoomInfo(name: string): Promise<RoomInfo> {
  const room = await findRoom(name);
  if (!room) return { exists: false, adminOnly: false, requiresPassword: false };
  const v = room.dataValues as any;
  return { exists: true, adminOnly: !!v.adminOnly, requiresPassword: !!v.password };
}

export type AccessDenial = 'admin_only' | 'password_required' | 'wrong_password';

export async function checkRoomAccess(
  name: string,
  ctx: { isAdmin: boolean; password?: string },
): Promise<{ ok: true } | { ok: false; reason: AccessDenial }> {
  const room = await findRoom(name);
  if (!room) return { ok: true };
  const v = room.dataValues as any;
  if (v.adminOnly && !ctx.isAdmin) return { ok: false, reason: 'admin_only' };
  if (v.password && !ctx.isAdmin) {
    if (!ctx.password) return { ok: false, reason: 'password_required' };
    const ok = await bcrypt.compare(ctx.password, v.password);
    if (!ok) return { ok: false, reason: 'wrong_password' };
  }
  return { ok: true };
}
