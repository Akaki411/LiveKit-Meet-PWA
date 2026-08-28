'use client';

import * as React from 'react';
import { useTrackToggle, type ToggleSource } from './use-room';
import styles from '../../../styles/generated/conference.classes';

export const TrackToggle = ({
  source,
  children,
  showIcon = true,
  onIcon,
  offIcon,
  className,
}: {
  source: ToggleSource;
  children?: React.ReactNode;
  showIcon?: boolean;
  onIcon?: React.ReactNode;
  offIcon?: React.ReactNode;
  className?: string;
}) => {
  const { enabled, pending, toggle } = useTrackToggle(source);

  return (
    <button
      type="button"
      className={className ?? styles.controlBtn}
      data-active={enabled ? 'true' : 'false'}
      aria-pressed={enabled}
      disabled={pending}
      onClick={() => toggle()}
    >
      {showIcon && (enabled ? onIcon : offIcon)}
      {children}
    </button>
  );
};
