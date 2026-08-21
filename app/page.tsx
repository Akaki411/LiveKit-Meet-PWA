'use client';

import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IconX, IconLock, IconLockOpen2 } from '@tabler/icons-react';
import { generateRoomId } from '@/lib/client-utils';
import { getRecentRooms, removeRecentRoom, type RecentRoom } from '@/lib/recent-rooms';
import { AccountMenu } from '@/lib/components/account-menu';
import { PasswordInput } from '@/lib/components/password-input';
import { isAdminRole } from '@/lib/roles';
import styles from '../styles/home.module.css';

export default function Page() {
  const router = useRouter();
  const { t } = useTranslation();
  const [room, setRoom] = useState('');
  const [recent, setRecent] = useState<RecentRoom[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [withPassword, setWithPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    setRecent(getRecentRooms());
    fetch('/api/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setIsAdmin(isAdminRole(data?.role)))
      .catch(() => setIsAdmin(false));
  }, []);

  const formatRelative = (ts: number): string => {
    const min = Math.floor((Date.now() - ts) / 60000);
    if (min < 1) return t('home.justNow');
    if (min < 60) return t('home.minutesAgo', { count: min });
    const hours = Math.floor(min / 60);
    if (hours < 24) return t('home.hoursAgo', { count: hours });
    const days = Math.floor(hours / 24);
    if (days < 7) return t('home.daysAgo', { count: days });
    return new Date(ts).toLocaleDateString();
  };

  const startMeeting = async (event: React.FormEvent) => {
    setCreateError('');
    const name = room.trim().replace(/\s+/g, '-');
    const target = name.length > 0 ? name : generateRoomId();
    if (isAdmin && withPassword && password.trim().length > 0) {
      const res = await fetch('/api/admin/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: target, password }),
      });
      if (res.status === 409) {
        setCreateError(t('home.roomExists'));
        return;
      }
      if (!res.ok) {
        setCreateError(t('login.networkError'));
        return;
      }
    }
    router.push(`/rooms/${encodeURIComponent(target)}`);
  };

  const openRoom = (name: string) => {
    router.push(`/rooms/${encodeURIComponent(name)}`);
  };

  const forgetRoom = (event: React.MouseEvent, name: string) => {
    event.stopPropagation();
    removeRecentRoom(name);
    setRecent(getRecentRooms());
  };

  return (
    <>
      <header className={styles.topbar}>
        <div className={styles.brandRow}>
          <span className={styles.logoDot} />
          <img
            src="/images/livekit-safari-pinned-tab.svg"
            alt="LiveKit Meet"
            width="32"
            height="32"
            style={{ background: 'linear-gradient(60deg, #ffffff 40%, #E36D5B 50%)' }}
          />
        </div>
        <AccountMenu />
      </header>

      <main className={styles.main} data-lk-theme="default">
        <div className={styles.hero}>
          <img
            src="/images/livekit-meet-home.svg"
            alt="LiveKit Meet"
            width="100%"
            style={{ maxWidth: '500px' }}
          />
          <p className={styles.subtitle}>{t('home.subtitle')}</p>
          <form className={styles.joinForm}>
            <input
              className={styles.field}
              placeholder={t('home.roomPlaceholder')}
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              autoFocus
            />
            <div className={styles.primaryBtn} onClick={() => {setWithPassword(!withPassword)}}>
              {withPassword ? <IconLockOpen2 stroke={2} size="1.3rem"/> : <IconLock stroke={2} size="1.3rem"/>}
            </div>
            <div className={styles.primaryBtn} onClick={startMeeting} style={{padding: '0 2rem'}}>
              {t('home.start')}
            </div>
          </form>
          {isAdmin && withPassword && (
            <div className={styles.createOptions}>
              <PasswordInput
                wrapperClassName={styles.field}
                placeholder={t('home.roomPassword')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}
          {createError && <p className={styles.error}>{createError}</p>}
          <p className={styles.hint}>{t('home.hint')}</p>

          {recent.length > 0 && (
            <div className={styles.recent}>
              <div className={styles.recentTitle}>{t('home.recentTitle')}</div>
              <ul className={styles.recentList}>
                {recent.map((r) => (
                  <li
                    key={r.name}
                    className={styles.recentItem}
                    onClick={() => openRoom(r.name)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') openRoom(r.name);
                    }}
                  >
                    <span className={styles.recentName}>{r.name}</span>
                    <span className={styles.recentTime}>{formatRelative(r.ts)}</span>
                    <button
                      className={styles.recentRemove}
                      onClick={(e) => forgetRoom(e, r.name)}
                      aria-label={t('home.removeRecent')}
                      title={t('home.removeRecent')}
                    >
                      <IconX size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
