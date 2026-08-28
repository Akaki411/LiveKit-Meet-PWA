'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/lib/components/common/language-switcher';
import { PwaInstallButton } from '@/lib/components/common/pwa-install-button';
import { PasswordInput } from '@/lib/components/common/password-input';
import styles from '../../../styles/generated/home.classes';

const LoginClient = () => {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        const from = new URLSearchParams(window.location.search).get('from');
        window.location.assign(from && from.startsWith('/') ? from : '/');
      } else {
        setError(t('login.invalid'));
        setLoading(false);
      }
    } catch {
      setError(t('login.networkError'));
      setLoading(false);
    }
  };

  return (
    <main className={styles.main} data-lk-theme="default">
      <div className={styles.authCard}>
        <div className="lang-switcher-pose">
          <LanguageSwitcher label={false} />
        </div>
        <div className={styles.brandRow}>
          <img
            src="/images/livekit-meet-home.svg"
            alt="LiveKit Meet"
            width="100%"
            style={{ maxWidth: '350px' }}
          />
        </div>
        {error ? (
          <div className={styles.error}>{error}</div>
        ) : (
          <p className={styles.subtitle}>{t('login.subtitle')}</p>
        )}
        <form className={styles.authForm} onSubmit={onSubmit}>
          <input
            className={styles.field}
            placeholder={t('login.login')}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoFocus
          />
          <PasswordInput
            wrapperClassName={styles.field}
            placeholder={t('login.password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          <button
            type="submit"
            className={styles.primaryBtn}
            style={{ height: '3rem', border: 'none' }}
            disabled={loading}
          >
            {loading ? t('login.submitting') : t('login.submit')}
          </button>
        </form>
        <PwaInstallButton />
      </div>
    </main>
  );
};

export default LoginClient;
