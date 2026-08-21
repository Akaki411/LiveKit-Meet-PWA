'use client';

import * as React from 'react';
import { IconEye, IconEyeOff } from '@tabler/icons-react';
import styles from '../../styles/password-input.module.css';

type PasswordInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  wrapperClassName?: string;
  wrapperStyle?: React.CSSProperties;
};

export function PasswordInput({
  wrapperClassName,
  wrapperStyle,
  className,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = React.useState(false);

  return (
    <div className={`${wrapperClassName ?? ''} ${styles.wrap}`} style={wrapperStyle}>
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        className={`${styles.input} ${className ?? ''}`}
      />
      <button
        type="button"
        className={styles.toggle}
        onClick={() => setVisible((value) => !value)}
        tabIndex={-1}
        aria-label="toggle password visibility"
      >
        {visible ? <IconEyeOff size={18} /> : <IconEye size={18} />}
      </button>
    </div>
  );
}
