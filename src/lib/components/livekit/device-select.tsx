'use client';

import * as React from 'react';
import { RoomEvent } from 'livekit-client';
import { IconChevronDownFilled } from '@tabler/icons-react';
import { useRoomContext } from './room-context';
import { useMediaDevices } from './use-media-devices';
import styles from '../../../styles/generated/conference.classes';

export const DeviceSelect = ({
  kind,
  placeholder = '',
}: {
  kind: MediaDeviceKind;
  placeholder?: string;
}) => {
  const room = useRoomContext();
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

  const activeLabel =
    devices.find((device) => device.deviceId === activeDeviceId)?.label ||
    devices[0]?.label ||
    placeholder;

  return (
    <div className={styles.deviceSelect} ref={rootRef}>
      <button
        type="button"
        className={styles.deviceSelectButton}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={styles.deviceSelectLabel}>{activeLabel}</span>
        <IconChevronDownFilled size={16} data-open={open} className={styles.deviceSelectArrow} />
      </button>
      {open && (
        <ul className={styles.deviceSelectList}>
          {devices.length === 0 ? (
            <li className={styles.deviceSelectItem} data-empty="true">
              {placeholder}
            </li>
          ) : (
            devices.map((device) => (
              <li
                key={device.deviceId}
                className={styles.deviceSelectItem}
                data-active={device.deviceId === activeDeviceId}
                onClick={() => select(device.deviceId)}
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
