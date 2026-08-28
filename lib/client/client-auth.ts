export const redirectToLogin = (): void => {
  if (typeof window === 'undefined') return;
  const from = window.location.pathname + window.location.search;
  window.location.href = `/login?from=${encodeURIComponent(from)}`;
};
