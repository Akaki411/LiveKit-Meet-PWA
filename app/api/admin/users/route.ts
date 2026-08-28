import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-guard';
import { createUser, getUserByLogin, listUsers } from '@/lib/auth/users';
import { isOwnerRole } from '@/lib/auth/roles';

export const GET = async (request: NextRequest) => {
  if (!(await requireAdmin(request))) return new NextResponse('Forbidden', { status: 403 });
  return NextResponse.json(await listUsers());
};

export const POST = async (request: NextRequest) => {
  const session = await requireAdmin(request);
  if (!session) return new NextResponse('Forbidden', { status: 403 });

  let login = '';
  let password = '';
  let isAdmin = false;
  try {
    const body = await request.json();
    login = typeof body?.login === 'string' ? body.login.trim() : '';
    password = typeof body?.password === 'string' ? body.password : '';
    isAdmin = body?.isAdmin === true;
  } catch {
    return new NextResponse('Bad Request', { status: 400 });
  }

  if (!login) {
    return NextResponse.json({ error: 'login_required' }, { status: 400 });
  }
  if (await getUserByLogin(login)) {
    return NextResponse.json({ error: 'user_exists' }, { status: 409 });
  }

  const me = await getUserByLogin(session.login);
  const role = isOwnerRole(me?.role) && isAdmin ? 'admin' : 'user';

  const user = await createUser(login, password, role);
  return NextResponse.json(user, { status: 201 });
};
