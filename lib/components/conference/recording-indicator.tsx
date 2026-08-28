'use client';

import * as React from 'react';
import toast from 'react-hot-toast';
import { useIsRecording } from '@/lib/components/livekit';

const RECORDING_COLOR = 'rgba(245, 51, 63, 0.9)';

export const RecordingIndicator = () => {
  const isRecording = useIsRecording();
  const [wasRecording, setWasRecording] = React.useState(false);

  React.useEffect(() => {
    if (isRecording !== wasRecording) {
      setWasRecording(isRecording);
      if (isRecording) {
        toast('This meeting is being recorded', {
          duration: 3000,
          icon: '🎥',
          position: 'top-center',
          style: { backgroundColor: RECORDING_COLOR, color: '#fff' },
        });
      }
    }
  }, [isRecording, wasRecording]);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        boxShadow: isRecording ? `${RECORDING_COLOR} 0 0 0 3px inset` : 'none',
        pointerEvents: 'none',
        zIndex: 30,
      }}
    />
  );
};
