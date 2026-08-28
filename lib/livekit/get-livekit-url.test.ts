import { describe, it, expect } from 'vitest';
import { getLiveKitUrl } from './get-live-kit-url';

describe('getLiveKitURL', () => {
  it('returns the original URL if no region is provided', () => {
    const url = 'https://myproject.livekit.cloud';
    expect(getLiveKitUrl(url, null)).toBe(url + '/');
  });

  it('inserts the region into livekit.cloud URLs', () => {
    const url = 'https://myproject.livekit.cloud';
    const region = 'eu';
    expect(getLiveKitUrl(url, region)).toBe('https://myproject.eu.production.livekit.cloud/');
  });

  it('inserts the region into livekit.cloud URLs and preserves the staging environment', () => {
    const url = 'https://myproject.staging.livekit.cloud';
    const region = 'eu';
    expect(getLiveKitUrl(url, region)).toBe('https://myproject.eu.staging.livekit.cloud/');
  });

  it('returns the original URL for non-livekit.cloud hosts, even with region', () => {
    const url = 'https://example.com';
    const region = 'us';
    expect(getLiveKitUrl(url, region)).toBe(url + '/');
  });

  it('handles URLs with paths and query params', () => {
    const url = 'https://myproject.livekit.cloud/room?foo=bar';
    const region = 'ap';
    expect(getLiveKitUrl(url, region)).toBe(
      'https://myproject.ap.production.livekit.cloud/room?foo=bar',
    );
  });
});
