import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { VoiceInputState } from '@/shared/types';

type RecognitionResult = { isFinal: boolean; 0: { transcript: string } };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<RecognitionResult> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};

/** Used by useVoiceInput for Android system dictation and browser speech recognition. */
export function useSystemDictation(
  onTranscript: (text: string, send?: boolean) => void,
  onError?: (message: string) => void,
) {
  const { t, i18n } = useTranslation('chat');
  // Drives recording feedback while the browser or Android recognizer owns the microphone.
  const [state, setState] = useState<VoiceInputState>('idle');
  // Interim words are a preview only; the draft changes once a final result arrives.
  const [preview, setPreview] = useState('');
  const recognitionRef = useRef<Recognition | null>(null);
  const requestRef = useRef<string | null>(null);
  const sendRef = useRef(false);
  const stoppingRef = useRef(false);
  const callbacksRef = useRef({ onTranscript, onError });
  const native = /CloudCLIAndroid\/[0-9]/.test(navigator.userAgent);
  const speechWindow = window as SpeechWindow;
  const RecognitionApi = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
  const available = native || (window.isSecureContext && Boolean(RecognitionApi));

  useEffect(() => { callbacksRef.current = { onTranscript, onError }; }, [onTranscript, onError]);

  useEffect(() => {
    const receive = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string; text?: string; error?: string }>).detail;
      if (!detail || detail.id !== requestRef.current) return;
      requestRef.current = null;
      setState('idle');
      setPreview('');
      if (detail.error) callbacksRef.current.onError?.(t('voice.systemUnavailable', { defaultValue: 'System speech recognition is unavailable. Try your keyboard microphone.' }));
      else if (detail.text?.trim()) callbacksRef.current.onTranscript(detail.text.trim(), false);
    };
    window.addEventListener('cloudcli:dictation', receive);
    return () => {
      window.removeEventListener('cloudcli:dictation', receive);
      if (requestRef.current) {
        setState('idle');
        setPreview('');
      }
      requestRef.current = null;
      const recognition = recognitionRef.current;
      recognitionRef.current = null;
      if (recognition) {
        recognition.onend = null;
        recognition.onerror = null;
        recognition.onresult = null;
        recognition.abort();
      }
    };
  }, [onTranscript, t]);

  const start = useCallback(() => {
    if (requestRef.current) return;
    if (!available) {
      callbacksRef.current.onError?.(t('voice.unsupported', { defaultValue: 'Use HTTPS in a speech-enabled browser, or the Android app. You can also use your keyboard microphone.' }));
      return;
    }
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    requestRef.current = id;
    sendRef.current = false;
    stoppingRef.current = false;
    setPreview('');
    if (native) {
      const response = window.prompt('cloudcli:dictate', JSON.stringify({ id, language: i18n.resolvedLanguage || 'zh-CN' }));
      if (response === 'started') setState('recording');
      else {
        requestRef.current = null;
        callbacksRef.current.onError?.(t('voice.systemUnavailable', { defaultValue: 'System speech recognition is unavailable. Try your keyboard microphone.' }));
      }
      return;
    }
    if (!RecognitionApi) return;
    const recognition = new RecognitionApi();
    recognitionRef.current = recognition;
    recognition.lang = i18n.resolvedLanguage || 'zh-CN';
    recognition.continuous = false;
    recognition.interimResults = true;
    let transcript = '';
    let failed = false;
    recognition.onresult = (event) => {
      if (requestRef.current !== id) return;
      const results = Array.from(event.results);
      transcript = results.filter(result => result.isFinal).map(result => result[0].transcript).join('');
      setPreview(results.map(result => result[0].transcript).join(''));
    };
    recognition.onerror = (event) => {
      if (requestRef.current !== id) return;
      failed = true;
      const key = event.error === 'not-allowed' || event.error === 'service-not-allowed'
        ? 'voice.permissionDenied' : event.error === 'network' ? 'voice.networkError' : 'voice.noSpeech';
      callbacksRef.current.onError?.(t(key, { defaultValue: 'Speech recognition failed. Check microphone permissions and try again.' }));
      // Some engines omit onend after an error; always release the UI here.
      requestRef.current = null;
      recognitionRef.current = null;
      setState('idle');
      setPreview('');
      recognition.abort();
    };
    recognition.onend = () => {
      if (requestRef.current !== id) return;
      requestRef.current = null;
      recognitionRef.current = null;
      setState('idle');
      setPreview('');
      if (!failed && transcript.trim()) callbacksRef.current.onTranscript(transcript.trim(), sendRef.current);
      else if (!failed) callbacksRef.current.onError?.(t('voice.noSpeech', { defaultValue: 'No speech detected. Please try again.' }));
    };
    try {
      recognition.start();
      setState('recording');
    } catch {
      requestRef.current = null;
      recognitionRef.current = null;
      setState('idle');
      callbacksRef.current.onError?.(t('voice.systemUnavailable', { defaultValue: 'System speech recognition is unavailable. Try your keyboard microphone.' }));
    }
  }, [RecognitionApi, available, native, i18n.resolvedLanguage, t]);

  const stop = useCallback((options?: { send?: boolean }) => {
    if (!recognitionRef.current || stoppingRef.current) return;
    stoppingRef.current = true;
    sendRef.current = options?.send ?? false;
    setState('transcribing');
    recognitionRef.current.stop();
  }, []);

  const toggle = useCallback(() => {
    if (requestRef.current) stop();
    else start();
  }, [start, stop]);

  return { state, preview, available, native, toggle, stop };
}
