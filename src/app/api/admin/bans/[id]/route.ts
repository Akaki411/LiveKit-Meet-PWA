import type { RouteContext } from 'rari';
import { requireAdmin } from '@/lib/auth/admin-guard';
import { removeBan } from '@/lib/data/bans';

export async function DELETE(
  request: Request,
  context?: RouteContext<{ id: string }>,
): Promise<Response> {
  if (!(await requireAdmin(request))) return new Response('Forbidden', { status: 403 });
  const numId = Number(context?.params.id);
  if (!Number.isInteger(numId)) return new Response('Bad Request', { status: 400 });
  const ok = await removeBan(numId);
  return ok ? Response.json({ ok: true }) : new Response('Not Found', { status: 404 });
}
