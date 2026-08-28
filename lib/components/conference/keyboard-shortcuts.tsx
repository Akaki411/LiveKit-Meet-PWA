'use client';

import * as React from 'react';
import { Track } from 'livekit-client';
import { useTrackToggle } from '@/lib/components/livekit';

export const KeyboardShortcuts = () => {
  const { toggle: toggleMic } = useTrackToggle(Track.Source.Microphone);
  const { toggle: toggleCamera } = useTrackToggle(Track.Source.Camera);

  React.useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.key === 'A' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        toggleMic();
      }
      if (event.key === 'V' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        toggleCamera();
      }
    };

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [toggleMic, toggleCamera]);

  return null;
};
