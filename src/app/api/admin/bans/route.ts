import { requireAdmin } from '@/lib/auth/admin-guard';
import { listBans } from '@/lib/data/bans';

export async function GET(request: Request): Promise<Response> {
  if (!(await requireAdmin(request))) return new Response('Forbidden', { status: 403 });
  return Response.json(await listBans());
}
