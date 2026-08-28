'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { IconX, IconZoomIn, IconZoomOut, IconZoomReset } from '@tabler/icons-react';
import styles from '../../../styles/conference.module.css';

const ANIM_MS = 200;
const MIN_SCALE = 1;
const MAX_SCALE = 8;
const DOUBLE_TAP_SCALE = 2.5;

interface View {
  scale: number;
  tx: number;
  ty: number;
}

const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

export const Lightbox = ({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) => {
  const [visible, setVisible] = React.useState(false);
  const [view, setView] = React.useState<View>({ scale: 1, tx: 0, ty: 0 });
  const [dragging, setDragging] = React.useState(false);

  const stageRef = React.useRef<HTMLDivElement>(null);
  const viewRef = React.useRef(view);
  viewRef.current = view;

  const pointers = React.useRef<Map<number, { x: number; y: number }>>(new Map());
  const panRef = React.useRef<{ startX: number; startY: number; startTx: number; startTy: number } | null>(null);
  const pinchRef = React.useRef<{
    startDist: number;
    startScale: number;
    startTx: number;
    startTy: number;
    rx: number;
    ry: number;
    startMidX: number;
    startMidY: number;
  } | null>(null);
  const movedRef = React.useRef(false);

  const close = React.useCallback(() => {
    setVisible(false);
    window.setTimeout(onClose, ANIM_MS);
  }, [onClose]);

  const stageCenter = () => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return { cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2 };
  };

  const zoomAt = React.useCallback(
    (clientX: number, clientY: number, factor: number, absolute?: number) => {
      const center = stageCenter();
      if (!center) return;
      setView((v) => {
        const s = clampScale(absolute ?? v.scale * factor);
        if (s === v.scale) return v;
        const rx = clientX - center.cx;
        const ry = clientY - center.cy;
        const ratio = s / v.scale;
        let tx = rx - ratio * (rx - v.tx);
        let ty = ry - ratio * (ry - v.ty);
        if (s <= 1) {
          tx = 0;
          ty = 0;
        }
        return { scale: s, tx, ty };
      });
    },
    [],
  );

  const zoomFromButton = (factor: number) => {
    const center = stageCenter();
    if (center) zoomAt(center.cx, center.cy, factor);
  };
  const reset = () => setView({ scale: 1, tx: 0, ty: 0 });

  React.useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      zoomAt(event.clientX, event.clientY, event.deltaY < 0 ? 1.18 : 1 / 1.18);
    };
    stage.addEventListener('wheel', onWheel, { passive: false });
    return () => stage.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  React.useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
    };
  }, [close]);

  React.useEffect(() => {
    setView({ scale: 1, tx: 0, ty: 0 });
  }, [src]);

  const startPinch = () => {
    const pts = [...pointers.current.values()];
    if (pts.length < 2) return;
    const center = stageCenter();
    if (!center) return;
    const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    const midX = (pts[0].x + pts[1].x) / 2;
    const midY = (pts[0].y + pts[1].y) / 2;
    pinchRef.current = {
      startDist: dist || 1,
      startScale: viewRef.current.scale,
      startTx: viewRef.current.tx,
      startTy: viewRef.current.ty,
      rx: midX - center.cx,
      ry: midY - center.cy,
      startMidX: midX,
      startMidY: midY,
    };
    panRef.current = null;
  };

  const onPointerDown = (event: React.PointerEvent) => {
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    movedRef.current = false;
    setDragging(true);
    if (pointers.current.size >= 2) {
      startPinch();
    } else if (viewRef.current.scale > 1) {
      panRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        startTx: viewRef.current.tx,
        startTy: viewRef.current.ty,
      };
    }
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pinchRef.current && pointers.current.size >= 2) {
      const pts = [...pointers.current.values()].slice(0, 2);
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const midX = (pts[0].x + pts[1].x) / 2;
      const midY = (pts[0].y + pts[1].y) / 2;
      const p = pinchRef.current;
      const s = clampScale(p.startScale * (dist / p.startDist));
      const sRatio = s / p.startScale;
      let tx = p.rx - sRatio * (p.rx - p.startTx) + (midX - p.startMidX);
      let ty = p.ry - sRatio * (p.ry - p.startTy) + (midY - p.startMidY);
      if (s <= 1) {
        tx = 0;
        ty = 0;
      }
      movedRef.current = true;
      setView({ scale: s, tx, ty });
      return;
    }

    const pan = panRef.current;
    if (pan) {
      const dx = event.clientX - pan.startX;
      const dy = event.clientY - pan.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) movedRef.current = true;
      setView((v) => ({ scale: v.scale, tx: pan.startTx + dx, ty: pan.startTy + dy }));
    }
  };

  const onPointerUp = (event: React.PointerEvent) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinchRef.current = null;
    if (pointers.current.size === 1 && viewRef.current.scale > 1) {
      const remaining = [...pointers.current.values()][0];
      panRef.current = {
        startX: remaining.x,
        startY: remaining.y,
        startTx: viewRef.current.tx,
        startTy: viewRef.current.ty,
      };
    }
    if (pointers.current.size === 0) {
      panRef.current = null;
      setDragging(false);
      if (viewRef.current.scale <= 1 && (viewRef.current.tx !== 0 || viewRef.current.ty !== 0)) {
        setView({ scale: 1, tx: 0, ty: 0 });
      }
    }
  };

  if (typeof document === 'undefined') return null;

  const imgTransform = `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})`;

  return createPortal(
    <div
      className={styles.lightbox}
      data-visible={visible ? 'true' : 'false'}
      onClick={() => {
        if (!movedRef.current) close();
      }}
    >
      <button type="button" className={styles.lightboxClose} onClick={close} aria-label="Close">
        <IconX size={22} />
      </button>

      <div className={styles.lightboxToolbar} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={styles.lightboxZoomBtn} onClick={() => zoomFromButton(1 / 1.4)} aria-label="Zoom out">
          <IconZoomOut size={20} />
        </button>
        <button type="button" className={styles.lightboxZoomBtn} onClick={reset} aria-label="Reset zoom">
          <IconZoomReset size={20} />
        </button>
        <button type="button" className={styles.lightboxZoomBtn} onClick={() => zoomFromButton(1.4)} aria-label="Zoom in">
          <IconZoomIn size={20} />
        </button>
      </div>

      <div
        ref={stageRef}
        className={styles.lightboxStage}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={(event) =>
          zoomAt(event.clientX, event.clientY, 1, viewRef.current.scale > 1 ? 1 : DOUBLE_TAP_SCALE)
        }
      >
        <img
          className={styles.lightboxImg}
          src={src}
          alt={alt}
          draggable={false}
          onClick={(event) => event.stopPropagation()}
          style={{
            transform: imgTransform,
            transition: dragging ? 'none' : 'transform 0.12s ease-out',
            cursor: view.scale > 1 ? (dragging ? 'grabbing' : 'grab') : 'default',
          }}
        />
      </div>
    </div>,
    document.body,
  );
};
