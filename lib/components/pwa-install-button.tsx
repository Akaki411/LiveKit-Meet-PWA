'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';

export function PwaInstallButton() {
  const { t } = useTranslation();
  const [promptEvent, setPromptEvent] = React.useState<any>(null);
  const [visible, setVisible] = React.useState(false);
  const [iosHint, setIosHint] = React.useState(false);

  const isIos = React.useMemo(
    () => typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent),
    [],
  );

  React.useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true;
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (standalone || !isMobile) return;

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    if (isIos) setVisible(true);

    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, [isIos]);

  const onClick = async () => {
    if (promptEvent) {
      promptEvent.prompt();
      try {
        await promptEvent.userChoice;
      } catch {
        return;
      }
      setPromptEvent(null);
      setVisible(false);
      return;
    }
    if (isIos) setIosHint((v) => !v);
  };

  if (!visible) return null;

  return (
    <div className="pwa-install-wrap">
      <button type="button" className="pwa-install" onClick={onClick}>
        {t('login.installApp')}
      </button>
      {iosHint && <p className="pwa-install-hint">{t('login.iosInstallHint')}</p>}
    </div>
  );
}
