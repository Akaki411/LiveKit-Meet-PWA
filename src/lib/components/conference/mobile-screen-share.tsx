'use client';

import * as React from 'react';
import { Track } from 'livekit-client';
import { useTranslation } from 'react-i18next';
import { IconScreenShare, IconScreenShareOff } from '@tabler/icons-react';
import { useTrackToggle } from '@/lib/components/livekit';

export const MobileScreenShare = () => {
  const { t } = useTranslation();
  const { enabled, pending, toggle } = useTrackToggle(Track.Source.ScreenShare);

  return (
    <button
      type="button"
      className="mobile-screenshare"
      data-active={enabled ? 'true' : 'false'}
      onClick={() => toggle()}
      disabled={pending}
      aria-label={t('conference.screenShare')}
      title={t('conference.screenShare')}
    >
      {enabled ? <IconScreenShareOff size={22} /> : <IconScreenShare size={22} />}
    </button>
  );
};
