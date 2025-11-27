import type { MatomoConfig, MatomoPayload } from './types.js';
import {
  formatMatomoDateTime,
  getContentLength,
  isUserAgentAllowed,
  toSeconds
} from './utils.js';

export function buildMatomoPayload(
  request: Request,
  response: Response,
  durationMs: number,
  config: MatomoConfig,
  timestamp: Date = new Date()
): MatomoPayload | null {
  if (!config || !config.matomoSiteId) {
    throw new Error('matomoSiteId is required in config');
  }

  const url = request.url;
  const ua = request.headers.get('user-agent') || '';
  if (!isUserAgentAllowed(ua, config.userAgentAllowlistRegex)) {
    return null;
  }

  const payload: MatomoPayload = {
    idsite: config.matomoSiteId,
    rec: 1,
    recMode: 1,
    url,
    source: 'Cloudflare',
    cdt: formatMatomoDateTime(timestamp),
    ua
  };

  if (response.status) {
    payload.http_status = response.status;
  }

  const bytes = getContentLength(response);
  if (bytes !== undefined) {
    payload.bw_bytes = bytes;
  }

  if (durationMs >= 0) {
    payload.pf_srv = toSeconds(durationMs);
  }

  if (config.documentRegex && config.documentRegex.test(url)) {
    payload.download = url;
  }

  return payload;
}
