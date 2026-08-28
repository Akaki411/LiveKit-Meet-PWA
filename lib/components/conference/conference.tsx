'use client';

import * as React from 'react';
import { Track } from 'livekit-client';
import {
  ConnectionStateToast,
  FocusLayout,
  GridLayout,
  RoomAudioRenderer,
  useParticipants,
  useRoomContext,
  useTracks,
  isTrackReference,
  isTrackReferenceEqual,
  type TrackReferenceOrPlaceholder,
} from '@/lib/components/livekit';
import { ControlBar } from './control-bar';
import { Chat } from './chat';
import { ParticipantsPanel } from './participants-panel';
import styles from '../../../styles/conference.module.css';

export const Conference = ({ SettingsComponent }: { SettingsComponent?: React.ComponentType<{ onClose: () => void }> }) => {
  const room = useRoomContext();
  const tracks = useTracks();
  const participants = useParticipants();

  const [chatOpen, setChatOpen] = React.useState(false);
  const [participantsOpen, setParticipantsOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [unread, setUnread] = React.useState(0);
  const [manualPin, setManualPin] = React.useState<TrackReferenceOrPlaceholder | null>(null);
  const [localMuted, setLocalMuted] = React.useState<Set<string>>(new Set());

  const chatOpenRef = React.useRef(chatOpen);
  chatOpenRef.current = chatOpen;

  const screenShareTrack = tracks.find(
    (ref) =>
      ref.source === Track.Source.ScreenShare &&
      isTrackReference(ref) &&
      ref.publication.isSubscribed,
  );

  const focusTrack = manualPin ?? screenShareTrack ?? null;

  const toggleChat = React.useCallback(() => {
    setParticipantsOpen(false);
    setChatOpen((open) => {
      if (!open) setUnread(0);
      return !open;
    });
  }, []);

  const toggleParticipants = React.useCallback(() => {
    setChatOpen(false);
    setParticipantsOpen((open) => !open);
  }, []);

  const handleReceive = React.useCallback(() => {
    if (!chatOpenRef.current) setUnread((count) => count + 1);
  }, []);

  const toggleLocalMute = React.useCallback(
    (identity: string) => {
      setLocalMuted((prev) => {
        const next = new Set(prev);
        const participant = room.remoteParticipants.get(identity);
        if (next.has(identity)) {
          next.delete(identity);
          participant?.setVolume(1);
        } else {
          next.add(identity);
          participant?.setVolume(0);
        }
        return next;
      });
    },
    [room],
  );

  const handleSelectTile = React.useCallback((ref: TrackReferenceOrPlaceholder) => {
    setManualPin((current) => (current && isTrackReferenceEqual(current, ref) ? null : ref));
  }, []);

  const handleUnpin = React.useCallback(() => setManualPin(null), []);

  const panel = chatOpen ? 'chat' : participantsOpen ? 'participants' : 'none';

  return (
    <div className={styles.conference} data-panel={panel}>
      <div className={styles.stage}>
        {focusTrack ? (
          <FocusLayout
            focusTrack={focusTrack}
            tracks={tracks}
            onSelect={handleSelectTile}
            onSelectFocus={handleUnpin}
          />
        ) : (
          <GridLayout tracks={tracks} onSelect={handleSelectTile} />
        )}

        <ControlBar
          chatOpen={chatOpen}
          onToggleChat={toggleChat}
          unreadCount={unread}
          participantsOpen={participantsOpen}
          onToggleParticipants={toggleParticipants}
          participantCount={participants.length}
          showSettings={!!SettingsComponent}
          onToggleSettings={() => setSettingsOpen((open) => !open)}
        />
      </div>

      <Chat open={chatOpen} onReceive={handleReceive} />
      <ParticipantsPanel
        open={participantsOpen}
        localMuted={localMuted}
        onToggleMute={toggleLocalMute}
      />

      {SettingsComponent && settingsOpen && (
        <div className={styles.settingsBackdrop} onClick={() => setSettingsOpen(false)}>
          <div className={styles.settingsModal} onClick={(event) => event.stopPropagation()}>
            <SettingsComponent onClose={() => setSettingsOpen(false)} />
          </div>
        </div>
      )}

      <RoomAudioRenderer />
      <ConnectionStateToast />
    </div>
  );
};
