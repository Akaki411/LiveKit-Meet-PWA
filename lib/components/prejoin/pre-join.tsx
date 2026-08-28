'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  IconChevronDownFilled,
  IconMicrophone,
  IconMicrophoneOff,
  IconVideo,
  IconVideoOff,
} from '@tabler/icons-react';
import {
  type LocalUserChoices,
  useMediaDeviceSelect,
  usePersistentUserChoices,
  usePreviewTracks,
} from '@/lib/components/livekit';
import { LocalAudioTrack, LocalVideoTrack, Track } from 'livekit-client';
import { PasswordInput } from '@/lib/components/common/password-input';
import styles from '../../../styles/pre-join.module.css';

const MicLevelMeter = ({ track }: { track?: LocalAudioTrack }) => {
  const fillRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const mst = track?.mediaStreamTrack;
    if (!mst) return;
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const source = ctx.createMediaStreamSource(new MediaStream([mst]));
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    ctx.resume?.().catch(() => {});

    let raf = 0;
    let smoothed = 0;
    const loop = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      const target = Math.min(1, Math.max(0, (rms - 0.01) * 4));
      smoothed = target > smoothed ? target : smoothed * 0.85 + target * 0.15;
      if (fillRef.current) fillRef.current.style.transform = `scaleX(${smoothed.toFixed(3)})`;
      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      try {
        source.disconnect();
        analyser.disconnect();
        ctx.close();
      } catch {
      }
    };
  }, [track]);

  return (
    <div className={styles.micMeter}>
      <div ref={fillRef} className={styles.micMeterFill} />
    </div>
  );
};

interface PreJoinProps {
  defaults?: Partial<LocalUserChoices>;
  onSubmit?: (values: LocalUserChoices) => void;
  onError?: (error: Error) => void;
  joinLabel?: string;
  requiresPassword?: boolean;
  password?: string;
  onPasswordChange?: (value: string) => void;
  error?: string | null;
}

export const PreJoin = ({
  defaults,
  onSubmit,
  onError,
  joinLabel,
  requiresPassword,
  password,
  onPasswordChange,
  error,
}: PreJoinProps) => {
  const { t } = useTranslation();
  const {
    userChoices,
    saveUsername,
    saveVideoInputEnabled,
    saveAudioInputEnabled,
    saveVideoInputDeviceId,
    saveAudioInputDeviceId,
  } = usePersistentUserChoices({ defaults });

  const [username, setUsername] = React.useState(userChoices.username);
  const [videoEnabled, setVideoEnabled] = React.useState(userChoices.videoEnabled);
  const [audioEnabled, setAudioEnabled] = React.useState(userChoices.audioEnabled);

  const initialVideoDeviceId = React.useRef(userChoices.videoDeviceId).current;
  const initialAudioDeviceId = React.useRef(userChoices.audioDeviceId).current;

  const handleError = React.useCallback((err: Error) => onError?.(err), [onError]);

  const tracks = usePreviewTracks(
    {
      audio: audioEnabled ? { deviceId: initialAudioDeviceId || undefined } : false,
      video: videoEnabled ? { deviceId: initialVideoDeviceId || undefined } : false,
    },
    handleError,
  );

  const videoTrack = React.useMemo(
    () => tracks?.find((track) => track.kind === Track.Kind.Video) as LocalVideoTrack | undefined,
    [tracks],
  );
  const audioTrack = React.useMemo(
    () => tracks?.find((track) => track.kind === Track.Kind.Audio) as LocalAudioTrack | undefined,
    [tracks],
  );

  const videoRef = React.useRef<HTMLVideoElement>(null);
  React.useEffect(() => {
    const el = videoRef.current;
    if (el && videoTrack) {
      videoTrack.unmute();
      videoTrack.attach(el);
    }
    return () => {
      videoTrack?.detach();
    };
  }, [videoTrack]);

  const camera = useMediaDeviceSelect({ kind: 'videoinput', track: videoTrack });
  const microphone = useMediaDeviceSelect({ kind: 'audioinput', track: audioTrack });

  const toggleVideo = (next: boolean) => {
    setVideoEnabled(next);
    saveVideoInputEnabled(next);
  };
  const toggleAudio = (next: boolean) => {
    setAudioEnabled(next);
    saveAudioInputEnabled(next);
  };
  const selectCamera = async (deviceId: string) => {
    await camera.setActiveMediaDevice(deviceId);
    saveVideoInputDeviceId(deviceId);
  };
  const selectMicrophone = async (deviceId: string) => {
    await microphone.setActiveMediaDevice(deviceId);
    saveAudioInputDeviceId(deviceId);
  };
  const changeName = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(event.target.value);
    saveUsername(event.target.value);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit?.({
      username,
      videoEnabled,
      audioEnabled,
      videoDeviceId: camera.activeDeviceId,
      audioDeviceId: microphone.activeDeviceId,
    });
  };

  const showVideo = videoEnabled && !!videoTrack;

  return (
    <form className={styles.card} onSubmit={submit}>
      <div className={styles.preview}>
        <video
          ref={videoRef}
          className={styles.video}
          data-hidden={!showVideo}
          disablePictureInPicture
          playsInline
          autoPlay
          muted
        />
        {!showVideo && (
          <div className={styles.placeholder}>
            <IconVideoOff size={40} />
          </div>
        )}
        <div className={styles.micIndicator} data-off={audioEnabled ? 'false' : 'true'}>
          {audioEnabled ? <IconMicrophone size={16} /> : <IconMicrophoneOff size={16} />}
          {audioEnabled && audioTrack && <MicLevelMeter track={audioTrack} />}
        </div>
      </div>

      <div className={styles.deviceRow}>
        <DeviceDropDown
          enabled={audioEnabled}
          devices={microphone.devices}
          activeDeviceId={microphone.activeDeviceId}
          placeholder={t('room.microphone')}
          onEnable={toggleAudio}
          onSelect={selectMicrophone}
        />
        <DeviceDropDown
          icon={<IconVideo size={18} />}
          hideIcon={<IconVideoOff size={18} />}
          enabled={videoEnabled}
          devices={camera.devices}
          activeDeviceId={camera.activeDeviceId}
          placeholder={t('room.camera')}
          onEnable={toggleVideo}
          onSelect={selectCamera}
        />
      </div>

      <input
        className={styles.field}
        placeholder={t('room.namePlaceholder')}
        value={username}
        onChange={changeName}
        autoFocus
      />

      {requiresPassword && (
        <PasswordInput
          wrapperClassName={styles.field}
          placeholder={t('room.password')}
          value={password ?? ''}
          onChange={(event) => onPasswordChange?.(event.target.value)}
        />
      )}

      {error && <div className={styles.error}>{error}</div>}

      <button className={styles.joinBtn} type="submit" disabled={!username.trim()}>
        {joinLabel ?? t('room.join')}
      </button>
    </form>
  );
};

const DeviceDropDown = ({
  icon = <IconMicrophone size={18} />,
  hideIcon = <IconMicrophoneOff size={18} />,
  enabled = true,
  placeholder = '',
  activeDeviceId,
  devices,
  onEnable,
  onSelect,
}: {
  icon?: React.ReactElement;
  hideIcon?: React.ReactElement;
  enabled?: boolean;
  placeholder?: string;
  activeDeviceId?: string;
  devices: MediaDeviceInfo[];
  onEnable: (next: boolean) => void;
  onSelect: (deviceId: string) => void;
}) => {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [open]);

  const activeLabel =
    devices.find((device) => device.deviceId === activeDeviceId)?.label || placeholder;

  return (
    <div className={styles.deviceDropDown} ref={rootRef}>
      <div
        className={styles.deviceLogo}
        data-off={!enabled}
        role="button"
        onClick={() => onEnable(!enabled)}
      >
        {enabled ? icon : hideIcon}
      </div>
      <span className={styles.deviceName} onClick={() => setOpen((value) => !value)}>
        {activeLabel}
      </span>
      <div
        className={styles.deviceArrowDown}
        data-open={open}
        onClick={() => setOpen((value) => !value)}
      >
        <IconChevronDownFilled size={18} />
      </div>
      {open && (
        <ul className={styles.deviceList}>
          {devices.length === 0 ? (
            <li className={styles.deviceItem} data-empty="true">
              {placeholder}
            </li>
          ) : (
            devices.map((device) => (
              <li
                key={device.deviceId}
                className={styles.deviceItem}
                data-active={device.deviceId === activeDeviceId}
                onClick={() => {
                  onSelect(device.deviceId);
                  setOpen(false);
                }}
              >
                {device.label || placeholder}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};
