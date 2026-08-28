import type { Metadata } from 'rari';
import HomeClient from '@/lib/components/home/home-client';

export default function HomePage() {
  return <HomeClient />;
}

export const metadata: Metadata = {
  title: 'LiveKit Meet',
  description: 'Private video meetings on your own server.',
};
