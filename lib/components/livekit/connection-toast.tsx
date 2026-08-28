'use client';

import * as React from 'react';
import { ConnectionState } from 'livekit-client';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useConnectionState } from './use-room';

const TOAST_ID = 'lk-connection-state';

export const ConnectionStateToast = () => {
  const state = useConnectionState();
  const { t } = useTranslation();

  React.useEffect(() => {
    if (state === ConnectionState.Connecting) {
      toast.loading(t('conference.connecting'), { id: TOAST_ID });
    } else if (state === ConnectionState.Reconnecting) {
      toast.loading(t('conference.reconnecting'), { id: TOAST_ID });
    } else {
      toast.dismiss(TOAST_ID);
    }
  }, [state, t]);

  return null;
};
