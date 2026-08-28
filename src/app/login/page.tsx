import type { Metadata } from 'rari';
import LoginClient from '@/lib/components/login/login-client';

export default function LoginPage() {
  return <LoginClient />;
}

export const metadata: Metadata = {
  title: 'Sign in | LiveKit Meet',
  description: 'Sign in to LiveKit Meet.',
};
