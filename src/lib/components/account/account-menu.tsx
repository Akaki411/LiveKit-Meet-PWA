'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  IconDeviceFloppy,
  IconLayoutDashboard,
  IconLogout,
  IconLogin,
  IconCameraFilled,
  IconUser
} from '@tabler/icons-react';
import { LanguageSwitcher } from '@/lib/components/common/language-switcher';
import { AdminPanel } from '@/lib/components/account/admin-panel';
import { PasswordInput } from '@/lib/components/common/password-input';
import { isAdminRole } from '@/lib/auth/roles';
import { redirectToLogin } from '@/lib/client/client-auth';
import { useApiBlobUrl } from '@/lib/client/api-blob';
import styles from '../../../styles/generated/account-menu.classes';

interface Me {
  login: string | null;
  role: string;
  nickname: string | null;
  avatar: string | null;
}

export const AccountMenu = () => {
  const { t } = useTranslation();
  const [me, setMe] = React.useState<Me | null>(null);
  const [open, setOpen] = React.useState(false);
  const [adminOpen, setAdminOpen] = React.useState(false);
  const [feedback, setFeedback] = React.useState<{ text: string; error: boolean } | null>(null);
  const [newLogin, setNewLogin] = React.useState('');
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const rootRef = React.useRef<HTMLDivElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const loadMe = React.useCallback(async () => {
    const res = await fetch('/api/me');
    if (!res.ok) return;
    const data: Me = await res.json();
    setMe(data);
    setNewLogin(data.login ?? '');
  }, []);

  React.useEffect(() => {
    loadMe();
  }, [loadMe]);

  React.useEffect(() => {
    const id = setInterval(async () => {
      const res = await fetch('/api/me');
      if (res.status === 401) {
        redirectToLogin();
        return;
      }
      if (res.ok) setMe(await res.json());
    }, 30000);
    return () => clearInterval(id);
  }, []);

  React.useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (open && rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const displayName = me?.nickname || me?.login || '';
  const initials = displayName ? displayName.slice(0, 2).toUpperCase() : '';
  const avatarUrl = useApiBlobUrl(me?.avatar ? `/api/avatars/${me.avatar}` : null);

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = '';
    const STEP = 0x8000;
    for (let i = 0; i < bytes.length; i += STEP) {
      binary += String.fromCharCode(...bytes.subarray(i, i + STEP));
    }
    const res = await fetch('/api/account/avatar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: file.type, dataBase64: btoa(binary) }),
    });
    if (res.ok) {
      setFeedback({ text: t('account.saved'), error: false });
      loadMe();
    }
  };

  const saveLogin = async () => {
    setFeedback(null);
    const res = await fetch('/api/account/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: newLogin }),
    });
    if (res.ok) {
      setFeedback({ text: t('account.saved'), error: false });
      loadMe();
      window.location.reload();
    } else {
      setFeedback({ text: t('account.loginTaken'), error: true });
    }
  };

  const savePassword = async () => {
    setFeedback(null);
    const res = await fetch('/api/account/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (res.ok) {
      setFeedback({ text: t('account.saved'), error: false });
      setCurrentPassword('');
      setNewPassword('');
    } else {
      setFeedback({ text: t('account.wrongPassword'), error: true });
    }
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.assign('/login');
    window.location.reload();
  };

  if (!me) return null;

  if (!me.login) {
    return (
      <div className={styles.root} ref={rootRef}>
        <button className={styles.trigger} onClick={() => setOpen((value) => !value)}>
          <span className={styles.avatar}><IconUser size={16}/></span>
          <span className={styles.name}>{t('account.guest')}</span>
        </button>
        {open && (
          <div className={styles.panel}>
            <div className={styles.avatarRow}>
              <div className={styles.changeLanguage}>
                <LanguageSwitcher label={false} />
              </div>
            </div>
            <div className={styles.form}>
              <div className={styles.formRow}>
                <button className={styles.menuItem} onClick={() => window.location.assign('/login')}>
                  <IconLogin size={18} />
                  {t('account.signIn')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.root} ref={rootRef}>
      <button className={styles.trigger} onClick={() => setOpen((value) => !value)}>
        <span className={styles.avatar}>
          {avatarUrl ? <img src={avatarUrl} alt="" /> : initials}
        </span>
        <span className={styles.name}>{displayName}</span>
      </button>

      {open && (
        <div className={styles.panel}>
          <div className={styles.avatarRow}>
            <div className={styles.avatarBlock}>
              <span className={styles.avatarLg}>
                {avatarUrl ? <img src={avatarUrl} alt="" /> : initials}
              </span>
              <label className={styles.avatarActions}>
                <IconCameraFilled size={14} color="#A3A3A3"/>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={uploadAvatar} />
              </label>
            </div>
            <div className={styles.changeLanguage}>
              <LanguageSwitcher label={false}/>
            </div>
          </div>

          <div className={styles.form}>
            <div className={styles.formRow}>
              <label className={styles.label}>{t('account.newLogin')}</label>
            </div>
            <div className={styles.formRow}>
              <input
                className={styles.field}
                value={newLogin}
                onChange={(event) => setNewLogin(event.target.value)}
                autoComplete="username"
              />
              <div className={styles.smallBtn} onClick={saveLogin}>
                <IconDeviceFloppy size={16} />
              </div>
            </div>
          </div>

          <div className={styles.form}>
            <div className={styles.formRow}>
              <label className={styles.label}>{t('account.newPassword')}</label>
            </div>
            <div className={styles.formRow}>
              <PasswordInput
                wrapperClassName={styles.field}
                placeholder={t('account.currentPassword')}
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div className={styles.formRow}>
              <PasswordInput
                wrapperClassName={styles.field}
                placeholder={t('account.newPassword')}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className={styles.formRow}>
              <div className={styles.smallBtn} onClick={savePassword}>
                <IconDeviceFloppy size={16} />
                {t('account.save')}
              </div>
            </div>
          </div>


          {feedback && (
            <div className={styles.form}>
              <div className={styles.formRow}>
                <div className={feedback.error ? styles.statusError : styles.status}>
                  {feedback.text}
                </div>
              </div>
            </div>
          )}

          {isAdminRole(me.role) && (
            <div className={styles.form}>
              <div className={styles.formRow}>
                <button
                  className={styles.menuItem}
                  onClick={() => {
                    setOpen(false);
                    setAdminOpen(true);
                  }}
                >
                  <IconLayoutDashboard size={18} />
                  {t('account.adminPanel')}
                </button>
              </div>
            </div>
          )}
          <div className={styles.form}>
            <div className={styles.formRow}>
              <button className={styles.menuItem} onClick={logout}>
                <IconLogout size={18} />
                {t('account.logout')}
              </button>
            </div>
          </div>

        </div>
      )}

      <AdminPanel open={adminOpen} onClose={() => setAdminOpen(false)} />
    </div>
  );
};
