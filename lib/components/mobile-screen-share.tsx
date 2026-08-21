'use client';

import * as React from 'react';
import { useLocalParticipant } from '@livekit/components-react';
import { useTranslation } from 'react-i18next';
import { IconScreenShare, IconScreenShareOff } from '@tabler/icons-react';

export function MobileScreenShare() {
  const { localParticipant } = useLocalParticipant();
  const { t } = useTranslation();
  const [busy, setBusy] = React.useState(false);
  const enabled = localParticipant.isScreenShareEnabled;

  const toggle = React.useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      await localParticipant.setScreenShareEnabled(!enabled);
    } catch (error) {
      console.error(error);
    } finally {
      setBusy(false);
    }
  }, [busy, enabled, localParticipant]);

  return (
    <button
      type="button"
      className="mobile-screenshare"
      data-active={enabled ? 'true' : 'false'}
      onClick={toggle}
      disabled={busy}
      aria-label={t('conference.screenShare')}
      title={t('conference.screenShare')}
    >
      {enabled ? <IconScreenShareOff size={22} /> : <IconScreenShare size={22} />}
    </button>
  );
}
