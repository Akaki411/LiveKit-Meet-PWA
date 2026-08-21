import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { avatarPath, contentTypeFor } from '@/lib/avatars';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  try {
    const data = await fs.promises.readFile(avatarPath(file));
    return new NextResponse(data, {
      headers: {
        'Content-Type': contentTypeFor(file),
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch {
    return new NextResponse('Not Found', { status: 404 });
  }
}
