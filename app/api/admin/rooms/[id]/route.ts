import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { deleteRoom } from '@/lib/rooms';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin(request))) return new NextResponse('Forbidden', { status: 403 });
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId)) return new NextResponse('Bad Request', { status: 400 });
  const ok = await deleteRoom(numId);
  return ok ? NextResponse.json({ ok: true }) : new NextResponse('Not Found', { status: 404 });
}
