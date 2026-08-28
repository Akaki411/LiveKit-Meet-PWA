'use client';

import * as React from 'react';
import { LocalVideoTrack, Track } from 'livekit-client';
import { useTranslation } from 'react-i18next';
import { IconCameraRotate } from '@tabler/icons-react';
import { useRoomContext, useTrackToggle } from '@/lib/components/livekit';
import styles from '../../../styles/conference.module.css';

export const CameraFlipButton = () => {
  const room = useRoomContext();
  const { t } = useTranslation();
  const { enabled } = useTrackToggle(Track.Source.Camera);
  const [facing, setFacing] = React.useState<'user' | 'environment'>('user');
  const [pending, setPending] = React.useState(false);

  const flip = async () => {
    const pub = room.localParticipant.getTrackPublication(Track.Source.Camera);
    const track = pub?.videoTrack as LocalVideoTrack | undefined;
    if (!track) return;
    const next = facing === 'user' ? 'environment' : 'user';
    setPending(true);
    try {
      await track.restartTrack({ facingMode: next });
      setFacing(next);
    } catch (error) {
      console.error(error);
    } finally {
      setPending(false);
    }
  };

  if (!enabled) return null;

  return (
    <button
      type="button"
      className={`${styles.controlBtn} ${styles.mobileOnly}`}
      onClick={flip}
      disabled={pending}
      aria-label={t('conference.flipCamera')}
      title={t('conference.flipCamera')}
    >
      <IconCameraRotate size={20} />
    </button>
  );
};
