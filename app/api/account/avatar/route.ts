import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/auth/session';
import { setAvatar } from '@/lib/auth/users';
import { deleteAvatar, isAllowedType, saveAvatar } from '@/lib/data/avatars';

export const POST = async (request: NextRequest) => {
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return new NextResponse('Unauthorized', { status: 401 });

  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'no_file' }, { status: 400 });
  if (!isAllowedType(file.type)) return NextResponse.json({ error: 'bad_type' }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'too_large' }, { status: 400 });

  const bytes = Buffer.from(await file.arrayBuffer());
  const filename = await saveAvatar(bytes);
  const previous = await setAvatar(session.login, filename);
  await deleteAvatar(previous);
  return NextResponse.json({ ok: true, avatar: filename });
};

export const DELETE = async (request: NextRequest) => {
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return new NextResponse('Unauthorized', { status: 401 });
  const previous = await setAvatar(session.login, null);
  await deleteAvatar(previous);
  return NextResponse.json({ ok: true });
};
