import { useEffect, useState } from 'react';
import { Check, Copy, Terminal } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { copyTextToClipboard } from '@/shared/utils';

type SharedTerminalStatusProps = {
  connected: boolean;
  connecting: boolean;
  attachCommand: string | null;
};

/** Used by Shell to explain shared-session ownership and offer local terminal access. */
export default function SharedTerminalStatus({ connected, connecting, attachCommand }: SharedTerminalStatusProps) {
  const { t } = useTranslation('chat');
  // Announce clipboard success or failure without changing the terminal's input focus.
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');

  useEffect(() => {
    if (copyStatus === 'idle') return;
    const timer = window.setTimeout(() => setCopyStatus('idle'), 2500);
    return () => window.clearTimeout(timer);
  }, [copyStatus]);

  return (
    <div className="shrink-0 border-b border-border bg-muted/30 px-3 py-2 text-xs">
      <div className="flex items-center gap-2" role="status">
        <Terminal className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <span className="font-medium">{t('shell.shared.title')}</span>
        <span className="ml-auto flex items-center gap-1.5 text-muted-foreground">
          <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-500' : connecting ? 'animate-pulse bg-amber-500' : 'bg-slate-400'}`} />
          {t(connected ? 'shell.shared.connected' : connecting ? 'shell.shared.connecting' : 'shell.shared.disconnected')}
        </span>
      </div>
      <p className="mt-1 leading-5 text-muted-foreground">{t('shell.shared.description')}</p>
      {attachCommand && (
        <details className="mt-1">
          <summary className="cursor-pointer text-muted-foreground">{t('shell.shared.localAttach')}</summary>
          <div className="mt-2 flex items-start gap-2 rounded-lg border border-border bg-background p-2">
            <code className="min-w-0 flex-1 select-all break-all font-mono leading-5">{attachCommand}</code>
            <button type="button" onClick={async () => setCopyStatus(await copyTextToClipboard(attachCommand) ? 'copied' : 'failed')}
              className="flex min-h-9 shrink-0 items-center gap-1 rounded-md px-2 hover:bg-muted"
              aria-label={t('shell.shared.copy')}>
              {copyStatus === 'copied' ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
              {t(copyStatus === 'copied' ? 'shell.shared.copied' : 'shell.shared.copy')}
            </button>
          </div>
          {copyStatus === 'failed' && <p role="alert" className="mt-1 text-destructive">{t('shell.shared.copyFailed')}</p>}
        </details>
      )}
    </div>
  );
}
