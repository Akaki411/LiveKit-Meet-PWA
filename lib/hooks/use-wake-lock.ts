import { useEffect } from 'react';

export const useWakeLock = (active: boolean): void => {
  useEffect(() => {
    if (!active) return;

    const nav = navigator as any;
    if (!nav.wakeLock) return;

    let sentinel: any = null;
    let cancelled = false;

    const request = async () => {
      try {
        sentinel = await nav.wakeLock.request('screen');
      } catch {
        sentinel = null;
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !cancelled) {
        request();
      }
    };

    request();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (sentinel) {
        sentinel.release().catch(() => {});
        sentinel = null;
      }
    };
  }, [active]);
};
