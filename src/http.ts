/* global RequestInfo, RequestInit */
import { createLogger } from './logger.js';
import type { LogLevel, MatomoPayload } from './types.js';

export function buildMatomoRequestPayload(
  payload: Record<string, string | number | boolean | null | undefined>
): string {
  const search = new URLSearchParams();
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.append(key, String(value));
    }
  });
  return `?${search.toString()}`;
}

export async function sendMatomoHit(
  matomoUrl: string,
  payload: MatomoPayload,
  timeoutMs = 5000,
  logLevel: LogLevel = 'info',
  tokenAuth?: string,
  fetchImpl: (
    input: RequestInfo | URL,
    init?: RequestInit
  ) => Promise<Response> = fetch
): Promise<void> {
  const url = new URL('/matomo.php', matomoUrl);
  const body = JSON.stringify({
    requests: [buildMatomoRequestPayload(payload)]
  });
  const log = createLogger(logLevel);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetchImpl(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(tokenAuth ? { Authorization: `Bearer ${tokenAuth}` } : {})
      },
      body,
      signal: controller.signal
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(
        `Matomo responded with status ${res.status}: ${text?.slice(0, 200) || 'unknown'}`
      );
    }
    if (text) {
      log.debug('Matomo response', {
        status: res.status,
        body: text.slice(0, 200)
      });
    } else {
      log.debug('Matomo response', { status: res.status, body: 'empty' });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error('Matomo send failed', { error: message });
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
