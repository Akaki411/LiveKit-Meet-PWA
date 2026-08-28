'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { IconArrowBackUp, IconFile } from '@tabler/icons-react';
import { fetchApiBlobUrl, useApiBlobUrl } from '@/lib/client/api-blob';
import styles from '../../../styles/generated/conference.classes';

export interface ReplySnippet {
  id: string;
  from: string;
  text: string;
}

export interface Attachment {
  id: string;
  url: string;
  name: string;
  type: string;
  size: number;
}

export interface ChatMessage {
  id: string;
  from: string;
  message: string;
  timestamp: number;
  local: boolean;
  attachment?: Attachment;
  replyTo?: ReplySnippet;
}

const SWIPE_TRIGGER_PX = 46;
const SWIPE_MAX_PX = 68;

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const renderMessage = (text: string): React.ReactNode[] => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.split(urlRegex).map((part, index) =>
    urlRegex.test(part) ? (
      <a key={index} href={part} target="_blank" rel="noopener noreferrer">
        {part}
      </a>
    ) : (
      <React.Fragment key={index}>{part}</React.Fragment>
    ),
  );
};

const ChatImage = ({
  src,
  name,
  onOpen,
}: {
  src: string;
  name: string;
  onOpen: (src: string, name: string) => void;
}) => {
  // The API returns base64 JSON (see api-blob.ts for why), so the real <img> src is
  // a Blob object URL decoded on the client, not the API URL itself.
  const objectUrl = useApiBlobUrl(src);
  return (
    <button
      type="button"
      className={styles.chatImageBtn}
      onClick={() => objectUrl && onOpen(objectUrl, name)}
    >
      {objectUrl && <img className={styles.chatImage} src={objectUrl} alt={name} />}
    </button>
  );
};

const AttachmentView = ({
  attachment,
  onOpenImage,
}: {
  attachment: Attachment;
  onOpenImage: (src: string, name: string) => void;
}) => {
  const { t } = useTranslation();
  const extension: string | undefined = attachment.name.split(".").at(-1);
  if (attachment.type.startsWith('image/')) {
    return <ChatImage src={attachment.url} name={attachment.name} onOpen={onOpenImage} />;
  }
  const handleDownload = async (event: React.MouseEvent) => {
    event.preventDefault();
    try {
      const objectUrl = await fetchApiBlobUrl(attachment.url);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = attachment.name;
      a.click();
    } catch (error) {
      console.error(error);
    }
  };
  return (
    <a className={styles.chatFile} href={attachment.url} onClick={handleDownload}>
      <div className={styles.chatFileIcon}>
        <div className={styles.chatFileHide}>
          <IconFile size={32} stroke={1.5} />
        </div>
        <span className={styles.chatFileIconPostfix}>
          {extension && extension.length >= 4 ? 'bin' : extension}
        </span>
      </div>
      <span className={styles.chatFileInfo}>
        <span className={styles.chatFileName}>{attachment.name}</span>
        <span className={styles.chatFileMeta}>
          {formatSize(attachment.size)} · {t('conference.download')}
        </span>
      </span>
    </a>
  );
};

export const MessageRow = ({
  msg,
  grouped,
  highlighted,
  rowRef,
  onOpenImage,
  onReply,
  onJumpTo,
}: {
  msg: ChatMessage;
  grouped: boolean;
  highlighted: boolean;
  rowRef: (el: HTMLDivElement | null) => void;
  onOpenImage: (src: string, name: string) => void;
  onReply: (msg: ChatMessage) => void;
  onJumpTo: (id: string) => void;
}) => {
  const { t } = useTranslation();
  const bubbleRef = React.useRef<HTMLDivElement>(null);
  const [dragX, setDragX] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);
  const dragState = React.useRef<{
    startX: number;
    startY: number;
    axis: 'x' | 'y' | null;
    triggered: boolean;
    pointerId: number;
  } | null>(null);

  const onPointerDown = (event: React.PointerEvent) => {
    if (event.pointerType !== 'touch') return;
    dragState.current = {
      startX: event.clientX,
      startY: event.clientY,
      axis: null,
      triggered: false,
      pointerId: event.pointerId,
    };
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const state = dragState.current;
    if (!state) return;
    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;

    if (state.axis === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      state.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (state.axis === 'x') {
        bubbleRef.current?.setPointerCapture(state.pointerId);
        setDragging(true);
      } else {
        dragState.current = null;
        return;
      }
    }
    if (state.axis !== 'x') return;

    event.preventDefault();
    const clamped = Math.max(-SWIPE_MAX_PX, Math.min(SWIPE_MAX_PX, dx));
    setDragX(clamped);

    if (!state.triggered && Math.abs(clamped) >= SWIPE_TRIGGER_PX) {
      state.triggered = true;
      onReply(msg);
    }
  };

  const endDrag = () => {
    if (!dragState.current) return;
    dragState.current = null;
    setDragging(false);
    setDragX(0);
  };

  const swipeIconStyle: React.CSSProperties = {
    opacity: Math.min(1, Math.abs(dragX) / SWIPE_TRIGGER_PX),
  };
  if (dragX >= 0) swipeIconStyle.left = 4;
  else swipeIconStyle.right = 4;

  const bare = !!msg.attachment && !msg.message && !msg.replyTo;

  return (
    <div
      ref={rowRef}
      className={styles.chatRow}
      data-local={msg.local ? 'true' : 'false'}
      data-grouped={grouped ? 'true' : 'false'}
      data-highlighted={highlighted ? 'true' : 'false'}
    >
      <IconArrowBackUp size={18} className={styles.chatSwipeIcon} style={swipeIconStyle} />
      <div
        className={styles.chatReplyBtn}
        onClick={() => onReply(msg)}
        aria-label={t('conference.reply')}
        title={t('conference.reply')}
      >
        <IconArrowBackUp size={15} />
      </div>
      <div
        ref={bubbleRef}
        className={styles.chatMessage}
        data-bare={bare ? 'true' : 'false'}
        style={{
          transform: dragX ? `translateX(${dragX}px)` : undefined,
          transition: dragging ? 'none' : undefined
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {!msg.local && !grouped && <span className={styles.chatFrom}>{msg.from}</span>}
        {msg.replyTo && (
          <button
            type="button"
            className={styles.chatQuote}
            onClick={() => onJumpTo(msg.replyTo!.id)}
          >
            <span className={styles.chatQuoteFrom}>{msg.replyTo.from}</span>
            <span className={styles.chatQuoteText}>{msg.replyTo.text}</span>
          </button>
        )}
        {msg.attachment && <AttachmentView attachment={msg.attachment} onOpenImage={onOpenImage} />}
        {msg.message && <span className={styles.chatText}>{renderMessage(msg.message)}</span>}
        <span className={styles.chatMeta}>
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
};
