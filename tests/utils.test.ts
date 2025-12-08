import { describe, expect, it } from 'vitest';
import {
  formatMatomoDateTime,
  getContentLength,
  isUserAgentAllowed
} from '../src/utils.js';

describe('utils', () => {
  it('handles user agent allowlist correctly', () => {
    const regex = /Allowed/;
    expect(isUserAgentAllowed('AllowedUA', regex)).toBe(true);
    expect(isUserAgentAllowed('OtherUA', regex)).toBe(false);
    expect(isUserAgentAllowed(undefined, regex)).toBe(false);
    expect(isUserAgentAllowed('AnyUA')).toBe(true);
  });

  it('formats date with zero padding', () => {
    const dt = new Date(Date.UTC(2025, 0, 2, 3, 4, 5));
    expect(formatMatomoDateTime(dt)).toBe('2025-01-02 03:04:05');
  });

  it('parses content length safely', () => {
    const response = new Response('ok', {
      headers: { 'content-length': '123' }
    });
    expect(getContentLength(response)).toBe(123);
    const none = new Response('ok');
    expect(getContentLength(none)).toBeUndefined();
    const invalid = new Response('ok', {
      headers: { 'content-length': 'abc' }
    });
    expect(getContentLength(invalid)).toBeUndefined();
  });
});
