import { transferableAbortController } from 'node:util';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { installDeploymentTransport } from '@/shared/api';

describe('reverse-proxy deployment transports', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let socketMock: ReturnType<typeof vi.fn>;
  let eventsMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Node's Request must receive Node signals rather than jsdom's DOM signals.
    const controller = transferableAbortController();
    vi.stubGlobal('AbortController', controller.constructor);
    vi.stubGlobal('AbortSignal', controller.signal.constructor);
    fetchMock = vi.fn().mockResolvedValue(new Response('{}'));
    socketMock = vi.fn(function () {});
    eventsMock = vi.fn(function () {});
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('WebSocket', socketMock);
    vi.stubGlobal('EventSource', eventsMock);
    vi.spyOn(XMLHttpRequest.prototype, 'open').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('mounts login, streaming, sockets and uploads without altering external destinations', async () => {
    const openMock = XMLHttpRequest.prototype.open;
    installDeploymentTransport('/cloudcli/');
    await fetch('/api/auth/login', { method: 'POST', body: 'credentials' });
    expect(fetchMock).toHaveBeenLastCalledWith(`${location.origin}/cloudcli/api/auth/login`, {
      method: 'POST', body: 'credentials',
    });
    await fetch('/cloudcli/health');
    expect(fetchMock.mock.calls.at(-1)?.[0]).toBe(`${location.origin}/cloudcli/health`);
    await fetch('https://api.example.com/v1/models');
    expect(fetchMock.mock.calls.at(-1)?.[0]).toBe('https://api.example.com/v1/models');

    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    new WebSocket(`${protocol}//${location.host}/ws?token=test`);
    expect(socketMock).toHaveBeenCalledWith(`${protocol}//${location.host}/cloudcli/ws?token=test`);
    new EventSource('/api/projects/progress?id=123');
    expect(eventsMock).toHaveBeenCalledWith(`${location.origin}/cloudcli/api/projects/progress?id=123`);
    new XMLHttpRequest().open('POST', '/api/upload', true);
    expect(openMock).toHaveBeenCalledWith('POST', `${location.origin}/cloudcli/api/upload`, true);
  });

  it('preserves Request bodies and authentication headers', async () => {
    installDeploymentTransport('/cloudcli/');
    await fetch(new Request(`${location.origin}/api/save`, {
      method: 'POST', body: 'payload', headers: { Authorization: 'Bearer example' },
    }));
    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.url).toBe(`${location.origin}/cloudcli/api/save`);
    expect(request.headers.get('Authorization')).toBe('Bearer example');
    expect(await request.text()).toBe('payload');
  });

  it('leaves root deployments unchanged', () => {
    installDeploymentTransport('/');
    expect(window.fetch).toBe(fetchMock);
    expect(window.WebSocket).toBe(socketMock);
  });
});
