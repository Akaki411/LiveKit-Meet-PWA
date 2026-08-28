'use client';

const EVENT_NAME = 'lk-background-animation';

export const setBackgroundAnimationActive = (active: boolean) => {
  window.dispatchEvent(new CustomEvent<boolean>(EVENT_NAME, { detail: active }));
};

export const onBackgroundAnimationChange = (handler: (active: boolean) => void): (() => void) => {
  const listener = (event: Event) => handler((event as CustomEvent<boolean>).detail);
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
};
