'use client';

import * as React from 'react';
import { LocalAudioTrack, LocalTrackPublication, RoomEvent, Track } from 'livekit-client';
import { useRoomContext } from './room-context';
import { createMicGainProcessor, type MicGainProcessor } from './mic-gain-processor';

export const useMicProcessing = () => {
  const room = useRoomContext();
  const [noiseSuppression, setNoiseState] = React.useState(true);
  const [gainPercent, setGainState] = React.useState(100);

  const processorRef = React.useRef<MicGainProcessor | null>(null);
  const nsRef = React.useRef(noiseSuppression);
  const gainRef = React.useRef(gainPercent);
  nsRef.current = noiseSuppression;
  gainRef.current = gainPercent;

  const getTrack = React.useCallback((): LocalAudioTrack | undefined => {
    const pub = room.localParticipant.getTrackPublication(Track.Source.Microphone);
    return pub?.track instanceof LocalAudioTrack ? pub.track : undefined;
  }, [room]);

  const applyGain = React.useCallback(
    async (percent: number) => {
      const track = getTrack();
      if (!track) return;
      const gain = percent / 100;
      if (gain === 1) {
        if (processorRef.current) {
          try {
            await track.stopProcessor();
          } catch {
          }
          processorRef.current = null;
          try {
            await track.mediaStreamTrack.applyConstraints({ noiseSuppression: nsRef.current });
          } catch {
          }
        }
      } else if (processorRef.current) {
        processorRef.current.setGain(gain);
      } else {
        const proc = createMicGainProcessor(gain, nsRef.current);
        processorRef.current = proc;
        try {
          await track.setProcessor(proc);
        } catch (error) {
          console.error(error);
          processorRef.current = null;
        }
      }
    },
    [getTrack],
  );

  const setGainPercent = React.useCallback(
    (percent: number) => {
      setGainState(percent);
      void applyGain(percent);
    },
    [applyGain],
  );

  const setNoiseSuppression = React.useCallback(
    async (value: boolean) => {
      setNoiseState(value);
      const track = getTrack();
      if (!track) return;
      if (processorRef.current) {
        processorRef.current.setNoiseSuppression(value);
      } else {
        try {
          await track.mediaStreamTrack.applyConstraints({ noiseSuppression: value });
        } catch {
        }
      }
    },
    [getTrack],
  );

  React.useEffect(() => {
    const onPublished = (pub: LocalTrackPublication) => {
      if (pub.source !== Track.Source.Microphone) return;
      processorRef.current = null;
      if (gainRef.current !== 100) {
        void applyGain(gainRef.current);
      } else {
        const track = getTrack();
        track?.mediaStreamTrack.applyConstraints({ noiseSuppression: nsRef.current }).catch(() => {});
      }
    };
    room.on(RoomEvent.LocalTrackPublished, onPublished);
    return () => {
      room.off(RoomEvent.LocalTrackPublished, onPublished);
    };
  }, [room, applyGain, getTrack]);

  return { noiseSuppression, setNoiseSuppression, gainPercent, setGainPercent };
};
