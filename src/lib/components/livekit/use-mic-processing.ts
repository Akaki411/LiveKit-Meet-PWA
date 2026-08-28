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

  const applyNoiseSuppression = React.useCallback(
    async (track: LocalAudioTrack, value: boolean) => {
      const deviceId = track.mediaStreamTrack.getSettings().deviceId;
      try {
        await track.restartTrack({
          deviceId,
          noiseSuppression: value,
          echoCancellation: true,
          autoGainControl: true,
        });
      } catch (error) {
        console.error(error);
      }
    },
    [],
  );

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
          await applyNoiseSuppression(track, nsRef.current);
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
    [getTrack, applyNoiseSuppression],
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
      processorRef.current?.setNoiseSuppression(value);
      await applyNoiseSuppression(track, value);
    },
    [getTrack, applyNoiseSuppression],
  );

  React.useEffect(() => {
    const onPublished = (pub: LocalTrackPublication) => {
      if (pub.source !== Track.Source.Microphone) return;
      processorRef.current = null;
      if (gainRef.current !== 100) {
        void applyGain(gainRef.current);
      } else if (!nsRef.current) {
        const track = getTrack();
        if (track) void applyNoiseSuppression(track, false);
      }
    };
    room.on(RoomEvent.LocalTrackPublished, onPublished);
    return () => {
      room.off(RoomEvent.LocalTrackPublished, onPublished);
    };
  }, [room, applyGain, getTrack, applyNoiseSuppression]);

  return { noiseSuppression, setNoiseSuppression, gainPercent, setGainPercent };
};
