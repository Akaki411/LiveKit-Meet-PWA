'use client';

import * as React from 'react';
import styles from '../../../styles/conference.module.css';

const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  {
    label: 'Smileys',
    emojis: ['😀', '😁', '😂', '🤣', '😊', '😍', '😘', '😜', '🤔', '😎', '😢', '😭', '😡', '🥳', '😴', '🙄', '😇', '🤗', '🤩', '😅'],
  },
  {
    label: 'Gestures',
    emojis: ['👍', '👎', '👏', '🙏', '🤝', '👌', '✌️', '🤞', '💪', '👋', '🤙', '🖐️'],
  },
  {
    label: 'Hearts',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '💕'],
  },
  {
    label: 'Animals',
    emojis: ['🐶', '🐱', '🐭', '🐹', '🦊', '🐻', '🐼', '🐨', '🐸', '🦁', '🐷', '🐵'],
  },
  {
    label: 'Food',
    emojis: ['🍎', '🍕', '🍔', '🍟', '🌭', '🍩', '🍪', '🍫', '🍿', '☕', '🍺', '🍷'],
  },
  {
    label: 'Activities',
    emojis: ['⚽', '🏀', '🎮', '🎉', '🎂', '🎁', '🔥', '✨', '💯', '⭐', '📷', '🎵', '💡', '⏰'],
  },
];

const ALL_EMOJIS = EMOJI_GROUPS.flatMap((group) => group.emojis);

export const EmojiPicker = ({ onPick }: { onPick: (emoji: string) => void }) => {
  return (
    <div className={styles.emojiPanel}>
      <div className={styles.emojiGrid}>
        {ALL_EMOJIS.map((emoji, index) => (
          <button
            key={`${emoji}-${index}`}
            type="button"
            className={styles.emojiBtn}
            onClick={() => onPick(emoji)}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};
