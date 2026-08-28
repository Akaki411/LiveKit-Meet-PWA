'use client';

export const encodePassphrase = (passphrase: string) => encodeURIComponent(passphrase);

export const decodePassphrase = (base64String: string) => decodeURIComponent(base64String);

export const generateRoomId = (): string => `${randomString(4)}-${randomString(4)}`;

export const randomString = (length: number): string => {
  let result = '';
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

export const isLowPowerDevice = () => navigator.hardwareConcurrency < 6;

export const isMeetStaging = () => new URL(location.origin).host === 'meet.staging.livekit.io';
