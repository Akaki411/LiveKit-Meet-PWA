import { SESSION_COOKIE, SESSION_MAX_AGE, signSession } from './session';
import { isSecureCookies, serializeCookie } from '@/lib/net/cookies';

export const setSessionCookie = async (
  headers: Headers,
  login: string,
  isAdmin: boolean,
): Promise<void> => {
  const token = await signSession(login, isAdmin);
  headers.append(
    'Set-Cookie',
    serializeCookie(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: isSecureCookies,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE,
    }),
  );
};

export const clearSessionCookie = (headers: Headers): void => {
  headers.append(
    'Set-Cookie',
    serializeCookie(SESSION_COOKIE, '', {
      httpOnly: true,
      secure: isSecureCookies,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    }),
  );
};
