'use client';

import * as React from 'react';
import { ParticipantTile } from './participant-tile';
import { isTrackReferenceEqual, type TrackReferenceOrPlaceholder } from './types';
import styles from '../../../styles/generated/conference.classes';

const refKey = (ref: TrackReferenceOrPlaceholder): string =>
  `${ref.participant.identity}_${ref.source}_${ref.publication?.trackSid ?? 'placeholder'}`;

type SelectHandler = (trackRef: TrackReferenceOrPlaceholder) => void;

const TILE_GAP = 12;
const TILE_ASPECT = 16 / 9;

const bestTileSize = (width: number, height: number, count: number) => {
  if (count <= 0 || width <= 0 || height <= 0) return { w: 0, h: 0 };
  let best = { area: 0, w: 0, h: 0 };
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);
    let tileW = (width - TILE_GAP * (cols - 1)) / cols;
    let tileH = tileW / TILE_ASPECT;
    if (tileH * rows + TILE_GAP * (rows - 1) > height) {
      tileH = (height - TILE_GAP * (rows - 1)) / rows;
      tileW = tileH * TILE_ASPECT;
    }
    if (tileW <= 0 || tileH <= 0) continue;
    const area = tileW * tileH;
    if (area > best.area) best = { area, w: tileW, h: tileH };
  }
  return { w: Math.floor(best.w), h: Math.floor(best.h) };
};

export const GridLayout = ({
  tracks,
  onSelect,
}: {
  tracks: TrackReferenceOrPlaceholder[];
  onSelect?: SelectHandler;
}) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [size, setSize] = React.useState({ width: 0, height: 0 });

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (box) setSize({ width: box.width, height: box.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const tile = bestTileSize(size.width, size.height, tracks.length);

  return (
    <div ref={ref} className={styles.grid}>
      {tracks.map((track) => (
        <div
          key={refKey(track)}
          className={styles.gridCell}
          style={tile.w > 0 ? { width: tile.w, height: tile.h } : undefined}
        >
          <ParticipantTile trackRef={track} onSelect={onSelect} />
        </div>
      ))}
    </div>
  );
};

export const FocusLayout = ({
  focusTrack,
  tracks,
  onSelect,
  onSelectFocus,
}: {
  focusTrack: TrackReferenceOrPlaceholder;
  tracks: TrackReferenceOrPlaceholder[];
  onSelect?: SelectHandler;
  onSelectFocus?: SelectHandler;
}) => {
  const carousel = tracks.filter((ref) => !isTrackReferenceEqual(ref, focusTrack));

  return (
    <div className={styles.focus}>
      <div className={styles.focusMain}>
        <ParticipantTile trackRef={focusTrack} onSelect={onSelectFocus} />
      </div>
      {carousel.length > 0 && (
        <div className={styles.focusCarousel}>
          {carousel.map((ref) => (
            <div key={refKey(ref)} className={styles.carouselItem}>
              <ParticipantTile trackRef={ref} onSelect={onSelect} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
