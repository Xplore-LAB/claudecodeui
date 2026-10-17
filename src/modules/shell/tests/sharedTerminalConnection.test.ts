import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import type { FitAddon } from '@xterm/addon-fit';
import type { Terminal } from '@xterm/xterm';
import type { MutableRefObject } from 'react';

import { useShellConnection } from '@/modules/shell/hooks/useShellConnection';
import { TERMINAL_INIT_DELAY_MS } from '@/shared/constants';
import type { Project, ProjectSession } from '@/shared/types';

vi.mock('@/modules/shell/utils/socket', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  getShellWebSocketUrl: () => 'ws://localhost/shell',
}));

class Socket {
  static OPEN = 1;
  static current: Socket;
  readyState = 1;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  sent: string[] = [];
  constructor() { Socket.current = this; }
  send(data: string) { this.sent.push(data); }
  close() { this.readyState = 3; }
}
const ref = <T,>(current: T): MutableRefObject<T> => ({ current });

afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

test('shared terminal retains its screen offline and replaces replay once without restarting the session', () => {
  vi.useFakeTimers();
  vi.stubGlobal('WebSocket', Socket);
  const clear = vi.fn();
  const write = vi.fn();
  const socketRef = ref<WebSocket | null>(null);
  const options = {
    wsRef: socketRef,
    terminalRef: ref({ write, cols: 80, rows: 24 } as unknown as Terminal | null),
    fitAddonRef: ref({ fit: vi.fn() } as unknown as FitAddon | null),
    selectedProjectRef: ref<Project | null>({ projectId: 'demo', displayName: 'Demo', fullPath: '/tmp/demo' }),
    selectedSessionRef: ref<ProjectSession | null>({ id: 'shared-session', __provider: 'codex' }),
    initialCommandRef: ref<string | null>(null),
    isPlainShellRef: ref(false), bypassPermissionsRef: ref(false), isDarkModeRef: ref(false),
    onProcessCompleteRef: ref<((code: number) => void) | null>(null),
    isInitialized: true, autoConnect: true, persistent: true,
    closeSocket: () => { socketRef.current?.close(); socketRef.current = null; },
    clearTerminalScreen: clear,
  };
  const view = renderHook(() => useShellConnection(options));
  const open = () => {
    act(() => { vi.advanceTimersByTime(1000); });
    const socket = Socket.current;
    act(() => { socket.onopen?.(); vi.advanceTimersByTime(TERMINAL_INIT_DELAY_MS); });
    expect(JSON.parse(socket.sent[0])).toMatchObject({ sessionId: 'shared-session', persistent: true, forceRestart: false });
    return socket;
  };
  const output = (socket: Socket, data: string) => act(() => socket.onmessage?.({ data: JSON.stringify({ type: 'output', data }) }));
  const first = open();
  output(first, 'first replay');
  expect(clear).toHaveBeenCalledTimes(1);
  act(() => first.onclose?.());
  expect(clear).toHaveBeenCalledTimes(1);
  expect(view.result.current.isConnected).toBe(false);
  const second = open();
  // Late data from the old socket must never overwrite the selected session.
  output(first, 'stale data');
  expect(write).not.toHaveBeenCalledWith('stale data');
  expect(clear).toHaveBeenCalledTimes(1);
  output(second, 'new replay');
  output(second, 'live data');
  expect(clear).toHaveBeenCalledTimes(2);
  expect(write).toHaveBeenLastCalledWith('live data');
  act(() => view.result.current.disconnectFromShell({ suppressAutoConnect: true }));
  expect(clear).toHaveBeenCalledTimes(2);
  act(() => { vi.advanceTimersByTime(5000); });
  expect(Socket.current).toBe(second);
});
