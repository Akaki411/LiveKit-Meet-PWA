'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';

declare global {
  interface Window {
    __deferredPwaPrompt?: any;
  }
}

export const PwaInstallButton = () => {
  const { t } = useTranslation();
  const [mounted, setMounted] = React.useState(false);
  const [promptEvent, setPromptEvent] = React.useState<any>(null);
  const [installed, setInstalled] = React.useState(false);
  const [showHint, setShowHint] = React.useState(false);

  const isIos =
    typeof navigator !== 'undefined' &&
    (/iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

  React.useEffect(() => {
    setMounted(true);

    if (window.__deferredPwaPrompt) setPromptEvent(window.__deferredPwaPrompt);

    const onReady = () => setPromptEvent(window.__deferredPwaPrompt ?? null);
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event);
    };

    window.addEventListener('pwa-prompt-ready', onReady);
    window.addEventListener('pwa-installed', onInstalled);
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('pwa-prompt-ready', onReady);
      window.removeEventListener('pwa-installed', onInstalled);
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!mounted) return null;

  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true;
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || isIos;

  if (installed || standalone || !isMobile) return null;

  const onClick = async () => {
    if (promptEvent) {
      promptEvent.prompt();
      try {
        const choice = await promptEvent.userChoice;
        if (choice?.outcome === 'accepted') setInstalled(true);
      } catch {
      }
      setPromptEvent(null);
      window.__deferredPwaPrompt = null;
      return;
    }
    setShowHint((v) => !v);
  };

  return (
    <div className="pwa-install-wrap">
      <button type="button" className="pwa-install" onClick={onClick}>
        {t('login.installApp')}
      </button>
      {showHint && (
        <p className="pwa-install-hint">
          {isIos ? t('login.iosInstallHint') : t('login.androidInstallHint')}
        </p>
      )}
    </div>
  );
};
