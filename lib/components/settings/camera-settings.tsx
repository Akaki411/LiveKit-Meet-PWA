'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { IconVideo, IconVideoOff, IconUpload } from '@tabler/icons-react';
import { BackgroundBlur, VirtualBackground } from '@livekit/track-processors';
import { isLocalTrack, LocalTrackPublication, Track } from 'livekit-client';
import {
  DeviceSelect,
  TrackToggle,
  VideoTrack,
  useLocalParticipant,
  type TrackReference,
} from '@/lib/components/livekit';
import Wall from '../../../public/background-images/wall_texture_fullhd.webp';
import Room from '../../../public/background-images/room_bg_fullhd.webp';
import styles from '../../../styles/settings-menu.module.css';

const BACKGROUND_IMAGES = [
  { nameKey: 'settings.backgroundWall', path: Wall },
  { nameKey: 'settings.backgroundRoom', path: Room },
] as const;

type BackgroundType = 'none' | 'blur' | 'image';

export const CameraSettings = () => {
  const { t } = useTranslation();
  const localParticipant = useLocalParticipant();
  const cameraTrack = localParticipant.getTrackPublication(Track.Source.Camera) as
    | LocalTrackPublication
    | undefined;

  const [backgroundType, setBackgroundType] = React.useState<BackgroundType>(() => {
    const name = cameraTrack?.track?.getProcessor()?.name;
    if (name === 'background-blur') return 'blur';
    if (name === 'virtual-background') return 'image';
    return 'none';
  });
  const [virtualBackgroundImagePath, setVirtualBackgroundImagePath] = React.useState<string | null>(
    null,
  );
  const [uploadedImage, setUploadedImage] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const uploadedRef = React.useRef<string | null>(null);

  React.useEffect(
    () => () => {
      if (uploadedRef.current) URL.revokeObjectURL(uploadedRef.current);
    },
    [],
  );

  const onPickBackground = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (fileRef.current) fileRef.current.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    if (uploadedRef.current) URL.revokeObjectURL(uploadedRef.current);
    const url = URL.createObjectURL(file);
    uploadedRef.current = url;
    setUploadedImage(url);
    selectBackground('image', url);
  };

  const camTrackRef: TrackReference | undefined = React.useMemo(() => {
    return cameraTrack
      ? { participant: localParticipant, publication: cameraTrack, source: Track.Source.Camera }
      : undefined;
  }, [localParticipant, cameraTrack]);

  const selectBackground = (type: BackgroundType, imagePath?: string) => {
    setBackgroundType(type);
    if (type === 'image' && imagePath) {
      setVirtualBackgroundImagePath(imagePath);
    } else if (type !== 'image') {
      setVirtualBackgroundImagePath(null);
    }
  };

  React.useEffect(() => {
    if (isLocalTrack(cameraTrack?.track)) {
      if (backgroundType === 'blur') {
        cameraTrack.track?.setProcessor(BackgroundBlur());
      } else if (backgroundType === 'image' && virtualBackgroundImagePath) {
        cameraTrack.track?.setProcessor(VirtualBackground(virtualBackgroundImagePath));
      } else {
        cameraTrack.track?.stopProcessor();
      }
    }
  }, [cameraTrack, backgroundType, virtualBackgroundImagePath]);

  return (
    <div className={styles.section}>
      {camTrackRef && <VideoTrack trackRef={camTrackRef} className={styles.preview} mirror />}

      <div className={styles.row}>
        <TrackToggle
          source={Track.Source.Camera}
          className={styles.toggleBtn}
          onIcon={<IconVideo size={18} />}
          offIcon={<IconVideoOff size={18} />}
        />
        <DeviceSelect kind="videoinput" placeholder={t('settings.camera')} />
      </div>

      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>{t('settings.background')}</h4>
        <div className={styles.bgGrid}>
          <button
            type="button"
            className={styles.bgOption}
            data-active={backgroundType === 'none' ? 'true' : 'false'}
            onClick={() => selectBackground('none')}
          >
            <span className={styles.bgOptionLabel}>{t('settings.backgroundNone')}</span>
          </button>
          <button
            type="button"
            className={styles.bgOption}
            data-active={backgroundType === 'blur' ? 'true' : 'false'}
            onClick={() => selectBackground('blur')}
            style={{ backdropFilter: 'blur(4px)' }}
          >
            <span className={styles.bgOptionLabel}>{t('settings.backgroundBlur')}</span>
          </button>
          {BACKGROUND_IMAGES.map((image) => (
            <button
              key={image.path.src}
              type="button"
              className={styles.bgOption}
              data-active={
                backgroundType === 'image' && virtualBackgroundImagePath === image.path.src
                  ? 'true'
                  : 'false'
              }
              onClick={() => selectBackground('image', image.path.src)}
              style={{ backgroundImage: `url(${image.path.src})` }}
            >
              <span className={styles.bgOptionLabel}>{t(image.nameKey)}</span>
            </button>
          ))}

          {uploadedImage && (
            <button
              type="button"
              className={styles.bgOption}
              data-active={
                backgroundType === 'image' && virtualBackgroundImagePath === uploadedImage
                  ? 'true'
                  : 'false'
              }
              onClick={() => selectBackground('image', uploadedImage)}
              style={{ backgroundImage: `url(${uploadedImage})` }}
            >
              <span className={styles.bgOptionLabel}>{t('settings.backgroundYours')}</span>
            </button>
          )}

          <button
            type="button"
            className={`${styles.bgOption} ${styles.bgUpload}`}
            onClick={() => fileRef.current?.click()}
            title={t('settings.backgroundUpload')}
          >
            <IconUpload size={20} />
            <span className={styles.bgUploadLabel}>{t('settings.backgroundUpload')}</span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickBackground} />
        </div>
      </div>
    </div>
  );
};
