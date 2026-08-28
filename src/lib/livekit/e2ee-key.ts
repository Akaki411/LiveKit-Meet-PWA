import crypto from 'node:crypto';

const FALLBACK_SECRET = 'livekit-meet-insecure-dev-secret';

export const deriveRoomE2EEPassphrase = (roomName: string): string => {
  const secret = process.env.AUTH_SECRET || FALLBACK_SECRET;
  return crypto.createHmac('sha256', secret).update(`e2ee:${roomName}`).digest('base64url');
};
