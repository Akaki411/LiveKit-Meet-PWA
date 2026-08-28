'use client';

import * as React from 'react';
import {
  createLocalTracks,
  Track,
  type CreateLocalTracksOptions,
  type LocalTrack,
} from 'livekit-client';
import { defaultUserChoices, type LocalUserChoices } from './types';

export const useMediaDevices = (kind: MediaDeviceKind): MediaDeviceInfo[] => {
  const [devices, setDevices] = React.useState<MediaDeviceInfo[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    const update = async () => {
      try {
        const all = await navigator.mediaDevices.enumerateDevices();
        if (!cancelled) setDevices(all.filter((device) => device.kind === kind));
      } catch (error) {
        console.error(error);
      }
    };
    update();
    navigator.mediaDevices?.addEventListener('devicechange', update);
    return () => {
      cancelled = true;
      navigator.mediaDevices?.removeEventListener('devicechange', update);
    };
  }, [kind]);

  return devices;
};

export const useMediaDeviceSelect = ({
  kind,
  track,
}: {
  kind: MediaDeviceKind;
  track?: LocalTrack;
}) => {
  const devices = useMediaDevices(kind);
  const [activeDeviceId, setActiveDeviceId] = React.useState<string>('');

  React.useEffect(() => {
    const id = track?.mediaStreamTrack?.getSettings().deviceId;
    if (id) setActiveDeviceId(id);
  }, [track, devices]);

  const setActiveMediaDevice = React.useCallback(
    async (deviceId: string) => {
      if (track) {
        await track.setDeviceId(deviceId);
      }
      setActiveDeviceId(deviceId);
    },
    [track],
  );

  return { devices, activeDeviceId, setActiveMediaDevice };
};

export const usePreviewTracks = (
  options: CreateLocalTracksOptions,
  onError?: (error: Error) => void,
): LocalTrack[] | undefined => {
  const [tracks, setTracks] = React.useState<LocalTrack[]>();
  const optionsKey = JSON.stringify(options);

  React.useEffect(() => {
    let created: LocalTrack[] = [];
    let cancelled = false;

    if (!options.audio && !options.video) {
      setTracks([]);
      return;
    }

    createLocalTracks(options)
      .then((newTracks) => {
        if (cancelled) {
          newTracks.forEach((t) => t.stop());
          return;
        }
        created = newTracks;
        setTracks(newTracks);
      })
      .catch((error) => onError?.(error as Error));

    return () => {
      cancelled = true;
      created.forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optionsKey]);

  return tracks;
};

const STORAGE_KEY = 'lk-user-choices';

const readStoredChoices = (defaults?: Partial<LocalUserChoices>): LocalUserChoices => {
  const base = { ...defaultUserChoices, ...defaults };
  if (typeof window === 'undefined') return base;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...base, ...JSON.parse(raw) };
  } catch {
  }
  return base;
};

export const usePersistentUserChoices = ({
  defaults,
}: {
  defaults?: Partial<LocalUserChoices>;
} = {}) => {
  const [userChoices, setUserChoices] = React.useState<LocalUserChoices>(() =>
    readStoredChoices(defaults),
  );

  React.useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(userChoices));
    } catch {}
  }, [userChoices]);

  const saveUsername = React.useCallback(
    (username: string) => setUserChoices((prev) => ({ ...prev, username })),
    [],
  );
  const saveVideoInputEnabled = React.useCallback(
    (videoEnabled: boolean) => setUserChoices((prev) => ({ ...prev, videoEnabled })),
    [],
  );
  const saveAudioInputEnabled = React.useCallback(
    (audioEnabled: boolean) => setUserChoices((prev) => ({ ...prev, audioEnabled })),
    [],
  );
  const saveVideoInputDeviceId = React.useCallback(
    (videoDeviceId: string) => setUserChoices((prev) => ({ ...prev, videoDeviceId })),
    [],
  );
  const saveAudioInputDeviceId = React.useCallback(
    (audioDeviceId: string) => setUserChoices((prev) => ({ ...prev, audioDeviceId })),
    [],
  );

  return {
    userChoices,
    saveUsername,
    saveVideoInputEnabled,
    saveAudioInputEnabled,
    saveVideoInputDeviceId,
    saveAudioInputDeviceId,
  };
};

export const videoInputKind: MediaDeviceKind = 'videoinput';
export const audioInputKind: MediaDeviceKind = 'audioinput';
export const audioOutputKind: MediaDeviceKind = 'audiooutput';

export const sourceToDeviceKind = (source: Track.Source): MediaDeviceKind | undefined => {
  if (source === Track.Source.Camera) return 'videoinput';
  if (source === Track.Source.Microphone) return 'audioinput';
  return undefined;
};
