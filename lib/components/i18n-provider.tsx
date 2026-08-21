'use client';

import * as React from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    const apply = (lng: string) => {
      const base = (lng || 'en').split('-')[0];
      document.documentElement.lang = base;
      document.documentElement.dir = base === 'ar' ? 'rtl' : 'ltr';
    };
    apply(i18n.language);
    i18n.on('languageChanged', apply);
    return () => {
      i18n.off('languageChanged', apply);
    };
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
