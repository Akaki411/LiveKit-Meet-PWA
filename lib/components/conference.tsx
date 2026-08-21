'use client';

import * as React from 'react';
import { RoomEvent, Track } from 'livekit-client';
import {
  isEqualTrackRef,
  isTrackReference,
  isWeb,
  type TrackReferenceOrPlaceholder,
} from '@livekit/components-core';
import {
  CarouselLayout,
  Chat,
  ConnectionStateToast,
  ControlBar,
  FocusLayout,
  FocusLayoutContainer,
  GridLayout,
  LayoutContextProvider,
  ParticipantTile,
  RoomAudioRenderer,
  useCreateLayoutContext,
  useMaybeTrackRefContext,
  usePinnedTracks,
  useTracks,
  type MessageFormatter,
  type WidgetState,
} from '@livekit/components-react';

function parseAvatar(metadata: string | undefined): string | null {
  if (!metadata) return null;
  try {
    const parsed = JSON.parse(metadata);
    return typeof parsed.avatar === 'string' ? parsed.avatar : null;
  } catch {
    return null;
  }
}

function AvatarParticipantTile() {
  const trackRef = useMaybeTrackRefContext();
  const cameraOff =
    !!trackRef &&
    trackRef.source === Track.Source.Camera &&
    (!trackRef.publication || trackRef.publication.isMuted || !trackRef.publication.track);
  const avatar = parseAvatar(trackRef?.participant?.metadata);

  return (
    <div className="lk-avatar-tile">
      <ParticipantTile />
      {cameraOff && avatar && (
        <div className="lk-avatar-overlay">
          <img src={`/api/avatars/${avatar}`} alt="" />
        </div>
      )}
    </div>
  );
}

export function Conference(props: {
  chatMessageFormatter?: MessageFormatter;
  SettingsComponent?: React.ComponentType;
}) {
  const [widgetState, setWidgetState] = React.useState<WidgetState>({
    showChat: false,
    unreadMessages: 0,
    showSettings: false,
  });
  const lastAutoFocusedScreenShareTrack = React.useRef<TrackReferenceOrPlaceholder | null>(null);

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { updateOnlyOn: [RoomEvent.ActiveSpeakersChanged], onlySubscribed: false },
  );

  const layoutContext = useCreateLayoutContext();

  const screenShareTracks = tracks
    .filter(isTrackReference)
    .filter((track) => track.publication.source === Track.Source.ScreenShare);

  const focusTrack = usePinnedTracks(layoutContext)?.[0];
  const carouselTracks = tracks.filter((track) => !isEqualTrackRef(track, focusTrack));

  React.useEffect(() => {
    if (
      screenShareTracks.some((track) => track.publication.isSubscribed) &&
      lastAutoFocusedScreenShareTrack.current === null
    ) {
      layoutContext.pin.dispatch?.({ msg: 'set_pin', trackReference: screenShareTracks[0] });
      lastAutoFocusedScreenShareTrack.current = screenShareTracks[0];
    } else if (
      lastAutoFocusedScreenShareTrack.current &&
      !screenShareTracks.some(
        (track) =>
          track.publication.trackSid ===
          lastAutoFocusedScreenShareTrack.current?.publication?.trackSid,
      )
    ) {
      layoutContext.pin.dispatch?.({ msg: 'clear_pin' });
      lastAutoFocusedScreenShareTrack.current = null;
    }
  }, [
    screenShareTracks
      .map((ref) => `${ref.publication.trackSid}_${ref.publication.isSubscribed}`)
      .join(),
    focusTrack?.publication?.trackSid,
  ]);

  return (
    <div className="lk-video-conference">
      {isWeb() && (
        <LayoutContextProvider value={layoutContext} onWidgetChange={setWidgetState}>
          <div className="lk-video-conference-inner">
            {!focusTrack ? (
              <div className="lk-grid-layout-wrapper">
                <GridLayout tracks={tracks}>
                  <AvatarParticipantTile />
                </GridLayout>
              </div>
            ) : (
              <div className="lk-focus-layout-wrapper">
                <FocusLayoutContainer>
                  <CarouselLayout tracks={carouselTracks}>
                    <AvatarParticipantTile />
                  </CarouselLayout>
                  {focusTrack && <FocusLayout trackRef={focusTrack} />}
                </FocusLayoutContainer>
              </div>
            )}
            <ControlBar controls={{ chat: true, settings: !!props.SettingsComponent }} />
          </div>
          <Chat
            style={{ display: widgetState.showChat ? 'flex' : 'none' }}
            messageFormatter={props.chatMessageFormatter}
          />
          {props.SettingsComponent && (
            <div
              className="lk-settings-menu-modal"
              style={{ display: widgetState.showSettings ? 'block' : 'none' }}
            >
              <props.SettingsComponent />
            </div>
          )}
        </LayoutContextProvider>
      )}
      <RoomAudioRenderer />
      <ConnectionStateToast />
    </div>
  );
}
