import { EncodedFileOutput, EncodedFileType, S3Upload } from 'livekit-server-sdk';
import { getEgressClient } from '@/lib/livekit/server';
import { canModerateRoom } from '@/lib/auth/room-moderator';

const OUTPUT_DIR = process.env.RECORD_OUTPUT_DIR || '/out';

const sanitize = (name: string): string =>
  name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80) || 'room';

export async function GET(request: Request): Promise<Response> {
  try {
    const roomName = new URL(request.url).searchParams.get('roomName');
    if (roomName === null) {
      return new Response('Missing roomName parameter', { status: 400 });
    }
    if (!(await canModerateRoom(request, roomName))) {
      return new Response('Forbidden', { status: 403 });
    }

    const { S3_KEY_ID, S3_KEY_SECRET, S3_BUCKET, S3_ENDPOINT, S3_REGION } = process.env;
    const useS3 = !!(S3_KEY_ID && S3_KEY_SECRET && S3_BUCKET);

    const egressClient = getEgressClient();

    const existingEgresses = await egressClient.listEgress({ roomName });
    if (existingEgresses.length > 0 && existingEgresses.some((e) => e.status < 2)) {
      return new Response('Meeting is already being recorded', { status: 409 });
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${stamp}-${sanitize(roomName)}.mp4`;

    const fileOutput = new EncodedFileOutput({
      fileType: EncodedFileType.MP4,
      filepath: useS3 ? filename : `${OUTPUT_DIR}/${filename}`,
      ...(useS3
        ? {
            output: {
              case: 's3' as const,
              value: new S3Upload({
                endpoint: S3_ENDPOINT,
                accessKey: S3_KEY_ID,
                secret: S3_KEY_SECRET,
                region: S3_REGION,
                bucket: S3_BUCKET,
              }),
            },
          }
        : {}),
    });

    await egressClient.startRoomCompositeEgress(roomName, { file: fileOutput }, { layout: 'speaker' });

    return new Response(null, { status: 200 });
  } catch {
    return new Response('Unexpected error', { status: 500 });
  }
}
