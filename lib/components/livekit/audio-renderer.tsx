'use client';

import * as React from 'react';
import type { TrackPublication } from 'livekit-client';
import { useRemoteAudioPublications } from './use-room';

const AudioElement = ({ publication }: { publication: TrackPublication }) => {
  const ref = React.useRef<HTMLAudioElement>(null);
  const track = publication.track;

  React.useEffect(() => {
    const el = ref.current;
    if (!el || !track) return;
    track.attach(el);
    return () => {
      track.detach(el);
    };
  }, [track]);

  return <audio ref={ref} />;
};

export const RoomAudioRenderer = () => {
  const publications = useRemoteAudioPublications();
  return (
    <div style={{ display: 'none' }}>
      {publications.map(({ participantIdentity, publication }) => (
        <AudioElement
          key={`${participantIdentity}-${publication.trackSid}`}
          publication={publication}
        />
      ))}
    </div>
  );
};
