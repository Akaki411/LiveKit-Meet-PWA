import type { RouteContext } from 'rari';
import { requireAdmin } from '@/lib/auth/admin-guard';
import { deleteUser, getUserById, getUserByLogin, setRole } from '@/lib/auth/users';
import { isAdminRole, isOwnerRole } from '@/lib/auth/roles';
import { markRoleChange } from '@/lib/auth/role-cache';

export async function DELETE(
  request: Request,
  context?: RouteContext<{ id: string }>,
): Promise<Response> {
  const session = await requireAdmin(request);
  if (!session) return new Response('Forbidden', { status: 403 });

  const numId = Number(context?.params.id);
  if (!Number.isInteger(numId)) return new Response('Bad Request', { status: 400 });

  const me = await getUserByLogin(session.login);
  const target = await getUserById(numId);
  if (!target) return new Response('Not Found', { status: 404 });

  if (isOwnerRole(target.role)) {
    return Response.json({ error: 'cannot_delete_owner' }, { status: 403 });
  }
  if (me && me.id === numId) {
    return Response.json({ error: 'cannot_delete_self' }, { status: 400 });
  }
  if (isAdminRole(target.role) && !isOwnerRole(me?.role)) {
    return Response.json({ error: 'owner_required' }, { status: 403 });
  }

  const ok = await deleteUser(numId);
  if (ok) markRoleChange(target.login, 'user');
  return ok ? Response.json({ ok: true }) : new Response('Not Found', { status: 404 });
}

export async function PATCH(
  request: Request,
  context?: RouteContext<{ id: string }>,
): Promise<Response> {
  const session = await requireAdmin(request);
  if (!session) return new Response('Forbidden', { status: 403 });

  const me = await getUserByLogin(session.login);
  if (!isOwnerRole(me?.role)) {
    return Response.json({ error: 'owner_required' }, { status: 403 });
  }

  const numId = Number(context?.params.id);
  if (!Number.isInteger(numId)) return new Response('Bad Request', { status: 400 });

  let makeAdmin: boolean;
  try {
    const body = await request.json();
    makeAdmin = body?.isAdmin === true;
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  const target = await getUserById(numId);
  if (!target) return new Response('Not Found', { status: 404 });
  if (isOwnerRole(target.role)) {
    return Response.json({ error: 'cannot_modify_owner' }, { status: 403 });
  }

  const role = makeAdmin ? 'admin' : 'user';
  await setRole(numId, role);
  markRoleChange(target.login, role);
  return Response.json(await getUserById(numId));
}
