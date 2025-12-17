import { getConfig } from './config.js';
import { createLogger } from './logger.js';
import { buildMatomoPayload } from './matomo.js';
import { sendMatomoHit } from './http.js';
import type { Env, MatomoConfig, WorkerContext } from './types.js';

const trackRequest = async (
  request: Request,
  response: Response,
  durationMs: number,
  config: MatomoConfig
) => {
  const log = createLogger(config.logLevel);
  try {
    const payload = buildMatomoPayload(
      request,
      response,
      durationMs,
      config,
      new Date(Date.now() - durationMs)
    );
    if (!payload) {
      log.debug('Tracking skipped');
      return;
    }
    await sendMatomoHit(
      config.matomoUrl,
      payload,
      config.matomoTimeoutMs,
      config.logLevel
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.warn('Tracking failed', { error: message });
  }
};

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: WorkerContext
  ): Promise<Response> {
    let config: MatomoConfig | null = null;
    try {
      config = getConfig(env);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Configuration error', { error: message });
      return fetch(request);
    }
    const log = createLogger(config.logLevel);
    const start = Date.now();

    try {
      const response = await fetch(request);
      const durationMs = Date.now() - start;
      ctx.waitUntil(trackRequest(request, response, durationMs, config));
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log.error('Origin request failed', { error: message });
      const fallback = new Response('Bad Gateway', { status: 502 });
      const durationMs = Date.now() - start;
      ctx.waitUntil(trackRequest(request, fallback, durationMs, config));
      return fallback;
    }
  }
};
