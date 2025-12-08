import { describe, expect, it, vi } from 'vitest';
import { createLogger } from '../src/logger.js';

describe('createLogger', () => {
  it('respects log levels', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const silentLog = createLogger('silent');
    silentLog.debug('a');
    silentLog.info('b');
    silentLog.warn('c');
    silentLog.error('d');
    expect(debugSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();

    const warnLog = createLogger('warn');
    warnLog.debug('x');
    warnLog.info('y');
    warnLog.warn('z');
    warnLog.error('err');
    expect(debugSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();

    const debugLog = createLogger('debug');
    debugLog.debug('dbg');
    debugLog.info('inf');
    debugLog.warn('wrn');
    debugLog.error('err');
    expect(debugSpy).toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();

    debugSpy.mockRestore();
    infoSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
