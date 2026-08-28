'use client';

import * as React from 'react';
import { Track } from 'livekit-client';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  IconMicrophoneOff,
  IconUserX,
  IconBan,
  IconVolume,
  IconVolumeOff,
  IconCrown,
  IconShield,
} from '@tabler/icons-react';
import {
  useParticipants,
  useRoomContext,
} from '@/lib/components/livekit';
import { parseParticipantMeta } from '@/lib/components/livekit/metadata';
import { canModerate } from '@/lib/auth/roles';
import { useApiBlobUrl } from '@/lib/client/api-blob';
import styles from '../../../styles/generated/conference.classes';

const initials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const ParticipantAvatar = ({ avatar }: { avatar: string }) => {
  const objectUrl = useApiBlobUrl(`/api/avatars/${avatar}`);
  return objectUrl ? <img src={objectUrl} alt="" /> : null;
};

export const ParticipantsPanel = ({
  open,
  localMuted,
  onToggleMute,
}: {
  open: boolean;
  localMuted: Set<string>;
  onToggleMute: (identity: string) => void;
}) => {
  const room = useRoomContext();
  const { t } = useTranslation();
  const participants = useParticipants();

  const me = parseParticipantMeta(room.localParticipant.metadata);
  const myFlags = { creator: me.creator, admin: me.admin };

  const act = React.useCallback(
    async (endpoint: 'kick' | 'ban', identity: string) => {
      try {
        const res = await fetch(`/api/room/${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomName: room.name, identity }),
        });
        if (!res.ok) {
          toast.error(t(endpoint === 'kick' ? 'conference.kickFailed' : 'conference.banFailed'));
        }
      } catch {
        toast.error(t(endpoint === 'kick' ? 'conference.kickFailed' : 'conference.banFailed'));
      }
    },
    [room.name, t],
  );

  return (
    <aside className={styles.participants} data-open={open ? 'true' : 'false'}>
      <div className={styles.participantsList}>
        {participants.map((p) => {
          const meta = parseParticipantMeta(p.metadata);
          const name = p.name || p.identity;
          const micPub = p.getTrackPublication(Track.Source.Microphone);
          const micMuted = !micPub || micPub.isMuted;
          const isLocal = p.isLocal;
          const muted = localMuted.has(p.identity);
          const canMod =
            !isLocal && canModerate(myFlags, { creator: meta.creator, admin: meta.admin });

          return (
            <div key={p.identity} className={styles.participantRow}>
              <span className={styles.participantAvatar}>
                {meta.avatar ? <ParticipantAvatar avatar={meta.avatar} /> : initials(name)}
                {micMuted && (
                  <span className={styles.participantMicDot}>
                    <IconMicrophoneOff size={11} />
                  </span>
                )}
              </span>

              <span className={styles.participantName}>
                {name}
                {isLocal && <span className={styles.participantYou}>{t('conference.you')}</span>}
              </span>

              {meta.creator ? (
                <span className={styles.participantMark} data-mark="owner">
                  <IconCrown size={12} />
                  {t('conference.markOwner')}
                </span>
              ) : meta.admin ? (
                <span className={styles.participantMark} data-mark="admin">
                  <IconShield size={12} />
                  {t('conference.markAdmin')}
                </span>
              ) : null}

              <div className={styles.participantActions}>
                {!isLocal && (
                  <button
                    type="button"
                    className={styles.participantBtn}
                    data-active={muted ? 'true' : 'false'}
                    onClick={() => onToggleMute(p.identity)}
                    aria-label={t(muted ? 'conference.unmuteLocal' : 'conference.muteLocal')}
                    title={t(muted ? 'conference.unmuteLocal' : 'conference.muteLocal')}
                  >
                    {muted ? <IconVolumeOff size={16} /> : <IconVolume size={16} />}
                  </button>
                )}
                {canMod && (
                  <button
                    type="button"
                    className={styles.participantBtn}
                    onClick={() => act('kick', p.identity)}
                    aria-label={t('conference.kick')}
                    title={t('conference.kick')}
                  >
                    <IconUserX size={16} />
                  </button>
                )}
                {canMod && (
                  <button
                    type="button"
                    className={`${styles.participantBtn} ${styles.participantDanger}`}
                    onClick={() => act('ban', p.identity)}
                    aria-label={t('conference.ban')}
                    title={t('conference.ban')}
                  >
                    <IconBan size={16} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
