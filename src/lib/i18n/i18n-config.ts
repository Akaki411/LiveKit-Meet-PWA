'use client';

export const fallbackLng = 'en';

export const supportedLngs = ['en', 'ru', 'es', 'fr', 'ar', 'zh'] as const;

export type SupportedLng = (typeof supportedLngs)[number];

export const dirForLang = (lng: string | undefined): 'rtl' | 'ltr' =>
  (lng ?? fallbackLng).split('-')[0] === 'ar' ? 'rtl' : 'ltr';
