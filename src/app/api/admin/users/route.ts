import { requireAdmin } from '@/lib/auth/admin-guard';
import { createUser, getUserByLogin, listUsers } from '@/lib/auth/users';
import { isOwnerRole } from '@/lib/auth/roles';

export async function GET(request: Request): Promise<Response> {
  if (!(await requireAdmin(request))) return new Response('Forbidden', { status: 403 });
  return Response.json(await listUsers());
}

export async function POST(request: Request): Promise<Response> {
  const session = await requireAdmin(request);
  if (!session) return new Response('Forbidden', { status: 403 });

  let login = '';
  let password = '';
  let isAdmin = false;
  try {
    const body = await request.json();
    login = typeof body?.login === 'string' ? body.login.trim() : '';
    password = typeof body?.password === 'string' ? body.password : '';
    isAdmin = body?.isAdmin === true;
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  if (!login) return Response.json({ error: 'login_required' }, { status: 400 });
  if (await getUserByLogin(login)) return Response.json({ error: 'user_exists' }, { status: 409 });

  const me = await getUserByLogin(session.login);
  const role = isOwnerRole(me?.role) && isAdmin ? 'admin' : 'user';

  const user = await createUser(login, password, role);
  return Response.json(user, { status: 201 });
}
