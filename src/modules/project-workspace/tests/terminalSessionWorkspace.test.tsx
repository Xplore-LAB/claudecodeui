import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import '@/modules/i18n';
import type { Project } from '@/shared/types';

const mocks = vi.hoisted(() => ({ create: vi.fn(), shell: vi.fn() }));
vi.mock('@/shared/api', () => ({ api: { providers: { createSession: mocks.create } } }));
vi.mock('@/shared/selectedProvider', () => ({ writeSelectedProvider: vi.fn() }));
vi.mock('@/modules/standalone-shell', () => ({ StandaloneShell: (props: unknown) => {
  mocks.shell(props);
  return <div data-testid="real-terminal" />;
} }));
import TerminalSessionWorkspace from '@/modules/project-workspace/TerminalSessionWorkspace';

const project: Project = { projectId: 'test', fullPath: '/workspace', displayName: 'Test' };
afterEach(() => { cleanup(); vi.clearAllMocks(); });

test('an existing conversation connects only to the shared terminal', () => {
  render(<TerminalSessionWorkspace project={project} session={{ id: 'app-session', __provider: 'codex' }}
    isActive onSessionEstablished={vi.fn()} onNavigateToSession={vi.fn()} />);
  expect(screen.getByTestId('real-terminal')).toBeTruthy();
  expect(mocks.shell.mock.calls[0][0]).toMatchObject({ persistent: true, session: { id: 'app-session' } });
  expect(mocks.create).not.toHaveBeenCalled();
});

test('a new terminal gets a stable server session id before navigation', async () => {
  mocks.create.mockResolvedValue({ ok: true, json: async () => ({ data: { sessionId: 'new-app-id', sessionName: 'Terminal' } }) });
  const established = vi.fn();
  const navigate = vi.fn();
  render(<TerminalSessionWorkspace project={project} session={null} isActive
    onSessionEstablished={established} onNavigateToSession={navigate} />);
  fireEvent.click(screen.getByRole('button', { name: 'Codex' }));
  await waitFor(() => expect(navigate).toHaveBeenCalledWith('new-app-id'));
  expect(mocks.create).toHaveBeenCalledExactlyOnceWith({ provider: 'codex', projectPath: '/workspace' });
  expect(established).toHaveBeenCalledWith('new-app-id', { project, provider: 'codex', summary: 'Terminal' });
});

test('failed allocation does not launch or navigate to a second agent', async () => {
  mocks.create.mockResolvedValue({ ok: false, status: 503 });
  const navigate = vi.fn();
  render(<TerminalSessionWorkspace project={project} session={null} isActive
    onSessionEstablished={vi.fn()} onNavigateToSession={navigate} />);
  fireEvent.click(screen.getByRole('button', { name: 'Codex' }));
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('503'));
  expect(mocks.shell).not.toHaveBeenCalled();
  expect(navigate).not.toHaveBeenCalled();
});
