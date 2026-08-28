import { clearSessionCookie } from '@/lib/auth/session-cookie';

export async function POST(): Promise<Response> {
  const response = Response.json({ ok: true });
  clearSessionCookie(response.headers);
  return response;
}
