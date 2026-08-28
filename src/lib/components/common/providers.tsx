'use client';

import * as React from 'react';
import ClientToaster from '@/lib/components/common/client-toaster';
import { I18nProvider } from '@/lib/components/common/i18n-provider';
import { PwaRegister } from '@/lib/components/common/pwa-register';
import ParticleSystem from '@/lib/components/global/particle-system';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ParticleSystem>
      <I18nProvider>
        <ClientToaster />
        {children}
        <PwaRegister />
      </I18nProvider>
    </ParticleSystem>
  );
}
