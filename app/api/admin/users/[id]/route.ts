import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { deleteUser, getUserById, getUserByLogin, setRole } from '@/lib/auth';
import { isAdminRole, isOwnerRole } from '@/lib/roles';
import { markRoleChange } from '@/lib/role-cache';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin(request);
  if (!session) return new NextResponse('Forbidden', { status: 403 });

  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId)) return new NextResponse('Bad Request', { status: 400 });

  const me = await getUserByLogin(session.login);
  const target = await getUserById(numId);
  if (!target) return new NextResponse('Not Found', { status: 404 });

  if (isOwnerRole(target.role)) {
    return NextResponse.json({ error: 'cannot_delete_owner' }, { status: 403 });
  }
  if (me && me.id === numId) {
    return NextResponse.json({ error: 'cannot_delete_self' }, { status: 400 });
  }
  if (isAdminRole(target.role) && !isOwnerRole(me?.role)) {
    return NextResponse.json({ error: 'owner_required' }, { status: 403 });
  }

  const ok = await deleteUser(numId);
  if (ok) markRoleChange(target.login, 'user');
  return ok ? NextResponse.json({ ok: true }) : new NextResponse('Not Found', { status: 404 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin(request);
  if (!session) return new NextResponse('Forbidden', { status: 403 });

  const me = await getUserByLogin(session.login);
  if (!isOwnerRole(me?.role)) {
    return NextResponse.json({ error: 'owner_required' }, { status: 403 });
  }

  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId)) return new NextResponse('Bad Request', { status: 400 });

  let makeAdmin: boolean;
  try {
    const body = await request.json();
    makeAdmin = body?.isAdmin === true;
  } catch {
    return new NextResponse('Bad Request', { status: 400 });
  }

  const target = await getUserById(numId);
  if (!target) return new NextResponse('Not Found', { status: 404 });
  if (isOwnerRole(target.role)) {
    return NextResponse.json({ error: 'cannot_modify_owner' }, { status: 403 });
  }

  const role = makeAdmin ? 'admin' : 'user';
  await setRole(numId, role);
  markRoleChange(target.login, role);
  const updated = await getUserById(numId);
  return NextResponse.json(updated);
}
