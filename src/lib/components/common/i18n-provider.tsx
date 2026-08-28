'use client';

import * as React from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n/i18n';
import { dirForLang, fallbackLng } from '@/lib/i18n/i18n-config';

export const I18nProvider = ({ children }: { children: React.ReactNode }) => {
  React.useEffect(() => {
    const apply = (lng: string) => {
      const base = (lng || fallbackLng).split('-')[0];
      document.documentElement.lang = base;
      document.documentElement.dir = dirForLang(base);
    };
    apply(i18n.language);
    i18n.on('languageChanged', apply);
    return () => {
      i18n.off('languageChanged', apply);
    };
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
};
