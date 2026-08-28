'use client';

import * as React from 'react';
import { Track } from 'livekit-client';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  IconMessage,
  IconMicrophone,
  IconMicrophoneOff,
  IconPhoneOff,
  IconScreenShare,
  IconScreenShareOff,
  IconSettings,
  IconShare,
  IconUsers,
  IconVideo,
  IconVideoOff,
} from '@tabler/icons-react';
import { TrackToggle, useRoomContext, parseParticipantMeta } from '@/lib/components/livekit';
import { MediaControl } from './media-control';
import { CameraFlipButton } from './camera-flip';
import styles from '../../../styles/conference.module.css';

export const ControlBar = ({
  chatOpen,
  onToggleChat,
  unreadCount,
  participantsOpen,
  onToggleParticipants,
  participantCount,
  showSettings,
  onToggleSettings,
}: {
  chatOpen: boolean;
  onToggleChat: () => void;
  unreadCount: number;
  participantsOpen: boolean;
  onToggleParticipants: () => void;
  participantCount: number;
  showSettings: boolean;
  onToggleSettings?: () => void;
}) => {
  const room = useRoomContext();
  const { t } = useTranslation();

  const meta = parseParticipantMeta(room.localParticipant.metadata);
  const isModerator = meta.creator || meta.admin;
  const [leaveOpen, setLeaveOpen] = React.useState(false);
  const leaveRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!leaveOpen) return;
    const onDown = (event: MouseEvent) => {
      if (leaveRef.current && !leaveRef.current.contains(event.target as Node)) setLeaveOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [leaveOpen]);

  const endForAll = async () => {
    setLeaveOpen(false);
    try {
      await fetch('/api/room/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName: room.name }),
      });
    } catch {
    }
    room.disconnect();
  };

  const onLeaveClick = () => {
    if (isModerator) setLeaveOpen((open) => !open);
    else room.disconnect();
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: room.name, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success(t('conference.linkCopied'));
    } catch {}
  };

  return (
    <div className={styles.controlBar}>
      <MediaControl
        source={Track.Source.Microphone}
        kind="audioinput"
        label={t('room.microphone')}
        onIcon={<IconMicrophone size={20} />}
        offIcon={<IconMicrophoneOff size={20} />}
      />
      <MediaControl
        source={Track.Source.Camera}
        kind="videoinput"
        label={t('room.camera')}
        onIcon={<IconVideo size={20} />}
        offIcon={<IconVideoOff size={20} />}
      />
      <CameraFlipButton />
      <TrackToggle
        source={Track.Source.ScreenShare}
        className={`${styles.controlBtn} ${styles.screenToggle} ${styles.desktopOnly}`}
        onIcon={<IconScreenShareOff size={20} />}
        offIcon={<IconScreenShare size={20} />}
      />

      <button
        type="button"
        className={`${styles.controlBtn} ${participantsOpen ? styles.active : ''}`}
        onClick={onToggleParticipants}
        aria-label={t('conference.participants')}
        title={t('conference.participants')}
      >
        <IconUsers size={20} />
        {participantCount > 0 && <span className={styles.badge}>{participantCount}</span>}
      </button>

      <button
        type="button"
        className={`${styles.controlBtn} ${chatOpen ? styles.active : ''}`}
        onClick={onToggleChat}
        aria-label={t('conference.chat')}
        title={t('conference.chat')}
      >
        <IconMessage size={20} />
        {unreadCount > 0 && !chatOpen && <span className={styles.badge}>{unreadCount}</span>}
      </button>
      <button
        type="button"
        className={styles.controlBtn}
        onClick={share}
        aria-label={t('conference.share')}
        title={t('conference.share')}
      >
        <IconShare size={20} />
      </button>

      {showSettings && (
        <button
          type="button"
          className={styles.controlBtn}
          onClick={onToggleSettings}
          aria-label={t('conference.settings')}
          title={t('conference.settings')}
        >
          <IconSettings size={20} />
        </button>
      )}

      <div className={styles.leaveWrap} ref={leaveRef}>
        <button
          type="button"
          className={`${styles.controlBtn} ${styles.leaveBtn}`}
          onClick={onLeaveClick}
          aria-label={t('conference.leave')}
          title={t('conference.leave')}
        >
          <IconPhoneOff size={20} />
        </button>
        {isModerator && leaveOpen && (
          <div className={styles.leaveMenu}>
            <button
              type="button"
              className={styles.leaveMenuItem}
              onClick={() => {
                setLeaveOpen(false);
                room.disconnect();
              }}
            >
              {t('conference.leaveSelf')}
            </button>
            <button
              type="button"
              className={`${styles.leaveMenuItem} ${styles.leaveMenuDanger}`}
              onClick={endForAll}
            >
              {t('conference.endForAll')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
