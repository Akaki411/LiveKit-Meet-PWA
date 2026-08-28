import fs from 'node:fs';
import type { RouteContext } from 'rari';
import { avatarPath, contentTypeFor } from '@/lib/data/avatars';

// Returns base64 JSON, not raw binary — see src/lib/data/attachment-limits.ts for why.
export async function GET(
  _request: Request,
  context?: RouteContext<{ file: string }>,
): Promise<Response> {
  const file = context?.params.file ?? '';
  try {
    const data = await fs.promises.readFile(avatarPath(file));
    return Response.json(
      { type: contentTypeFor(file), dataBase64: data.toString('base64') },
      { headers: { 'Cache-Control': 'private, max-age=3600' } },
    );
  } catch {
    return new Response('Not Found', { status: 404 });
  }
}
