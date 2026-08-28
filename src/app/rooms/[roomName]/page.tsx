import type { PageProps } from 'rari';
import type { VideoCodec } from 'livekit-client';
import { PageClientImpl } from '@/lib/components/prejoin/page-client-impl';

const VIDEO_CODECS: VideoCodec[] = ['vp8', 'h264', 'vp9', 'av1'];

const safeDecodeRoomName = (name: string): string => {
  try {
    let decoded = name;
    for (let i = 0; i < 3 && /%[0-9a-fA-F]{2}/.test(decoded); i++) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
    return decoded;
  } catch {
    return name;
  }
};

const str = (value: string | readonly string[] | undefined): string | undefined =>
  typeof value === 'string' ? value : undefined;

export default function Page({ params, searchParams }: PageProps) {
  const roomName = safeDecodeRoomName(String(params.roomName));
  const codecParam = str(searchParams.codec);
  const codec: VideoCodec =
    codecParam && VIDEO_CODECS.includes(codecParam as VideoCodec)
      ? (codecParam as VideoCodec)
      : 'vp9';
  const hq = str(searchParams.hq) === 'true';
  const singlePC = str(searchParams.singlePC) !== 'false';

  return (
    <PageClientImpl
      roomName={roomName}
      region={str(searchParams.region)}
      hq={hq}
      codec={codec}
      singlePeerConnection={singlePC}
      initialNickname=""
      requiresPassword={false}
    />
  );
}
