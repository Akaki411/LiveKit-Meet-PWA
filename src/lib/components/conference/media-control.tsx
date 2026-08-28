'use client';

import * as React from 'react';
import { RoomEvent, Track } from 'livekit-client';
import { IconChevronUp } from '@tabler/icons-react';
import {
  useMediaDevices,
  useRoomContext,
  useTrackToggle,
  type ToggleSource,
} from '@/lib/components/livekit';
import styles from '../../../styles/generated/conference.classes';

export const MediaControl = ({
  source,
  kind,
  onIcon,
  offIcon,
  label,
}: {
  source: Extract<ToggleSource, Track.Source.Camera | Track.Source.Microphone>;
  kind: MediaDeviceKind;
  onIcon: React.ReactNode;
  offIcon: React.ReactNode;
  label: string;
}) => {
  const room = useRoomContext();
  const { enabled, pending, toggle } = useTrackToggle(source);
  const devices = useMediaDevices(kind);
  const [open, setOpen] = React.useState(false);
  const [activeDeviceId, setActiveDeviceId] = React.useState<string>(
    () => room.getActiveDevice(kind) ?? '',
  );
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onActiveDeviceChanged = (changedKind: MediaDeviceKind, deviceId: string) => {
      if (changedKind === kind) setActiveDeviceId(deviceId);
    };
    room.on(RoomEvent.ActiveDeviceChanged, onActiveDeviceChanged);
    return () => {
      room.off(RoomEvent.ActiveDeviceChanged, onActiveDeviceChanged);
    };
  }, [room, kind]);

  React.useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [open]);

  const select = async (deviceId: string) => {
    try {
      await room.switchActiveDevice(kind, deviceId);
      setActiveDeviceId(deviceId);
    } catch (error) {
      console.error(error);
    }
    setOpen(false);
  };

  return (
    <div className={styles.mediaControl} ref={rootRef}>
      <button
        type="button"
        className={`${styles.controlBtn} ${styles.mediaToggle}`}
        data-active={enabled ? 'true' : 'false'}
        aria-pressed={enabled}
        disabled={pending}
        onClick={() => toggle()}
        aria-label={label}
        title={label}
      >
        {enabled ? onIcon : offIcon}
      </button>
      <button
        type="button"
        className={styles.mediaChevron}
        aria-label={`${label} — devices`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <IconChevronUp size={14} data-open={open} />
      </button>
      {open && (
        <ul className={styles.mediaDeviceList}>
          {devices.length === 0 ? (
            <li className={styles.mediaDeviceItem} data-empty="true">
              {label}
            </li>
          ) : (
            devices.map((device) => (
              <li
                key={device.deviceId}
                className={styles.mediaDeviceItem}
                data-active={device.deviceId === activeDeviceId}
                onClick={() => select(device.deviceId)}
              >
                {device.label || label}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};
