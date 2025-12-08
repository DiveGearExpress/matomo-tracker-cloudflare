import type { Env, WorkerContext } from '../src/types.js';
import worker from '../src/index.js';

const DEFAULT_DEV_ORIGIN = 'http://localhost:3000';

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: WorkerContext
  ): Promise<Response> {
    const originOverride = env.DEV_ORIGIN_OVERRIDE || DEFAULT_DEV_ORIGIN;
    const incomingUrl = new URL(request.url);
    const target = new URL(originOverride);
    target.pathname = incomingUrl.pathname;
    target.search = incomingUrl.search;

    const proxied = new Request(target.toString(), request);
    return worker.fetch(proxied, env as never, ctx);
  }
};
