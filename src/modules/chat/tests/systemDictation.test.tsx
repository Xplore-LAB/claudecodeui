import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { useSystemDictation } from '@/modules/chat/hooks/useSystemDictation';

vi.mock('react-i18next', () => {
  const t = (key: string) => key;
  return { useTranslation: () => ({ t, i18n: { resolvedLanguage: 'zh-CN' } }) };
});

class FakeRecognition {
  static latest: FakeRecognition;
  lang = '';
  continuous = false;
  interimResults = false;
  onresult?: (event: { results: { isFinal: boolean; 0: { transcript: string } }[] }) => void;
  onerror?: (event: { error: string }) => void;
  onend?: () => void;
  start = vi.fn();
  stop = vi.fn();
  abort = vi.fn();
  constructor() { FakeRecognition.latest = this; }
}

beforeEach(() => {
  vi.stubGlobal('isSecureContext', true);
  vi.stubGlobal('SpeechRecognition', FakeRecognition);
  vi.stubGlobal('webkitSpeechRecognition', undefined);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const setup = () => {
  const onTranscript = vi.fn();
  const onError = vi.fn();
  return { ...renderHook(() => useSystemDictation(onTranscript, onError)), onTranscript, onError };
};

test('previews interim speech and commits final words once, as an editable draft', () => {
  const { result, onTranscript, unmount } = setup();
  act(() => result.current.toggle());
  const recognition = FakeRecognition.latest;
  expect(result.current.state).toBe('recording');
  expect(recognition.lang).toBe('zh-CN');
  act(() => recognition.onresult?.({ results: [{ isFinal: false, 0: { transcript: '测试' } }] }));
  expect(result.current.preview).toBe('测试');
  expect(onTranscript).not.toHaveBeenCalled();
  act(() => recognition.onresult?.({ results: [{ isFinal: true, 0: { transcript: '测试项目' } }] }));
  act(() => recognition.onend?.());
  act(() => recognition.onend?.());
  expect(onTranscript).toHaveBeenCalledExactlyOnceWith('测试项目', false);
  expect(result.current.state).toBe('idle');
  unmount();
});

test('stops once despite duplicate clicks and retains explicit send intent', () => {
  const { result, onTranscript, unmount } = setup();
  act(() => result.current.toggle());
  const recognition = FakeRecognition.latest;
  act(() => { result.current.stop({ send: true }); result.current.stop(); });
  expect(recognition.stop).toHaveBeenCalledTimes(1);
  act(() => recognition.onresult?.({ results: [{ isFinal: true, 0: { transcript: '发送' } }] }));
  act(() => recognition.onend?.());
  expect(onTranscript).toHaveBeenCalledExactlyOnceWith('发送', true);
  unmount();
});

test.each([['not-allowed', 'voice.permissionDenied'], ['network', 'voice.networkError']])('recovers from %s without sending or waiting for onend', (error, key) => {
  const { result, onError, onTranscript, unmount } = setup();
  act(() => result.current.toggle());
  act(() => FakeRecognition.latest.onerror?.({ error }));
  expect(result.current.state).toBe('idle');
  expect(onError).toHaveBeenCalledExactlyOnceWith(key);
  expect(onTranscript).not.toHaveBeenCalled();
  expect(FakeRecognition.latest.abort).toHaveBeenCalledTimes(1);
  act(() => result.current.toggle());
  expect(result.current.state).toBe('recording');
  unmount();
});

test('releases the microphone on unmount and ignores late speech', () => {
  const { result, onTranscript, unmount } = setup();
  act(() => result.current.toggle());
  const recognition = FakeRecognition.latest;
  const finish = recognition.onend;
  unmount();
  expect(recognition.abort).toHaveBeenCalledTimes(1);
  act(() => finish?.());
  expect(onTranscript).not.toHaveBeenCalled();
});

test('explains unavailable speech recognition in an insecure browser', () => {
  vi.stubGlobal('isSecureContext', false);
  const { result, onError, unmount } = setup();
  act(() => result.current.toggle());
  expect(result.current.available).toBe(false);
  expect(onError).toHaveBeenCalledWith('voice.unsupported');
  unmount();
});

test('Android results must match the active request and never auto-send', () => {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Android CloudCLIAndroid/0.2');
  const prompt = vi.spyOn(window, 'prompt').mockReturnValue('started');
  const { result, onTranscript, unmount } = setup();
  act(() => result.current.toggle());
  expect(prompt.mock.calls[0][0]).toBe('cloudcli:dictate');
  const { id, language } = JSON.parse(prompt.mock.calls[0][1]!);
  expect(language).toBe('zh-CN');
  act(() => window.dispatchEvent(new CustomEvent('cloudcli:dictation', { detail: { id: 'stale', text: '错误结果' } })));
  expect(onTranscript).not.toHaveBeenCalled();
  act(() => window.dispatchEvent(new CustomEvent('cloudcli:dictation', { detail: { id, text: ' 安卓语音 ' } })));
  expect(onTranscript).toHaveBeenCalledExactlyOnceWith('安卓语音', false);
  expect(result.current.state).toBe('idle');
  unmount();
});

test('cancelling Android dictation leaves the draft untouched', () => {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Android CloudCLIAndroid/0.2');
  const prompt = vi.spyOn(window, 'prompt').mockReturnValue('started');
  const { result, onTranscript, onError, unmount } = setup();
  act(() => result.current.toggle());
  const { id } = JSON.parse(prompt.mock.calls[0][1]!);
  act(() => window.dispatchEvent(new CustomEvent('cloudcli:dictation', { detail: { id, text: '' } })));
  expect(result.current.state).toBe('idle');
  expect(onTranscript).not.toHaveBeenCalled();
  expect(onError).not.toHaveBeenCalled();
  unmount();
});

test('changing the draft owner aborts speech and ignores its pending result', () => {
  const first = vi.fn();
  const second = vi.fn();
  const { result, rerender, unmount } = renderHook(({ callback }) => useSystemDictation(callback), { initialProps: { callback: first } });
  act(() => result.current.toggle());
  const recognition = FakeRecognition.latest;
  const finish = recognition.onend;
  rerender({ callback: second });
  expect(recognition.abort).toHaveBeenCalledTimes(1);
  expect(result.current.state).toBe('idle');
  act(() => finish?.());
  expect(first).not.toHaveBeenCalled();
  expect(second).not.toHaveBeenCalled();
  unmount();
});
