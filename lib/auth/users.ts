import bcrypt from 'bcrypt';
import database from '../data/database';
import type { Role } from './roles';

export interface PublicUser {
  id: number;
  login: string;
  role: Role;
  nickname: string | null;
  avatar: string | null;
}

const toPublic = (row: any): PublicUser => {
  const v = row?.dataValues ?? row;
  return {
    id: v.id,
    login: v.login,
    role: (v.role as Role) ?? 'user',
    nickname: v.nickname ?? null,
    avatar: v.avatar ?? null,
  };
};

export const validateCredentials = async (
  login: string,
  password: string,
): Promise<PublicUser | null> => {
  await database.ready;
  const user = await database.User.findOne({ where: { login } });
  if (!user) return null;
  const hash = (user.dataValues as any).password as string | undefined;
  if (!hash) return null;
  const ok = await bcrypt.compare(password, hash);
  return ok ? toPublic(user) : null;
};

export const getUserByLogin = async (login: string): Promise<PublicUser | null> => {
  await database.ready;
  const user = await database.User.findOne({ where: { login } });
  return user ? toPublic(user) : null;
};

export const getUserById = async (id: number): Promise<PublicUser | null> => {
  await database.ready;
  const user = await database.User.findByPk(id);
  return user ? toPublic(user) : null;
};

export const setRole = async (id: number, role: Role): Promise<boolean> => {
  await database.ready;
  const [count] = await database.User.update({ role }, { where: { id } });
  return count > 0;
};

export const listUsers = async (): Promise<PublicUser[]> => {
  await database.ready;
  const users = await database.User.findAll({ order: [['id', 'ASC']] });
  return users.map(toPublic);
};

export const createUser = async (
  login: string,
  password: string,
  role: Role,
): Promise<PublicUser> => {
  await database.ready;
  const hash = await bcrypt.hash(password, 10);
  const user = await database.User.create({ login, password: hash, role, nickname: null });
  return toPublic(user);
};

export const deleteUser = async (id: number): Promise<boolean> => {
  await database.ready;
  const removed = await database.User.destroy({ where: { id } });
  return removed > 0;
};

export const setLastNickname = async (login: string, nickname: string): Promise<void> => {
  await database.ready;
  await database.User.update({ nickname }, { where: { login } });
};

export const updateLogin = async (
  currentLogin: string,
  newLogin: string,
): Promise<'ok' | 'exists' | 'notfound'> => {
  await database.ready;
  const existing = await database.User.findOne({ where: { login: newLogin } });
  if (existing) return 'exists';
  const [count] = await database.User.update(
    { login: newLogin },
    { where: { login: currentLogin } },
  );
  return count > 0 ? 'ok' : 'notfound';
};

export const updatePassword = async (
  login: string,
  currentPassword: string,
  newPassword: string,
): Promise<boolean> => {
  await database.ready;
  const user = await database.User.findOne({ where: { login } });
  if (!user) return false;
  const hash = (user.dataValues as any).password as string | undefined;
  if (!hash || !(await bcrypt.compare(currentPassword, hash))) return false;
  const newHash = await bcrypt.hash(newPassword, 10);
  await database.User.update({ password: newHash }, { where: { login } });
  return true;
};

export const setAvatar = async (login: string, avatar: string | null): Promise<string | null> => {
  await database.ready;
  const user = await database.User.findOne({ where: { login } });
  if (!user) return null;
  const previous = (user.dataValues as any).avatar ?? null;
  await database.User.update({ avatar }, { where: { login } });
  return previous;
};
