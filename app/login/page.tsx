'use client';

import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/lib/components/language-switcher';
import { PwaInstallButton } from '@/lib/components/pwa-install-button';
import { PasswordInput } from '@/lib/components/password-input';
import styles from '../../styles/home.module.css';

export default function LoginPage() {
  const router = useRouter();
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
        router.push(from && from.startsWith('/') ? from : '/');
        router.refresh();
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
          <LanguageSwitcher label={false}/>
        </div>
        <div className={styles.brandRow}>
          <img
            src="/images/livekit-meet-home.svg"
            alt="LiveKit Meet"
            width="100%"
            style={{ maxWidth: '350px' }}
          />
        </div>
        {!!error ? (
          <div className={styles.error}>{error}</div>
        ) : (
          <p className={styles.subtitle}>{t('login.subtitle')}</p>
        )}
        <div className={styles.authForm}>
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
          <div className={styles.primaryBtn} onClick={(e) => {if(!loading) onSubmit(e)}} style={{height:'3rem'}}>
            {loading ? t('login.submitting') : t('login.submit')}
          </div>
        </div>
        <PwaInstallButton />
      </div>
    </main>
  );
}
