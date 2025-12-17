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

  it.each([
    [
      'root url',
      'https://analytics.example.com',
      'https://analytics.example.com/matomo.php?idsite=1&rec=1&recMode=1&url=https%3A%2F%2Fexample.com%2Fpath%3Ffoo%3Dbar&source=Cloudflare&cdt=2024-01-01+00%3A00%3A00&ua=AgentX'
    ],
    [
      'subdirectory url',
      'https://analytics.example.com/matomo',
      'https://analytics.example.com/matomo/matomo.php?idsite=1&rec=1&recMode=1&url=https%3A%2F%2Fexample.com%2Fpath%3Ffoo%3Dbar&source=Cloudflare&cdt=2024-01-01+00%3A00%3A00&ua=AgentX'
    ],
    [
      'subdirectory url with slash',
      'https://analytics.example.com/matomo/',
      'https://analytics.example.com/matomo/matomo.php?idsite=1&rec=1&recMode=1&url=https%3A%2F%2Fexample.com%2Fpath%3Ffoo%3Dbar&source=Cloudflare&cdt=2024-01-01+00%3A00%3A00&ua=AgentX'
    ],
    [
      'matomo.php url',
      'https://analytics.example.com/matomo.php',
      'https://analytics.example.com/matomo.php?idsite=1&rec=1&recMode=1&url=https%3A%2F%2Fexample.com%2Fpath%3Ffoo%3Dbar&source=Cloudflare&cdt=2024-01-01+00%3A00%3A00&ua=AgentX'
    ]
  ])(
    'sends a single hit via tracking API (%s)',
    async (_, baseUrl, expected) => {
      const fetchMock = vi
        .fn<
          (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
        >()
        .mockResolvedValue(new Response(null, { status: 204 }));

      await sendMatomoHit(baseUrl, basePayload, 1000, 'debug', fetchMock);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, options] = fetchMock.mock.calls[0] as [
        string,
        RequestInit & { signal: AbortSignal }
      ];
      expect(url).toBe(expected);
      expect(options.method).toBe('GET');
      expect(spies.debug).toHaveBeenCalledWith('Matomo response', {
        status: 204
      });
    }
  );

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
        fetchMock
      )
    ).rejects.toThrow(/aborted/);
    expect(spies.error).toHaveBeenCalledWith(
      'Matomo send failed',
      expect.objectContaining({ error: 'aborted' })
    );
  });
});
