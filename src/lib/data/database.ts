import path from 'node:path';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';

export interface UserAttributes {
  id?: number;
  login: string;
  password?: string;
  role?: string;
  nickname?: string | null;
  avatar?: string | null;
}

export interface RoomAttributes {
  id?: number;
  name: string;
  password?: string | null;
  adminOnly: boolean;
  createdBy?: string | null;
}

export interface BanAttributes {
  id?: number;
  ip: string;
  name?: string | null;
  role?: string | null;
  login?: string | null;
  roomName?: string | null;
  bannedBy?: string | null;
}

type Row = Record<string, unknown>;
interface Wrapped {
  dataValues: Row;
}
type Where = Record<string, unknown>;
type Order = Array<[string, 'ASC' | 'DESC']>;

const coerce = (value: unknown): unknown => {
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value === undefined) return null;
  return value;
};

class Table {
  constructor(
    private db: DatabaseSync,
    private name: string,
    private columns: string[],
    private timestamps: boolean,
  ) {}

  private wrap(row: Row | undefined): Wrapped | null {
    return row ? { dataValues: row } : null;
  }

  private buildWhere(where: Where | undefined): { clause: string; params: unknown[] } {
    const keys = where ? Object.keys(where) : [];
    if (keys.length === 0) return { clause: '', params: [] };
    const clause = ' WHERE ' + keys.map((k) => `"${k}" = ?`).join(' AND ');
    return { clause, params: keys.map((k) => coerce(where![k])) };
  }

  findOne(opts: { where?: Where } = {}): Wrapped | null {
    const { clause, params } = this.buildWhere(opts.where);
    const row = this.db
      .prepare(`SELECT * FROM "${this.name}"${clause} LIMIT 1`)
      .get(...(params as never[])) as Row | undefined;
    return this.wrap(row);
  }

  findByPk(id: number): Wrapped | null {
    return this.findOne({ where: { id } });
  }

  findAll(opts: { where?: Where; order?: Order } = {}): Wrapped[] {
    const { clause, params } = this.buildWhere(opts.where);
    let sql = `SELECT * FROM "${this.name}"${clause}`;
    if (opts.order && opts.order.length > 0) {
      sql += ' ORDER BY ' + opts.order.map(([c, d]) => `"${c}" ${d}`).join(', ');
    }
    const rows = this.db.prepare(sql).all(...(params as never[])) as Row[];
    return rows.map((r) => ({ dataValues: r }));
  }

  create(values: Row): Wrapped {
    const data: Row = { ...values };
    if (this.timestamps) {
      const now = new Date().toISOString();
      data.createdAt = now;
      data.updatedAt = now;
    }
    const keys = Object.keys(data).filter((k) => this.columns.includes(k));
    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT INTO "${this.name}" (${keys.map((k) => `"${k}"`).join(', ')}) VALUES (${placeholders})`;
    const result = this.db.prepare(sql).run(...(keys.map((k) => coerce(data[k])) as never[]));
    return this.findByPk(Number(result.lastInsertRowid))!;
  }

  update(values: Row, opts: { where?: Where }): [number] {
    const data: Row = { ...values };
    if (this.timestamps) data.updatedAt = new Date().toISOString();
    const keys = Object.keys(data).filter((k) => this.columns.includes(k));
    if (keys.length === 0) return [0];
    const setClause = keys.map((k) => `"${k}" = ?`).join(', ');
    const { clause, params } = this.buildWhere(opts.where);
    const sql = `UPDATE "${this.name}" SET ${setClause}${clause}`;
    const result = this.db
      .prepare(sql)
      .run(...([...keys.map((k) => coerce(data[k])), ...params] as never[]));
    return [Number(result.changes)];
  }

  destroy(opts: { where?: Where }): number {
    const { clause, params } = this.buildWhere(opts.where);
    const result = this.db.prepare(`DELETE FROM "${this.name}"${clause}`).run(...(params as never[]));
    return Number(result.changes);
  }

  count(opts: { where?: Where } = {}): number {
    const { clause, params } = this.buildWhere(opts.where);
    const row = this.db
      .prepare(`SELECT COUNT(*) AS c FROM "${this.name}"${clause}`)
      .get(...(params as never[])) as { c: number };
    return Number(row.c);
  }
}

class Database {
  public db: DatabaseSync;
  public User: Table;
  public Room: Table;
  public Ban: Table;
  public ready: Promise<void>;

  constructor() {
    const storage = path.join(process.cwd(), 'data', 'database.db');
    fs.mkdirSync(path.dirname(storage), { recursive: true });
    this.db = new DatabaseSync(storage);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS "Users" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "login" TEXT NOT NULL UNIQUE,
        "password" TEXT,
        "role" TEXT DEFAULT 'user',
        "nickname" TEXT,
        "avatar" TEXT
      );
      CREATE TABLE IF NOT EXISTS "Rooms" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "name" TEXT NOT NULL UNIQUE,
        "password" TEXT,
        "adminOnly" INTEGER DEFAULT 0,
        "createdBy" TEXT,
        "createdAt" TEXT,
        "updatedAt" TEXT
      );
      CREATE TABLE IF NOT EXISTS "Bans" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "ip" TEXT NOT NULL,
        "name" TEXT,
        "role" TEXT,
        "login" TEXT,
        "roomName" TEXT,
        "bannedBy" TEXT,
        "createdAt" TEXT,
        "updatedAt" TEXT
      );
    `);

    this.User = new Table(this.db, 'Users', ['login', 'password', 'role', 'nickname', 'avatar'], false);
    this.Room = new Table(
      this.db,
      'Rooms',
      ['name', 'password', 'adminOnly', 'createdBy', 'createdAt', 'updatedAt'],
      true,
    );
    this.Ban = new Table(
      this.db,
      'Bans',
      ['ip', 'name', 'role', 'login', 'roomName', 'bannedBy', 'createdAt', 'updatedAt'],
      true,
    );

    this.ready = this.init();
  }

  private async init(): Promise<void> {
    await this.seedAdmin();
    await this.ensureOwner();
  }

  private async seedAdmin(): Promise<void> {
    if (this.User.count() > 0) return;
    const hash = await bcrypt.hashSync('admin', 10);
    this.User.create({ login: 'admin', password: hash, role: 'owner', nickname: null });
    console.log('[db] seeded initial owner user "admin"');
  }

  private async ensureOwner(): Promise<void> {
    if (this.User.count({ where: { role: 'owner' } }) > 0) return;
    const first =
      this.User.findOne({ where: { role: 'admin' } }) ??
      this.User.findAll({ order: [['id', 'ASC']] })[0] ??
      null;
    if (!first) return;
    this.User.update({ role: 'owner' }, { where: { id: first.dataValues.id } });
    console.log('[db] promoted earliest user to owner');
  }
}

const globalForDb = globalThis as unknown as { __cfDatabase?: Database };
const database = globalForDb.__cfDatabase ?? new Database();
globalForDb.__cfDatabase = database;

export default database;
