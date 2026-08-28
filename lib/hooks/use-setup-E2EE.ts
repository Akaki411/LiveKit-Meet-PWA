import React from 'react';
import { decodePassphrase } from '../client/client-utils';

export const useSetupE2EE = (overridePassphrase?: string) => {
  const hashPassphrase =
    typeof window !== 'undefined' ? decodePassphrase(location.hash.substring(1)) : undefined;
  const e2eePassphrase = overridePassphrase || hashPassphrase || undefined;

  const worker = React.useMemo<Worker | undefined>(
    () =>
      typeof window !== 'undefined' && e2eePassphrase
        ? new Worker(new URL('livekit-client/e2ee-worker', import.meta.url))
        : undefined,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [!!e2eePassphrase],
  );

  return { worker, e2eePassphrase };
};
