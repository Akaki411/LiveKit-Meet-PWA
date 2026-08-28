'use client';

import * as React from 'react';
import {
  ConnectionState,
  LocalParticipant,
  Participant,
  ParticipantKind,
  RoomEvent,
  Track,
  type Room,
} from 'livekit-client';
import { useRoomContext } from './room-context';
import type { TrackReferenceOrPlaceholder } from './types';

const useRoomEvents = (room: Room, events: RoomEvent[]): number => {
  const [tick, forceUpdate] = React.useReducer((x: number) => x + 1, 0);
  React.useEffect(() => {
    const update = () => forceUpdate();
    events.forEach((event) => room.on(event, update));
    return () => {
      events.forEach((event) => room.off(event, update));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, events]);
  return tick;
};

const PARTICIPANT_EVENTS: RoomEvent[] = [
  RoomEvent.ParticipantConnected,
  RoomEvent.ParticipantDisconnected,
  RoomEvent.ConnectionStateChanged,
  RoomEvent.ParticipantMetadataChanged,
  RoomEvent.ParticipantNameChanged,
];

const TRACK_EVENTS: RoomEvent[] = [
  RoomEvent.ParticipantConnected,
  RoomEvent.ParticipantDisconnected,
  RoomEvent.TrackPublished,
  RoomEvent.TrackUnpublished,
  RoomEvent.TrackSubscribed,
  RoomEvent.TrackUnsubscribed,
  RoomEvent.TrackMuted,
  RoomEvent.TrackUnmuted,
  RoomEvent.LocalTrackPublished,
  RoomEvent.LocalTrackUnpublished,
  RoomEvent.ParticipantMetadataChanged,
];

const TOGGLE_EVENTS: RoomEvent[] = [
  RoomEvent.LocalTrackPublished,
  RoomEvent.LocalTrackUnpublished,
  RoomEvent.TrackMuted,
  RoomEvent.TrackUnmuted,
];

const isStandardParticipant = (participant: Participant): boolean =>
  participant.kind === ParticipantKind.STANDARD;

export const useParticipants = (): Participant[] => {
  const room = useRoomContext();
  const tick = useRoomEvents(room, PARTICIPANT_EVENTS);
  return React.useMemo(
    () =>
      [room.localParticipant, ...Array.from(room.remoteParticipants.values())].filter(
        isStandardParticipant,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [room, tick],
  );
};

export const useLocalParticipant = (): LocalParticipant => {
  const room = useRoomContext();
  useRoomEvents(room, TOGGLE_EVENTS);
  return room.localParticipant;
};

export const useTracks = (): TrackReferenceOrPlaceholder[] => {
  const room = useRoomContext();
  const tick = useRoomEvents(room, TRACK_EVENTS);

  return React.useMemo(() => {
    const participants: Participant[] = [
      room.localParticipant,
      ...Array.from(room.remoteParticipants.values()),
    ].filter(isStandardParticipant);
    const refs: TrackReferenceOrPlaceholder[] = [];

    for (const participant of participants) {
      const screenPub = participant.getTrackPublication(Track.Source.ScreenShare);
      if (screenPub) {
        refs.push({ participant, publication: screenPub, source: Track.Source.ScreenShare });
      }
    }

    for (const participant of participants) {
      const cameraPub = participant.getTrackPublication(Track.Source.Camera);
      if (cameraPub) {
        refs.push({ participant, publication: cameraPub, source: Track.Source.Camera });
      } else {
        refs.push({ participant, source: Track.Source.Camera });
      }
    }

    return refs;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, tick]);
};

export const useScreenShareTracks = (): TrackReferenceOrPlaceholder[] => {
  const tracks = useTracks();
  return tracks.filter((ref) => ref.source === Track.Source.ScreenShare && ref.publication);
};

export const useRemoteAudioPublications = () => {
  const room = useRoomContext();
  const tick = useRoomEvents(room, TRACK_EVENTS);

  return React.useMemo(() => {
    const result: { participantIdentity: string; publication: import('livekit-client').TrackPublication }[] =
      [];
    for (const participant of room.remoteParticipants.values()) {
      for (const publication of participant.audioTrackPublications.values()) {
        if (publication.track) {
          result.push({ participantIdentity: participant.identity, publication });
        }
      }
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, tick]);
};

export const useConnectionState = (): ConnectionState => {
  const room = useRoomContext();
  useRoomEvents(room, [RoomEvent.ConnectionStateChanged]);
  return room.state;
};

export const useIsRecording = (): boolean => {
  const room = useRoomContext();
  useRoomEvents(room, [RoomEvent.RecordingStatusChanged]);
  return room.isRecording;
};

export const useIsSpeaking = (participant: Participant): boolean => {
  const room = useRoomContext();
  useRoomEvents(room, [RoomEvent.ActiveSpeakersChanged]);
  return participant.isSpeaking;
};

export type ToggleSource = Track.Source.Camera | Track.Source.Microphone | Track.Source.ScreenShare;

export const useTrackToggle = (source: ToggleSource) => {
  const room = useRoomContext();
  useRoomEvents(room, TOGGLE_EVENTS);
  const [pending, setPending] = React.useState(false);
  const lp = room.localParticipant;

  const enabled =
    source === Track.Source.Camera
      ? lp.isCameraEnabled
      : source === Track.Source.Microphone
        ? lp.isMicrophoneEnabled
        : lp.isScreenShareEnabled;

  const toggle = React.useCallback(
    async (next?: boolean) => {
      const target = next ?? !enabled;
      setPending(true);
      try {
        if (source === Track.Source.Camera) {
          await lp.setCameraEnabled(target);
        } else if (source === Track.Source.Microphone) {
          await lp.setMicrophoneEnabled(target);
        } else {
          await lp.setScreenShareEnabled(target);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setPending(false);
      }
    },
    [enabled, lp, source],
  );

  return { enabled, pending, toggle };
};
