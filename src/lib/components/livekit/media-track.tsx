'use client';

import * as React from 'react';
import type { TrackReference } from './types';

export const VideoTrack = ({
  trackRef,
  className,
  style,
  mirror = false,
}: {
  trackRef: TrackReference;
  className?: string;
  style?: React.CSSProperties;
  mirror?: boolean;
}) => {
  const ref = React.useRef<HTMLVideoElement>(null);
  const track = trackRef.publication?.track;

  React.useEffect(() => {
    const el = ref.current;
    if (!el || !track) return;
    track.attach(el);
    return () => {
      track.detach(el);
    };
  }, [track]);

  return (
    <video
      ref={ref}
      className={className}
      style={{ transform: mirror ? 'scaleX(-1)' : undefined, ...style }}
      muted
      playsInline
      autoPlay
      disablePictureInPicture
    />
  );
};
