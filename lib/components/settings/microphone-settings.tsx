'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Track } from 'livekit-client';
import { IconMicrophone, IconMicrophoneOff, IconNoiseReduction } from '@tabler/icons-react';
import { DeviceSelect, TrackToggle, useMicProcessing } from '@/lib/components/livekit';
import styles from '../../../styles/settings-menu.module.css';

export const MicrophoneSettings = () => {
  const { t } = useTranslation();
  const { noiseSuppression, setNoiseSuppression, gainPercent, setGainPercent } = useMicProcessing();

  return (
    <div className={styles.section}>
      <div className={styles.row}>
        <TrackToggle
          source={Track.Source.Microphone}
          className={styles.toggleBtn}
          onIcon={<IconMicrophone size={18} />}
          offIcon={<IconMicrophoneOff size={18} />}
        />
        <div
          className={styles.toggleBtn}
          data-active={noiseSuppression ? 'true' : 'false'}
          onClick={() => setNoiseSuppression(!noiseSuppression)}
          aria-pressed={noiseSuppression}
          title={noiseSuppression ? t('settings.disableNoiseCancellation') : t('settings.enableNoiseCancellation')}
        >
          <IconNoiseReduction size={18} stroke={2} />
        </div>
        <DeviceSelect kind="audioinput" placeholder={t('settings.microphone')} />
      </div>

      <div className={styles.sliderRow}>
        <div className={styles.sliderHead}>
          <span>{t('settings.micVolume')}</span>
          <span className={styles.sliderValue} data-boost={gainPercent > 100 ? 'true' : 'false'}>
            {gainPercent}%
          </span>
        </div>
        <input
          type="range"
          className={styles.slider}
          min={0}
          max={200}
          step={5}
          value={gainPercent}
          onChange={(event) => setGainPercent(Number(event.target.value))}
          aria-label={t('settings.micVolume')}
        />
        <div className={styles.sliderTicks}>
          <span>0%</span>
          <span>100%</span>
          <span>200%</span>
        </div>
      </div>
    </div>
  );
};
