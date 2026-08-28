'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  IconCrown,
  IconPlus,
  IconRefresh,
  IconShield,
  IconShieldOff,
  IconTrash,
  IconUserX,
  IconX,
} from '@tabler/icons-react';
import { PasswordInput } from '@/lib/components/common/password-input';
import { isOwnerRole, type Role } from '@/lib/auth/roles';
import styles from '../../../styles/admin.module.css';

interface User {
  id: number;
  login: string;
  role: Role;
  nickname: string | null;
}
interface Room {
  id: number;
  name: string;
  adminOnly: boolean;
  hasPassword: boolean;
  createdBy: string | null;
}
interface ActiveRoom {
  name: string;
  numParticipants: number;
  createdAt: number;
}
interface Participant {
  identity: string;
  name: string;
  isAdmin: boolean;
}
interface Ban {
  id: number;
  ip: string;
  name: string | null;
  role: string | null;
  login: string | null;
  roomName: string | null;
  bannedBy: string | null;
  createdAt: string | null;
}

const ERROR_KEYS: Record<string, string> = {
  login_required: 'admin.errLoginRequired',
  user_exists: 'admin.errUserExists',
  room_name_required: 'admin.errRoomRequired',
  room_exists: 'admin.errRoomExists',
  cannot_delete_self: 'admin.errCannotDeleteSelf',
  livekit_unavailable: 'admin.errLivekitUnavailable',
  kick_failed: 'admin.errKickFailed',
  cannot_delete_owner: 'admin.errCannotDeleteOwner',
  owner_required: 'admin.errOwnerRequired',
  cannot_modify_owner: 'admin.errCannotModifyOwner',
};

const RoleBadge = ({ role }: { role: Role }) => {
  const { t } = useTranslation();
  const badges: Record<Role, React.ReactNode> = {
    owner: (
      <span className={styles.ownerPill}>
        <IconCrown size={12} />
        {t('admin.roleOwner')}
      </span>
    ),
    admin: <span className={styles.redPill}>{t('admin.roleAdmin')}</span>,
    user: <span className={styles.bluePill}>{t('admin.roleUser')}</span>,
    guest: <span className={styles.grayPill}>{t('admin.roleGuest')}</span>,
  };
  return <>{badges[role] ?? badges.user}</>;
};

export const AdminPanel = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const { t } = useTranslation();

  const [mounted, setMounted] = React.useState(false);
  const [visible, setVisible] = React.useState(false);

  const [users, setUsers] = React.useState<User[]>([]);
  const [rooms, setRooms] = React.useState<Room[]>([]);
  const [active, setActive] = React.useState<ActiveRoom[]>([]);
  const [participants, setParticipants] = React.useState<Record<string, Participant[]>>({});
  const [bans, setBans] = React.useState<Ban[]>([]);
  const [error, setError] = React.useState('');
  const [viewerRole, setViewerRole] = React.useState<Role>('user');
  const [viewerLogin, setViewerLogin] = React.useState('');

  const [uLogin, setULogin] = React.useState('');
  const [uPassword, setUPassword] = React.useState('');
  const [uAdmin, setUAdmin] = React.useState(false);

  const [rName, setRName] = React.useState('');
  const [rPassword, setRPassword] = React.useState('');
  const [rAdminOnly, setRAdminOnly] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setMounted(true);
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
    const timer = setTimeout(() => setMounted(false), 250);
    return () => clearTimeout(timer);
  }, [open]);

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const showError = React.useCallback(
    async (res: Response) => {
      let code;
      try {
        code = (await res.json())?.error ?? '';
      } catch {
        code = '';
      }
      setError(t(ERROR_KEYS[code] ?? 'admin.error'));
    },
    [t],
  );

  const loadViewer = React.useCallback(async () => {
    const res = await fetch('/api/me');
    if (res.ok) {
      const data = await res.json();
      setViewerRole((data?.role as Role) ?? 'user');
      setViewerLogin(data?.login ?? '');
    }
  }, []);
  const loadUsers = React.useCallback(async () => {
    const res = await fetch('/api/admin/users');
    if (res.ok) setUsers(await res.json());
  }, []);
  const loadRooms = React.useCallback(async () => {
    const res = await fetch('/api/admin/rooms');
    if (res.ok) setRooms(await res.json());
  }, []);
  const loadActive = React.useCallback(async () => {
    const res = await fetch('/api/admin/participants');
    if (res.ok) setActive(await res.json());
    else setActive([]);
  }, []);
  const loadBans = React.useCallback(async () => {
    const res = await fetch('/api/admin/bans');
    if (res.ok) setBans(await res.json());
    else setBans([]);
  }, []);

  React.useEffect(() => {
    if (open) {
      setError('');
      loadViewer();
      loadUsers();
      loadRooms();
      loadActive();
      loadBans();
    }
  }, [open, loadViewer, loadUsers, loadRooms, loadActive, loadBans]);

  const unban = async (id: number) => {
    if (!window.confirm(t('admin.confirmUnban'))) return;
    const res = await fetch(`/api/admin/bans/${id}`, { method: 'DELETE' });
    if (res.ok) await loadBans();
    else await showError(res);
  };

  const createUser = async () => {
    setError('');
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: uLogin, password: uPassword, isAdmin: uAdmin }),
    });
    if (res.ok) {
      setULogin('');
      setUPassword('');
      setUAdmin(false);
      await loadUsers();
    } else {
      await showError(res);
    }
  };

  const deleteUser = async (id: number) => {
    if (!window.confirm(t('admin.confirmDeleteUser'))) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    if (res.ok) await loadUsers();
    else await showError(res);
  };

  const changeRole = async (id: number, makeAdmin: boolean) => {
    setError('');
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isAdmin: makeAdmin }),
    });
    if (res.ok) await loadUsers();
    else await showError(res);
  };

  const createRoom = async () => {
    setError('');
    const res = await fetch('/api/admin/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: rName,
        password: rPassword || undefined,
        adminOnly: rAdminOnly,
      }),
    });
    if (res.ok) {
      setRName('');
      setRPassword('');
      setRAdminOnly(false);
      await loadRooms();
    } else {
      await showError(res);
    }
  };

  const deleteRoom = async (id: number) => {
    if (!window.confirm(t('admin.confirmDeleteRoom'))) return;
    const res = await fetch(`/api/admin/rooms/${id}`, { method: 'DELETE' });
    if (res.ok) loadRooms();
    else await showError(res);
  };

  const loadParticipants = async (roomName: string) => {
    const res = await fetch(`/api/admin/participants?roomName=${encodeURIComponent(roomName)}`);
    if (!res.ok) return;
    const data: Participant[] = await res.json();
    setParticipants((p) => ({ ...p, [roomName]: data }));
  };

  const kick = async (roomName: string, identity: string) => {
    const res = await fetch('/api/admin/participants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomName, identity }),
    });
    if (res.ok) {
      await loadParticipants(roomName);
      await loadActive();
    } else {
      await showError(res);
    }
  };

  const viewerIsOwner = isOwnerRole(viewerRole);
  const canDelete = (u: User) => {
    if (isOwnerRole(u.role)) return false;
    if (u.login === viewerLogin) return false;
    return !(u.role === 'admin' && !viewerIsOwner);
  };

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div className={`${styles.backdrop} ${visible ? styles.backdropOpen : ''}`} onClick={onClose}>
      <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{t('admin.title')}</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label={t('admin.home')}>
            <IconX size={18} />
          </button>
        </div>

        <div className={styles.modalBody}>
          {error && <div className={styles.error}>{error}</div>}

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>{t('admin.users')}</h3>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t('admin.login')}</th>
                  <th>{t('admin.role')}</th>
                  <th>{t('admin.lastNickname')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.login}</td>
                    <td>
                      <RoleBadge role={u.role} />
                    </td>
                    <td>{u.nickname || '—'}</td>
                    <td className={styles.actions}>
                      {viewerIsOwner &&
                        u.role !== 'owner' &&
                        (u.role === 'admin' ? (
                          <button
                            className={styles.iconBtn}
                            title={t('admin.removeAdmin')}
                            onClick={() => changeRole(u.id, false)}
                          >
                            <IconShieldOff size={16} />
                          </button>
                        ) : (
                          <button
                            className={styles.iconBtn}
                            title={t('admin.makeAdmin')}
                            onClick={() => changeRole(u.id, true)}
                          >
                            <IconShield size={16} />
                          </button>
                        ))}
                      {canDelete(u) && (
                        <div className={styles.danger} onClick={() => deleteUser(u.id)}>
                          <IconTrash size={16} />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className={styles.form}>
              <input
                className={styles.field}
                autoComplete="off"
                placeholder={t('admin.login')}
                value={uLogin}
                onChange={(e) => setULogin(e.target.value)}
              />
              <PasswordInput
                wrapperClassName={styles.field}
                placeholder={t('admin.password')}
                value={uPassword}
                onChange={(e) => setUPassword(e.target.value)}
              />
              {viewerIsOwner && (
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={uAdmin}
                    onChange={(e) => setUAdmin(e.target.checked)}
                  />
                  {t('admin.roleAdmin')}
                </label>
              )}
              <div className={styles.primary} onClick={createUser}>
                <IconPlus size={16} />
                {t('admin.add')}
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>{t('admin.rooms')}</h3>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t('admin.name')}</th>
                  <th>{t('admin.access')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td>
                      {r.adminOnly && <span className={styles.badge}>{t('admin.adminsOnly')}</span>}
                      {r.hasPassword && (
                        <span className={styles.badge}>{t('admin.byPassword')}</span>
                      )}
                      {!r.adminOnly && !r.hasPassword && <span className={styles.badge}>{t('admin.open')}</span>}
                    </td>
                    <td className={styles.remove}>
                      <div className={styles.danger} onClick={() => deleteRoom(r.id)}>
                        <IconTrash size={16} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className={styles.form}>
              <input
                className={styles.field}
                placeholder={t('admin.roomName')}
                value={rName}
                onChange={(e) => setRName(e.target.value)}
              />
              <PasswordInput
                wrapperClassName={styles.field}
                placeholder={t('admin.passwordOptional')}
                value={rPassword}
                onChange={(e) => setRPassword(e.target.value)}
              />
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={rAdminOnly}
                  onChange={(e) => setRAdminOnly(e.target.checked)}
                />
                {t('admin.adminsOnly')}
              </label>
              <div className={styles.primary} onClick={createRoom}>
                <IconPlus size={16} />
                {t('admin.create')}
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <h3 className={styles.sectionTitle}>{t('admin.activeRooms')}</h3>
              <div className={styles.linkBtn} onClick={loadActive}>
                <IconRefresh size={16} />
              </div>
            </div>
            {active.length === 0 && <p className={styles.muted}>{t('admin.nobody')}</p>}
            {active.map((room) => (
              <div key={room.name} className={styles.activeRoom}>
                <div className={styles.activeHead} onClick={() => loadParticipants(room.name)}>
                  <strong>{room.name}</strong>
                  <span className={styles.muted}>
                    {t('admin.participants', { count: room.numParticipants })}
                    {room.createdAt > 0 && ` · ${new Date(room.createdAt).toLocaleString()}`}
                  </span>
                </div>
                {participants[room.name] && (
                  <ul className={styles.partList}>
                    {participants[room.name].map((p) => (
                      <li key={p.identity} className={styles.partItem}>
                        <span>
                          {p.name}
                          {p.isAdmin && (
                            <span className={styles.badge}>{t('admin.roleAdmin')}</span>
                          )}
                        </span>
                        {!p.isAdmin && (
                          <div
                            className={styles.danger}
                            onClick={() => kick(room.name, p.identity)}
                          >
                            <IconUserX size={16} />
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <h3 className={styles.sectionTitle}>{t('admin.bans')}</h3>
              <div className={styles.linkBtn} onClick={loadBans}>
                <IconRefresh size={16} />
              </div>
            </div>
            {bans.length === 0 ? (
              <p className={styles.muted}>{t('admin.noBans')}</p>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t('admin.bannedWho')}</th>
                    <th>{t('admin.bannedIp')}</th>
                    <th>{t('admin.bannedRoom')}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {bans.map((b) => (
                    <tr key={b.id}>
                      <td>
                        {b.name || b.login || '—'}
                        {b.role && (
                          <RoleBadge role={(b.role as Role) ?? 'guest'} />
                        )}
                      </td>
                      <td>{b.ip}</td>
                      <td>{b.roomName || '—'}</td>
                      <td className={styles.remove}>
                        <div className={styles.danger} onClick={() => unban(b.id)}>
                          <IconTrash size={16} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      </div>
    </div>,
    document.body,
  );
};
