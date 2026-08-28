import { SESSION_COOKIE, verifySession } from '@/lib/auth/session';
import { setAvatar } from '@/lib/auth/users';
import { deleteAvatar, isAllowedType, saveAvatar } from '@/lib/data/avatars';
import { readCookie } from '@/lib/net/cookies';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request): Promise<Response> {
  const session = await verifySession(readCookie(request, SESSION_COOKIE));
  if (!session) return new Response('Unauthorized', { status: 401 });

  let body: { type?: string; dataBase64?: string };
  try {
    body = JSON.parse(await request.text());
  } catch {
    return new Response('Bad Request', { status: 400 });
  }
  const { type, dataBase64 } = body;
  if (typeof type !== 'string' || typeof dataBase64 !== 'string') {
    return Response.json({ error: 'no_file' }, { status: 400 });
  }
  if (!isAllowedType(type)) return Response.json({ error: 'bad_type' }, { status: 400 });

  const bytes = Buffer.from(dataBase64, 'base64');
  if (bytes.length > MAX_AVATAR_BYTES) return Response.json({ error: 'too_large' }, { status: 400 });

  const filename = await saveAvatar(bytes, type);
  const previous = await setAvatar(session.login, filename);
  await deleteAvatar(previous);
  return Response.json({ ok: true, avatar: filename });
}

export async function DELETE(request: Request): Promise<Response> {
  const session = await verifySession(readCookie(request, SESSION_COOKIE));
  if (!session) return new Response('Unauthorized', { status: 401 });
  const previous = await setAvatar(session.login, null);
  await deleteAvatar(previous);
  return Response.json({ ok: true });
}
