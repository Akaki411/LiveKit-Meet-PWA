'use client';

import * as React from 'react';
import { RoomEvent, type RemoteParticipant } from 'livekit-client';
import { useTranslation } from 'react-i18next';
import { IconSend, IconPaperclip, IconLoader2, IconMoodSmile, IconX } from '@tabler/icons-react';
import { useRoomContext } from '@/lib/components/livekit';
import { Lightbox } from './lightbox';
import { EmojiPicker } from './emoji-picker';
import { MessageRow, type Attachment, type ChatMessage, type ReplySnippet } from './message-row';
import styles from '../../../styles/conference.module.css';

const CHAT_TOPIC = 'chat';
const GROUP_WINDOW_MS = 5 * 60 * 1000;
const HIGHLIGHT_MS = 1000;

const buildSnippet = (msg: ChatMessage, photoLabel: string): ReplySnippet => {
  let text = msg.message;
  if (!text && msg.attachment) {
    text = msg.attachment.type.startsWith('image/') ? `📷 ${photoLabel}` : `📎 ${msg.attachment.name}`;
  }
  return { id: msg.id, from: msg.from, text: (text || '').slice(0, 140) };
};

export const Chat = ({
  open,
  onReceive,
}: {
  open: boolean;
  onReceive: () => void;
}) => {
  const room = useRoomContext();
  const { t } = useTranslation();
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [draft, setDraft] = React.useState('');
  const [uploading, setUploading] = React.useState(false);
  const [lightbox, setLightbox] = React.useState<{ src: string; name: string } | null>(null);
  const [replyingTo, setReplyingTo] = React.useState<ChatMessage | null>(null);
  const [emojiOpen, setEmojiOpen] = React.useState(false);
  const [highlightId, setHighlightId] = React.useState<string | null>(null);

  const listRef = React.useRef<HTMLDivElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const emojiRef = React.useRef<HTMLDivElement>(null);
  const rowEls = React.useRef<Map<string, HTMLDivElement>>(new Map());
  const highlightTimer = React.useRef<number | undefined>(undefined);

  React.useEffect(() => {
    const decoder = new TextDecoder();
    const onData = (
      payload: Uint8Array,
      participant?: RemoteParticipant,
      _kind?: unknown,
      topic?: string,
    ) => {
      if (topic !== CHAT_TOPIC) return;
      try {
        const parsed = JSON.parse(decoder.decode(payload)) as {
          message: string;
          timestamp: number;
          attachment?: Attachment;
          replyTo?: ReplySnippet;
        };
        setMessages((prev) => [
          ...prev,
          {
            id: `${participant?.identity ?? 'unknown'}-${parsed.timestamp}`,
            from: participant?.name || participant?.identity || '',
            message: parsed.message,
            timestamp: parsed.timestamp,
            local: false,
            attachment: parsed.attachment,
            replyTo: parsed.replyTo,
          },
        ]);
        onReceive();
      } catch (error) {
        console.error(error);
      }
    };
    room.on(RoomEvent.DataReceived, onData);
    return () => {
      room.off(RoomEvent.DataReceived, onData);
    };
  }, [room, onReceive]);

  React.useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, open]);

  React.useEffect(() => {
    if (!emojiOpen) return;
    const onDown = (event: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(event.target as Node)) setEmojiOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [emojiOpen]);

  React.useEffect(() => () => window.clearTimeout(highlightTimer.current), []);

  const publish = async (message: string, attachment?: Attachment, replyTo?: ReplySnippet) => {
    const timestamp = Date.now();
    const encoder = new TextEncoder();
    await room.localParticipant.publishData(
      encoder.encode(JSON.stringify({ message, timestamp, attachment, replyTo })),
      { reliable: true, topic: CHAT_TOPIC },
    );
    setMessages((prev) => [
      ...prev,
      {
        id: `local-${timestamp}`,
        from: room.localParticipant.name || room.localParticipant.identity || '',
        message,
        timestamp,
        local: true,
        attachment,
        replyTo,
      },
    ]);
  };

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const replyTo = replyingTo ? buildSnippet(replyingTo, t('conference.photo')) : undefined;
    try {
      await publish(text, undefined, replyTo);
      setDraft('');
      setReplyingTo(null);
    } catch (error) {
      console.error(error);
    }
  };

  const onPickFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    const replyTo = replyingTo ? buildSnippet(replyingTo, t('conference.photo')) : undefined;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/room-files', { method: 'POST', body: form });
      if (!res.ok) throw new Error('upload failed');
      const attachment = (await res.json()) as Attachment;
      await publish('', attachment, replyTo);
      setReplyingTo(null);
    } catch (error) {
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const insertEmoji = (emoji: string) => {
    const el = inputRef.current;
    if (!el) {
      setDraft((prev) => prev + emoji);
      return;
    }
    const start = el.selectionStart ?? draft.length;
    const end = el.selectionEnd ?? draft.length;
    const next = draft.slice(0, start) + emoji + draft.slice(end);
    setDraft(next);
    requestAnimationFrame(() => {
      const pos = start + emoji.length;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  };

  const jumpTo = React.useCallback((id: string) => {
    const el = rowEls.current.get(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightId(id);
    window.clearTimeout(highlightTimer.current);
    highlightTimer.current = window.setTimeout(() => setHighlightId(null), HIGHLIGHT_MS);
  }, []);

  return (
    <aside className={styles.chat} data-open={open ? 'true' : 'false'}>
      <div className={styles.chatMessages} ref={listRef}>
        {messages.map((msg, index) => {
          const prev = messages[index - 1];
          const grouped =
            !!prev &&
            prev.local === msg.local &&
            prev.from === msg.from &&
            msg.timestamp - prev.timestamp < GROUP_WINDOW_MS;
          return (
            <MessageRow
              key={msg.id}
              msg={msg}
              grouped={grouped}
              highlighted={highlightId === msg.id}
              rowRef={(el) => {
                if (el) rowEls.current.set(msg.id, el);
                else rowEls.current.delete(msg.id);
              }}
              onOpenImage={(src, name) => setLightbox({ src, name })}
              onReply={(m) => setReplyingTo(m)}
              onJumpTo={jumpTo}
            />
          );
        })}
      </div>

      {replyingTo && (
        <div className={styles.chatReplyPreview}>
          <div className={styles.chatReplyPreviewBody}>
            <span className={styles.chatReplyPreviewFrom}>{replyingTo.from}</span>
            <span className={styles.chatReplyPreviewText}>
              {buildSnippet(replyingTo, t('conference.photo')).text}
            </span>
          </div>
          <div
            className={styles.chatReplyCancel}
            onClick={() => setReplyingTo(null)}
            aria-label={t('conference.cancelReply')}
          >
            <IconX size={16} />
          </div>
        </div>
      )}

      <form className={styles.chatForm} onSubmit={send}>
        <input ref={fileRef} type="file" hidden onChange={onPickFile} />

        <div className={styles.chatInputBar}>
          <div className={styles.chatEmojiWrap} ref={emojiRef}>
            <button
              type="button"
              className={styles.chatBarBtn}
              onClick={() => setEmojiOpen((v) => !v)}
              aria-label={t('conference.emoji')}
              title={t('conference.emoji')}
            >
              <IconMoodSmile size={20} />
            </button>
            {emojiOpen && (
              <EmojiPicker
                onPick={(emoji) => {
                  insertEmoji(emoji);
                }}
              />
            )}
          </div>

          <input
            ref={inputRef}
            className={styles.chatBarInput}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={t('conference.chatPlaceholder')}
          />

          <button
            type="button"
            className={styles.chatBarBtn}
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            aria-label={t('conference.attach')}
            title={t('conference.attach')}
          >
            {uploading ? (
              <IconLoader2 size={18} className={styles.spin} />
            ) : (
              <IconPaperclip size={18} />
            )}
          </button>

          <button type="submit" className={styles.chatBarSend} disabled={!draft.trim()}>
            <IconSend size={17} />
          </button>
        </div>
      </form>

      {lightbox && (
        <Lightbox src={lightbox.src} alt={lightbox.name} onClose={() => setLightbox(null)} />
      )}
    </aside>
  );
};
