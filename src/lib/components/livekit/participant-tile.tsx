'use client';

import * as React from 'react';
import { Track } from 'livekit-client';
import { IconMicrophoneOff } from '@tabler/icons-react';
import { VideoTrack } from './media-track';
import { useIsSpeaking } from './use-room';
import { isTrackReference, type TrackReferenceOrPlaceholder } from './types';
import { useApiBlobUrl } from '@/lib/client/api-blob';
import styles from '../../../styles/generated/conference.classes';

const parseAvatar = (metadata: string | undefined): string | null => {
  if (!metadata) return null;
  try {
    const parsed = JSON.parse(metadata);
    return typeof parsed.avatar === 'string' ? parsed.avatar : null;
  } catch {
    return null;
  }
};

const initials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const ParticipantTile = ({
  trackRef,
  onSelect,
}: {
  trackRef: TrackReferenceOrPlaceholder;
  onSelect?: (trackRef: TrackReferenceOrPlaceholder) => void;
}) => {
  const { participant, source } = trackRef;
  const speaking = useIsSpeaking(participant);

  const displayName = participant.name || participant.identity || '';
  const avatar = parseAvatar(participant.metadata);
  const avatarUrl = useApiBlobUrl(avatar ? `/api/avatars/${avatar}` : null);

  const isScreenShare = source === Track.Source.ScreenShare;
  const hasVideo =
    isTrackReference(trackRef) &&
    !!trackRef.publication.track &&
    !trackRef.publication.isMuted &&
    (isScreenShare || trackRef.publication.isSubscribed || participant.isLocal);

  const micPub = participant.getTrackPublication(Track.Source.Microphone);
  const micMuted = !micPub || micPub.isMuted;

  return (
    <div
      className={styles.tile}
      data-speaking={speaking && !isScreenShare ? 'true' : 'false'}
      data-screenshare={isScreenShare ? 'true' : 'false'}
      data-clickable={onSelect ? 'true' : 'false'}
      onClick={onSelect ? () => onSelect(trackRef) : undefined}
    >
      {hasVideo && isTrackReference(trackRef) ? (
        <VideoTrack
          trackRef={trackRef}
          className={styles.tileVideo}
          mirror={participant.isLocal && !isScreenShare}
          style={isScreenShare ? { objectFit: 'contain' } : undefined}
        />
      ) : (
        <div className={styles.tilePlaceholder}>
          {avatarUrl ? (
            <img className={styles.tileAvatarImg} src={avatarUrl} alt="" />
          ) : (
            <div className={styles.tileAvatar}>{initials(displayName)}</div>
          )}
        </div>
      )}

      <div className={styles.tileFooter}>
        {micMuted && !isScreenShare && <IconMicrophoneOff size={16} className={styles.tileMuted} />}
        <span className={styles.tileName}>
          {isScreenShare ? `${displayName} · screen` : displayName}
        </span>
      </div>
    </div>
  );
};
