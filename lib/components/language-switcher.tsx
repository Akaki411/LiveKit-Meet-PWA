'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { IconWorld } from '@tabler/icons-react';

const LANGUAGES = [
  { code: 'en', label: '🇺🇸 English' },
  { code: 'ru', label: '🇷🇺 Русский' },
  { code: 'es', label: '🇪🇸 Español' },
  { code: 'fr', label: '🇫🇷 Français' },
  { code: 'ar', label: 'العربية 🇦🇪' },
  { code: 'zh', label: '🇨🇳 中文' },
];

export const LanguageSwitcher = (
  { className, label } :
  { className?: string, label: boolean }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const { i18n, t } = useTranslation();

  return (
    <div className={className ?? 'lang-switcher'} onClick={(): void => setIsOpen(!isOpen)}>
      <IconWorld stroke={1.5} size={18} color="#A3A3A3" />
      {label ? t('language.label') : null}
      {
        isOpen && <div className="lang-switcher-panel">
          {LANGUAGES.map((lang) => (
            <Block
              key={lang.code}
              code={lang.code}
              label={lang.label}
              onClick={(key) => i18n.changeLanguage(key)}
            />
          ))}
        </div>
      }
    </div>
  );
}

const Block = (
  {code, label, onClick} :
  {code: string, label: string, onClick: (code: string) => {}}) => {
  return (
    <div className="lang-switcher-block" onClick={() => {onClick(code)}}>
      {label}
    </div>
  )
}