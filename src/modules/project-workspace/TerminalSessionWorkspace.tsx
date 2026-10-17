import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { StandaloneShell } from '@/modules/standalone-shell';
import { api } from '@/shared/api';
import { writeSelectedProvider } from '@/shared/selectedProvider';
import type { LLMProvider, Project, ProjectSession, SessionEstablishedContext } from '@/shared/types';

type TerminalSessionWorkspaceProps = {
  project: Project;
  session: ProjectSession | null;
  isActive: boolean;
  onSessionEstablished: (id: string, context: SessionEstablishedContext) => void;
  onNavigateToSession: (id: string) => void;
};

/** Used by WorkspaceMain as the agent session view; all interaction goes to the retained terminal. */
export default function TerminalSessionWorkspace({
  project, session, isActive, onSessionEstablished, onNavigateToSession,
}: TerminalSessionWorkspaceProps) {
  const { t } = useTranslation();
  // Disable duplicate creation while the server allocates the shared terminal id.
  const [starting, setStarting] = useState(false);
  // Surface allocation failures before a terminal connection can exist.
  const [error, setError] = useState('');
  const creating = useRef(false);

  const start = async (provider: LLMProvider) => {
    if (creating.current) return;
    creating.current = true;
    setStarting(true);
    setError('');
    try {
      const response = await api.providers.createSession({ provider, projectPath: project.fullPath || project.path || '' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = await response.json();
      const id = body?.data?.sessionId;
      if (!id) throw new Error(t('terminalSession.createFailed'));
      writeSelectedProvider(provider);
      onSessionEstablished(id, { project, provider, summary: body.data.sessionName });
      onNavigateToSession(id);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      creating.current = false;
      setStarting(false);
    }
  };

  if (session) {
    return <StandaloneShell key={`${project.projectId}:${session.id}`} project={project} session={session}
      persistent autoConnect={isActive} isActive={isActive} showHeader={false} />;
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
      <h2 className="text-lg font-semibold">{t('terminalSession.title')}</h2>
      <p className="max-w-md text-sm text-muted-foreground">{t('terminalSession.description')}</p>
      <div className="flex flex-wrap justify-center gap-3">
        {(['codex', 'claude'] as const).map((provider) => (
          <button key={provider} type="button" disabled={starting} onClick={() => void start(provider)}
            className="rounded-md border border-border bg-card px-4 py-2 text-sm disabled:opacity-50">
            {starting ? t('terminalSession.starting') : provider === 'codex' ? 'Codex' : 'Claude Code'}
          </button>
        ))}
      </div>
      {error && <p role="alert" className="text-sm text-red-500">{t('terminalSession.createFailed')}: {error}</p>}
    </div>
  );
}
