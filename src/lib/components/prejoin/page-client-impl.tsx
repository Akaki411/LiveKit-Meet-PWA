'use client';

import React from 'react';
import { decodePassphrase } from '@/lib/client/client-utils';
import { addRecentRoom } from '@/lib/client/recent-rooms';
import { DebugMode } from '@/lib/components/conference/debug';
import { KeyboardShortcuts } from '@/lib/components/conference/keyboard-shortcuts';
import { RecordingIndicator } from '@/lib/components/conference/recording-indicator';
import { SettingsMenu } from '@/lib/components/settings/settings-menu';
import { ConnectionDetails } from '@/lib/livekit/types';
import { RoomContextProvider, type LocalUserChoices } from '@/lib/components/livekit';
import {
  ExternalE2EEKeyProvider,
  RoomOptions,
  VideoCodec,
  VideoPresets,
  Room,
  DeviceUnsupportedError,
  RoomConnectOptions,
  RoomEvent,
  TrackPublishDefaults,
  VideoCaptureOptions,
} from 'livekit-client';
import { useSetupE2EE } from '@/lib/hooks/use-setup-E2EE';
import { useLowCPUOptimizer } from '@/lib/hooks/use-perfomance-optimiser';
import { useWakeLock } from '@/lib/hooks/use-wake-lock';
import { MobileScreenShare } from '@/lib/components/conference/mobile-screen-share';
import { Conference } from '@/lib/components/conference/conference';
import { PreJoin } from '@/lib/components/prejoin/pre-join';
import { redirectToLogin } from '@/lib/client/client-auth';
import { setBackgroundAnimationActive } from '@/lib/client/background-animation';
import { useTranslation } from 'react-i18next';

const CONN_DETAILS_ENDPOINT = process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT ?? '/api/connection-details';
const SHOW_SETTINGS_MENU = process.env.NEXT_PUBLIC_SHOW_SETTINGS_MENU == 'true';

export const PageClientImpl = (props: {
  roomName: string;
  region?: string;
  hq: boolean;
  codec: VideoCodec;
  singlePeerConnection: boolean;
  initialNickname?: string;
  requiresPassword?: boolean;
}) => {
  const [preJoinChoices, setPreJoinChoices] = React.useState<LocalUserChoices | undefined>(
    undefined,
  );
  const [nickname, setNickname] = React.useState(props.initialNickname ?? '');
  const [requiresPassword, setRequiresPassword] = React.useState(!!props.requiresPassword);
  const preJoinDefaults = React.useMemo(() => {
    return {
      username: nickname,
      videoEnabled: true,
      audioEnabled: true,
    };
  }, [nickname]);
  const [connectionDetails, setConnectionDetails] = React.useState<ConnectionDetails | undefined>(
    undefined,
  );
  const [roomPassword, setRoomPassword] = React.useState('');
  const [joinError, setJoinError] = React.useState<string | null>(null);
  const { t } = useTranslation();

  React.useEffect(() => {
    let cancelled = false;
    fetch('/api/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.nickname) setNickname(data.nickname);
      })
      .catch(() => {});
    fetch(`/api/room-info?roomName=${encodeURIComponent(props.roomName)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setRequiresPassword(!!data.requiresPassword);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [props.roomName]);

  const handlePreJoinSubmit = React.useCallback(
    async (values: LocalUserChoices) => {
      setJoinError(null);
      const url = new URL(CONN_DETAILS_ENDPOINT, window.location.origin);
      url.searchParams.append('roomName', props.roomName);
      url.searchParams.append('participantName', values.username);
      if (requiresPassword && roomPassword) {
        url.searchParams.append('password', roomPassword);
      }
      if (props.region) {
        url.searchParams.append('region', props.region);
      }
      const resp = await fetch(url.toString());
      if (!resp.ok) {
        let reason = '';
        try {
          reason = (await resp.json())?.error ?? '';
        } catch {
        }
        if (resp.status === 401 && !reason) {
          redirectToLogin();
          return;
        }
        const messages: Record<string, string> = {
          admin_only: t('room.adminOnly'),
          password_required: t('room.passwordRequired'),
          wrong_password: t('room.wrongPassword'),
          guest_cannot_create: t('conference.guestCannotCreate'),
          banned: t('conference.banned'),
        };
        setJoinError(messages[reason] ?? t('room.joinError'));
        return;
      }
      const connectionDetailsData = await resp.json();
      setPreJoinChoices(values);
      addRecentRoom(props.roomName);
      setConnectionDetails(connectionDetailsData);
    },
    [props.roomName, props.region, requiresPassword, roomPassword, t],
  );
  const handlePreJoinError = React.useCallback((e: any) => console.error(e), []);

  return (
    <main style={{ height: '100%' }}>
      {connectionDetails === undefined || preJoinChoices === undefined ? (
        <div style={{ display: 'grid', placeItems: 'center', height: '100%', padding: '1.5rem' }}>
          <PreJoin
            defaults={preJoinDefaults}
            onSubmit={handlePreJoinSubmit}
            onError={handlePreJoinError}
            requiresPassword={requiresPassword}
            password={roomPassword}
            onPasswordChange={setRoomPassword}
            error={joinError}
          />
        </div>
      ) : (
        <VideoConferenceComponent
          connectionDetails={connectionDetails}
          userChoices={preJoinChoices}
          options={{
            codec: props.codec,
            hq: props.hq,
            singlePeerConnection: props.singlePeerConnection,
          }}
        />
      )}
    </main>
  );
};

const VideoConferenceComponent = (props: {
  userChoices: LocalUserChoices;
  connectionDetails: ConnectionDetails;
  options: {
    hq: boolean;
    codec: VideoCodec;
    singlePeerConnection: boolean;
  };
}) => {
  const keyProvider = new ExternalE2EEKeyProvider();
  const { worker, e2eePassphrase } = useSetupE2EE(props.connectionDetails.e2eePassphrase);
  const e2eeEnabled = !!(e2eePassphrase && worker);
  const { t } = useTranslation();

  const [e2eeSetupComplete, setE2eeSetupComplete] = React.useState(false);

  const roomOptions = React.useMemo((): RoomOptions => {
    let videoCodec: VideoCodec | undefined = props.options.codec ? props.options.codec : 'vp9';
    if (e2eeEnabled && (videoCodec === 'av1' || videoCodec === 'vp9')) {
      videoCodec = undefined;
    }
    const videoCaptureDefaults: VideoCaptureOptions = {
      deviceId: props.userChoices.videoDeviceId ?? undefined,
      resolution: props.options.hq ? VideoPresets.h2160 : VideoPresets.h720,
    };
    const publishDefaults: TrackPublishDefaults = {
      dtx: false,
      videoSimulcastLayers: props.options.hq
        ? [VideoPresets.h1080, VideoPresets.h720]
        : [VideoPresets.h540, VideoPresets.h216],
      red: !e2eeEnabled,
      videoCodec,
    };
    return {
      videoCaptureDefaults: videoCaptureDefaults,
      publishDefaults: publishDefaults,
      audioCaptureDefaults: {
        deviceId: props.userChoices.audioDeviceId ?? undefined,
        noiseSuppression: true,
        echoCancellation: true,
        autoGainControl: true,
      },
      adaptiveStream: true,
      dynacast: true,
      e2ee: keyProvider && worker && e2eeEnabled ? { keyProvider, worker } : undefined,
      singlePeerConnection: props.options.singlePeerConnection,
    };
  }, [props.userChoices, props.options.hq, props.options.codec]);

  const room = React.useMemo(() => new Room(roomOptions), []);

  React.useEffect(() => {
    if (e2eeEnabled) {
      keyProvider
        .setKey(decodePassphrase(e2eePassphrase))
        .then(() => {
          room.setE2EEEnabled(true).catch((e) => {
            if (e instanceof DeviceUnsupportedError) {
              alert(t('conference.e2eeUnsupported'));
              console.error(e);
            } else {
              throw e;
            }
          });
        })
        .then(() => setE2eeSetupComplete(true));
    } else {
      setE2eeSetupComplete(true);
    }
  }, [e2eeEnabled, room, e2eePassphrase]);

  const connectOptions = React.useMemo((): RoomConnectOptions => {
    return {
      autoSubscribe: true,
    };
  }, []);

  React.useEffect(() => {
    room.on(RoomEvent.Disconnected, handleOnLeave);
    room.on(RoomEvent.EncryptionError, handleEncryptionError);
    room.on(RoomEvent.MediaDevicesError, handleError);

    if (e2eeSetupComplete) {
      room
        .connect(
          props.connectionDetails.serverUrl,
          props.connectionDetails.participantToken,
          connectOptions,
        )
        .catch((error) => {
          handleError(error);
        });
      if (props.userChoices.videoEnabled) {
        room.localParticipant.setCameraEnabled(true).catch((error) => {
          handleError(error);
        });
      }
      if (props.userChoices.audioEnabled) {
        room.localParticipant.setMicrophoneEnabled(true).catch((error) => {
          handleError(error);
        });
      }
    }
    return () => {
      room.off(RoomEvent.Disconnected, handleOnLeave);
      room.off(RoomEvent.EncryptionError, handleEncryptionError);
      room.off(RoomEvent.MediaDevicesError, handleError);
    };
  }, [e2eeSetupComplete, room, props.connectionDetails, props.userChoices]);

  const lowPowerMode = useLowCPUOptimizer(room);
  useWakeLock(true);

  React.useEffect(() => {
    setBackgroundAnimationActive(false);
    return () => setBackgroundAnimationActive(true);
  }, []);

  const handleOnLeave = React.useCallback(() => window.location.assign('/'), []);
  const handleError = React.useCallback(
    (error: Error) => {
      console.error(error);
      alert(t('conference.unexpectedError', { message: error.message }));
    },
    [t],
  );
  const handleEncryptionError = React.useCallback(
    (error: Error) => {
      console.error(error);
      alert(t('conference.encryptionError', { message: error.message }));
    },
    [t],
  );

  React.useEffect(() => {
    if (lowPowerMode) {
      console.warn('Low power mode enabled');
    }
  }, [lowPowerMode]);

  return (
    <div className="lk-room-container">
      <RoomContextProvider room={room}>
        <KeyboardShortcuts />
        <Conference SettingsComponent={SHOW_SETTINGS_MENU ? SettingsMenu : undefined} />
        <MobileScreenShare />
        <DebugMode />
        <RecordingIndicator />
      </RoomContextProvider>
    </div>
  );
};
