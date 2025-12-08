/* global RequestInfo, RequestInit */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildMatomoRequestPayload, sendMatomoHit } from '../src/http.js';
import { createConsoleSpies, restoreConsoleSpies } from './helpers/console.js';

const basePayload = {
  idsite: 1,
  rec: 1 as const,
  recMode: 1 as const,
  url: 'https://example.com/path?foo=bar',
  source: 'Cloudflare' as const,
  cdt: '2024-01-01 00:00:00',
  ua: 'AgentX'
};

describe('buildMatomoRequestPayload', () => {
  it('builds query string payload', () => {
    const qs = buildMatomoRequestPayload(basePayload);

    expect(qs).toContain('idsite=1');
    expect(qs).toContain('rec=1');
    expect(qs).toContain('recMode=1');
    expect(qs).toContain('source=Cloudflare');
    expect(qs).toContain('url=https%3A%2F%2Fexample.com%2Fpath%3Ffoo%3Dbar');
    expect(qs).toContain('ua=AgentX');
    expect(qs.startsWith('?')).toBe(true);
  });
});

describe('sendMatomoHit', () => {
  let spies: ReturnType<typeof createConsoleSpies>;

  beforeEach(() => {
    spies = createConsoleSpies();
  });

  afterEach(() => {
    restoreConsoleSpies(spies);
    vi.restoreAllMocks();
  });

  it('posts a single hit with auth and logs debug on success', async () => {
    const fetchMock = vi
      .fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(
        new Response('success', {
          status: 200
        })
      );

    await sendMatomoHit(
      'https://analytics.example.com',
      basePayload,
      1000,
      'debug',
      'token123',
      fetchMock
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0] as [
      string,
      RequestInit & { signal: AbortSignal }
    ];
    expect(url).toBe('https://analytics.example.com/matomo.php');
    expect(options.method).toBe('POST');
    expect(options.headers).toMatchObject({
      'Content-Type': 'application/json',
      Authorization: 'Bearer token123'
    });
    expect(options.body).toContain('"requests"');
  });

  it('logs debug when response body is empty', async () => {
    const fetchMock = vi
      .fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(new Response(null, { status: 204 }));

    await sendMatomoHit(
      'https://analytics.example.com',
      basePayload,
      1000,
      'debug',
      undefined,
      fetchMock
    );

    expect(spies.debug).toHaveBeenCalled();
  });

  it('throws on non-ok response', async () => {
    const fetchMock = vi
      .fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(
        new Response('bad', {
          status: 500
        })
      );

    await expect(
      sendMatomoHit(
        'https://analytics.example.com',
        basePayload,
        1000,
        'info',
        undefined,
        fetchMock
      )
    ).rejects.toThrow(/Matomo responded with status 500/);
  });

  it('aborts when timeout elapses', async () => {
    const fetchMock = vi
      .fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
      .mockImplementation(async () => {
        throw new Error('aborted');
      });

    await expect(
      sendMatomoHit(
        'https://analytics.example.com',
        basePayload,
        10,
        'info',
        undefined,
        fetchMock
      )
    ).rejects.toThrow(/aborted/);
    expect(spies.error).toHaveBeenCalledWith(
      'Matomo send failed',
      expect.objectContaining({ error: 'aborted' })
    );
  });
});
