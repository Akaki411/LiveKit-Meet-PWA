'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { IconX } from '@tabler/icons-react';
import { DeviceSelect, useIsRecording, useRoomContext } from '@/lib/components/livekit';
import { CameraSettings } from './camera-settings';
import { MicrophoneSettings } from './microphone-settings';
import styles from '../../../styles/settings-menu.module.css';

const RECORDING_COLOR = 'rgba(245, 51, 63, 0.9)';

export const SettingsMenu = ({ onClose }: { onClose: () => void }) => {
  const room = useRoomContext();
  const { t } = useTranslation();
  const recordingEndpoint = process.env.NEXT_PUBLIC_LK_RECORD_ENDPOINT;

  const tabs = React.useMemo(
    () => (recordingEndpoint ? (['media', 'recording'] as const) : (['media'] as const)),
    [recordingEndpoint],
  );
  const [activeTab, setActiveTab] = React.useState<'media' | 'recording'>('media');

  const isRecording = useIsRecording();
  const [processingRecRequest, setProcessingRecRequest] = React.useState(false);

  React.useEffect(() => {
    setProcessingRecRequest(false);
  }, [isRecording]);

  const toggleRoomRecording = async () => {
    if (!recordingEndpoint) return;
    if (room.isE2EEEnabled) {
      toast.error(t('settings.recordingEncryptedUnsupported'), {
        style: { backgroundColor: RECORDING_COLOR, color: '#fff' },
      });
      return;
    }
    setProcessingRecRequest(true);
    const action = isRecording ? 'stop' : 'start';
    const response = await fetch(`${recordingEndpoint}/${action}?roomName=${room.name}`);
    if (!response.ok) {
      console.error('Recording request failed:', response.status, response.statusText);
      setProcessingRecRequest(false);
    }
  };

  return (
    <div className={styles.menu}>
      <div className={styles.header}>
        <h2 className={styles.title}>{t('conference.settings')}</h2>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label={t('settings.close')}
          title={t('settings.close')}
        >
          <IconX size={16} />
        </button>
      </div>

      <div className={styles.tabs}>
        {tabs.map((tab) => (
          <div
            key={tab}
            className={styles.tab}
            aria-pressed={tab === activeTab}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'media' ? t('settings.mediaDevices') : t('settings.recording')}
          </div>
        ))}
      </div>

      {activeTab === 'media' && (
        <>
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>{t('settings.camera')}</h3>
            <CameraSettings />
          </section>
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>{t('settings.microphone')}</h3>
            <MicrophoneSettings />
          </section>
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>{t('settings.speakerHeadphones')}</h3>
            <DeviceSelect kind="audiooutput" placeholder={t('settings.audioOutput')} />
          </section>
        </>
      )}

      {activeTab === 'recording' && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>{t('settings.recordMeeting')}</h3>
          <p className={styles.recordingStatus}>
            {isRecording && <span className={styles.recordingDot} />}
            {isRecording ? t('settings.recordingActive') : t('settings.recordingInactive')}
          </p>
          <button
            type="button"
            className={`${styles.toggleBtn} ${isRecording ? styles.recordingStop : ''}`}
            disabled={processingRecRequest}
            onClick={toggleRoomRecording}
          >
            {isRecording ? t('settings.stopRecording') : t('settings.startRecording')}
          </button>
        </section>
      )}
    </div>
  );
};
