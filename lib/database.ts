import { Sequelize, DataTypes, ModelDefined, Optional } from 'sequelize';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcrypt';

export interface UserAttributes {
  id?: number;
  login: string;
  password?: string;
  role?: string;
  nickname?: string | null;
  avatar?: string | null;
}
interface UserCreationAttributes extends Optional<UserAttributes, 'id'> {}
export type UserModel = ModelDefined<UserAttributes, UserCreationAttributes>;

export interface RoomAttributes {
  id?: number;
  name: string;
  password?: string | null;
  adminOnly: boolean;
  createdBy?: string | null;
}
interface RoomCreationAttributes extends Optional<RoomAttributes, 'id'> {}
export type RoomModel = ModelDefined<RoomAttributes, RoomCreationAttributes>;

class Database {
  public sequelize: Sequelize;
  public User: UserModel;
  public Room: RoomModel
  public ready: Promise<void>;

  constructor() {
    const storage = path.join(process.cwd(), 'data', 'database.db');
    fs.mkdirSync(path.dirname(storage), { recursive: true });

    this.sequelize = new Sequelize({
      dialect: 'sqlite',
      storage,
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
    });

    this.User = this.sequelize.define(
      'User',
      {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        login: { type: DataTypes.STRING, allowNull: false, unique: true },
        password: { type: DataTypes.STRING, allowNull: true },
        role: { type: DataTypes.STRING, defaultValue: 'user' },
        nickname: { type: DataTypes.STRING, allowNull: true },
        avatar: { type: DataTypes.STRING, allowNull: true },
      },
      { timestamps: false },
    );

    this.Room = this.sequelize.define(
      'Room',
      {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        name: { type: DataTypes.STRING, allowNull: false, unique: true },
        password: { type: DataTypes.STRING, allowNull: true },
        adminOnly: { type: DataTypes.BOOLEAN, defaultValue: false },
        createdBy: { type: DataTypes.STRING, allowNull: true },
      },
      { timestamps: true },
    );

    this.ready = this.init();
  }

  private async init(): Promise<void> {
    await this.migrateLegacyRoles();
    await this.sequelize.sync();
    await this.seedAdmin();
    await this.ensureOwner();
  }

  private async seedAdmin(): Promise<void> {
    const count = await this.User.count();
    if (count > 0) return;
    const login = 'admin';
    const rawPassword = 'admin';
    const hash = await bcrypt.hash(rawPassword, 10);
    await this.User.create({ login, password: hash, role: 'owner', nickname: null });
    console.log(`[db] seeded initial owner user "${login}"`);
  }

  private async migrateLegacyRoles(): Promise<void> {
    const qi = this.sequelize.getQueryInterface();
    let table: Record<string, unknown>;
    try {
      table = (await qi.describeTable('Users')) as Record<string, unknown>;
    } catch {
      return;
    }
    if (table.role || (!table.isAdmin && !table.isOwner)) return;
    try {
      await qi.addColumn('Users', 'role', { type: DataTypes.STRING, defaultValue: 'user' });
      if (table.isOwner) {
        await this.sequelize.query("UPDATE `Users` SET `role` = 'owner' WHERE `isOwner` = 1");
      }
      await this.sequelize.query(
        "UPDATE `Users` SET `role` = 'admin' WHERE `isAdmin` = 1 AND (`role` = 'user' OR `role` IS NULL)",
      );
    } catch {
    }
  }

  private async ensureOwner(): Promise<void> {
    const ownerCount = await this.User.count({ where: { role: 'owner' } });
    if (ownerCount > 0) return;
    const first =
      (await this.User.findOne({ where: { role: 'admin' }, order: [['id', 'ASC']] })) ??
      (await this.User.findOne({ order: [['id', 'ASC']] }));
    if (!first) return;
    const id = (first.dataValues as any).id;
    await this.User.update({ role: 'owner' }, { where: { id } });
    console.log('[db] promoted earliest user to owner');
  }

  async close(): Promise<void> {
    await this.sequelize.close();
  }
}

const globalForDb = globalThis as unknown as { __cfDatabase?: Database };
const database = globalForDb.__cfDatabase ?? new Database();
if (process.env.NODE_ENV !== 'production') {
  globalForDb.__cfDatabase = database;
}

export default database;
