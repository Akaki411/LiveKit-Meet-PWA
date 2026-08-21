'use client';

import React from 'react';
import { Track } from 'livekit-client';
import { useTrackToggle } from '@livekit/components-react';

export function KeyboardShortcuts() {
  const { toggle: toggleMic } = useTrackToggle({ source: Track.Source.Microphone });
  const { toggle: toggleCamera } = useTrackToggle({ source: Track.Source.Camera });

  React.useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if (toggleMic && event.key === 'A' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        toggleMic();
      }

      if (event.key === 'V' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        toggleCamera();
      }
    }

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [toggleMic, toggleCamera]);

  return null;
}
