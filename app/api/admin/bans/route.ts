import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-guard';
import { listBans } from '@/lib/data/bans';

export const GET = async (request: NextRequest) => {
  if (!(await requireAdmin(request))) return new NextResponse('Forbidden', { status: 403 });
  return NextResponse.json(await listBans());
};
