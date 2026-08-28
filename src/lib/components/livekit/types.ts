'use client';

import type { Participant, Track, TrackPublication } from 'livekit-client';

export interface TrackReference {
  participant: Participant;
  publication: TrackPublication;
  source: Track.Source;
}

export interface TrackReferencePlaceholder {
  participant: Participant;
  publication?: undefined;
  source: Track.Source;
}

export type TrackReferenceOrPlaceholder = TrackReference | TrackReferencePlaceholder;

export const isTrackReference = (
  ref: TrackReferenceOrPlaceholder | undefined,
): ref is TrackReference => !!ref && ref.publication !== undefined;

export const isTrackReferenceEqual = (
  a: TrackReferenceOrPlaceholder | undefined,
  b: TrackReferenceOrPlaceholder | undefined,
): boolean => {
  if (!a || !b) return a === b;
  return (
    a.participant.identity === b.participant.identity &&
    a.source === b.source &&
    a.publication?.trackSid === b.publication?.trackSid
  );
};

export interface LocalUserChoices {
  username: string;
  videoEnabled: boolean;
  audioEnabled: boolean;
  videoDeviceId: string;
  audioDeviceId: string;
}

export const defaultUserChoices: LocalUserChoices = {
  username: '',
  videoEnabled: true,
  audioEnabled: true,
  videoDeviceId: 'default',
  audioDeviceId: 'default',
};
