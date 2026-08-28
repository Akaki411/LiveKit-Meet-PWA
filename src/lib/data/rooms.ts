import bcrypt from 'bcryptjs';
import database from './database';

export interface PublicRoom {
  id: number;
  name: string;
  adminOnly: boolean;
  hasPassword: boolean;
  createdBy: string | null;
}

const toPublic = (row: any): PublicRoom => {
  const v = row?.dataValues ?? row;
  return {
    id: v.id,
    name: v.name,
    adminOnly: !!v.adminOnly,
    hasPassword: !!v.password,
    createdBy: v.createdBy ?? null,
  };
};

const findRoom = async (name: string) => {
  await database.ready;
  return database.Room.findOne({ where: { name } });
};

export const listRooms = async (): Promise<PublicRoom[]> => {
  await database.ready;
  const rooms = await database.Room.findAll({ order: [['id', 'ASC']] });
  return rooms.map(toPublic);
};

export const createRoom = async (
  name: string,
  opts: { password?: string; adminOnly?: boolean; createdBy?: string },
): Promise<PublicRoom> => {
  await database.ready;
  const password = opts.password ? await bcrypt.hashSync(opts.password, 10) : null;
  const room = await database.Room.create({
    name,
    password,
    adminOnly: !!opts.adminOnly,
    createdBy: opts.createdBy ?? null,
  });
  return toPublic(room);
};

export const deleteRoom = async (id: number): Promise<boolean> => {
  await database.ready;
  const removed = await database.Room.destroy({ where: { id } });
  return removed > 0;
};

export interface RoomInfo {
  exists: boolean;
  adminOnly: boolean;
  requiresPassword: boolean;
}

export const getRoomCreatedBy = async (name: string): Promise<string | null> => {
  const room = await findRoom(name);
  if (!room) return null;
  return (room.dataValues as any).createdBy ?? null;
};

export const getRoomInfo = async (name: string): Promise<RoomInfo> => {
  const room = await findRoom(name);
  if (!room) return { exists: false, adminOnly: false, requiresPassword: false };
  const v = room.dataValues as any;
  return { exists: true, adminOnly: !!v.adminOnly, requiresPassword: !!v.password };
};

export type AccessDenial = 'admin_only' | 'password_required' | 'wrong_password';

export const checkRoomAccess = async (
  name: string,
  ctx: { isAdmin: boolean; password?: string },
): Promise<{ ok: true } | { ok: false; reason: AccessDenial }> => {
  const room = await findRoom(name);
  if (!room) return { ok: true };
  const v = room.dataValues as any;
  if (v.adminOnly && !ctx.isAdmin) return { ok: false, reason: 'admin_only' };
  if (v.password && !ctx.isAdmin) {
    if (!ctx.password) return { ok: false, reason: 'password_required' };
    const ok = await bcrypt.compareSync(ctx.password, v.password);
    if (!ok) return { ok: false, reason: 'wrong_password' };
  }
  return { ok: true };
};
