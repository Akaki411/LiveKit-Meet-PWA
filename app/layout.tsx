import '../styles/globals.css';
import '@livekit/components-styles';
import '@livekit/components-styles/prefabs';
import type { Metadata, Viewport } from 'next';
import { Toaster } from 'react-hot-toast';
import { I18nProvider } from '@/lib/components/i18n-provider';
import { PwaRegister } from '@/lib/components/pwa-register';

export const metadata: Metadata = {
  title: 'LiveKit Meet',
  description: 'Private video meetings on your own server.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Meet' },
  icons: {
    icon: {
      rel: 'icon',
      url: '/favicon.ico',
    },
    apple: '/images/livekit-apple-touch.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#111111',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body data-lk-theme="default">
        <I18nProvider>
          <Toaster />
          {children}
          <PwaRegister />
        </I18nProvider>
      </body>
    </html>
  );
}
