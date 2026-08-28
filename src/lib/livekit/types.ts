import { LocalAudioTrack, LocalVideoTrack, videoCodecs } from 'livekit-client';
import { VideoCodec } from 'livekit-client';

export interface SessionProps {
  roomName: string;
  identity: string;
  audioTrack?: LocalAudioTrack;
  videoTrack?: LocalVideoTrack;
  region?: string;
  turnServer?: RTCIceServer;
  forceRelay?: boolean;
}

export interface TokenResult {
  identity: string;
  accessToken: string;
}

export const isVideoCodec = (codec: string): codec is VideoCodec =>
  videoCodecs.includes(codec as VideoCodec);

export type ConnectionDetails = {
  serverUrl: string;
  roomName: string;
  participantName: string;
  participantToken: string;
  e2eePassphrase?: string;
};
