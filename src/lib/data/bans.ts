import database from './database';

export interface PublicBan {
  id: number;
  ip: string;
  name: string | null;
  role: string | null;
  login: string | null;
  roomName: string | null;
  bannedBy: string | null;
  createdAt: string | null;
}

const toPublic = (row: any): PublicBan => {
  const v = row?.dataValues ?? row;
  return {
    id: v.id,
    ip: v.ip,
    name: v.name ?? null,
    role: v.role ?? null,
    login: v.login ?? null,
    roomName: v.roomName ?? null,
    bannedBy: v.bannedBy ?? null,
    createdAt: v.createdAt ? new Date(v.createdAt).toISOString() : null,
  };
};

export const isIpBanned = async (ip: string | null | undefined): Promise<boolean> => {
  if (!ip) return false;
  await database.ready;
  const count = await database.Ban.count({ where: { ip } });
  return count > 0;
};

export const addBan = async (data: {
  ip: string;
  name?: string | null;
  role?: string | null;
  login?: string | null;
  roomName?: string | null;
  bannedBy?: string | null;
}): Promise<PublicBan> => {
  await database.ready;
  const existing = await database.Ban.findOne({ where: { ip: data.ip } });
  if (existing) {
    await database.Ban.update(
      {
        name: data.name ?? null,
        role: data.role ?? null,
        login: data.login ?? null,
        roomName: data.roomName ?? null,
        bannedBy: data.bannedBy ?? null,
      },
      { where: { ip: data.ip } },
    );
    const updated = await database.Ban.findOne({ where: { ip: data.ip } });
    return toPublic(updated);
  }
  const ban = await database.Ban.create({
    ip: data.ip,
    name: data.name ?? null,
    role: data.role ?? null,
    login: data.login ?? null,
    roomName: data.roomName ?? null,
    bannedBy: data.bannedBy ?? null,
  });
  return toPublic(ban);
};

export const listBans = async (): Promise<PublicBan[]> => {
  await database.ready;
  const bans = await database.Ban.findAll({ order: [['id', 'DESC']] });
  return bans.map(toPublic);
};

export const removeBan = async (id: number): Promise<boolean> => {
  await database.ready;
  const removed = await database.Ban.destroy({ where: { id } });
  return removed > 0;
};
