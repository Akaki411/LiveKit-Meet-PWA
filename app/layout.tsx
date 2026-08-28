import '../styles/globals.css';
import type { Metadata, Viewport } from 'next';
import { Roboto_Flex } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { I18nProvider } from '@/lib/components/common/i18n-provider';
import { PwaRegister } from '@/lib/components/common/pwa-register';
import ParticleSystem from '@/lib/components/global/particle-system';
import { dirForLang, fallbackLng } from '@/lib/i18n/i18n-config';

const roboto = Roboto_Flex({
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  display: 'swap',
  variable: '--font-roboto',
});

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

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html
      lang={fallbackLng}
      dir={dirForLang(fallbackLng)}
      className={roboto.variable}
      suppressHydrationWarning
    >
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__deferredPwaPrompt=e;window.dispatchEvent(new Event('pwa-prompt-ready'));});window.addEventListener('appinstalled',function(){window.__deferredPwaPrompt=null;window.dispatchEvent(new Event('pwa-installed'));});})();",
          }}
        />
        <ParticleSystem>
          <I18nProvider>
            <Toaster />
            {children}
            <PwaRegister />
          </I18nProvider>
        </ParticleSystem>
      </body>
    </html>
  );
};

export default RootLayout;
