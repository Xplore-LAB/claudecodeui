import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import '@/modules/i18n';

import SharedTerminalStatus from '@/modules/shell/SharedTerminalStatus';

const mocks = vi.hoisted(() => ({ copy: vi.fn() }));
vi.mock('@/shared/utils', () => ({ copyTextToClipboard: mocks.copy }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

test('shows transport status and copies the exact attach command', async () => {
  mocks.copy.mockResolvedValue(true);
  const view = render(<SharedTerminalStatus connected connecting={false} attachCommand="tmux -L cloudcli attach -t session-123" />);
  expect(screen.getByRole('status').textContent).toContain('Connected');
  fireEvent.click(screen.getByText('Attach from a local terminal'));
  fireEvent.click(screen.getByRole('button', { name: 'Copy command' }));
  await waitFor(() => expect(screen.getByText('Copied')).toBeTruthy());
  expect(mocks.copy).toHaveBeenCalledExactlyOnceWith('tmux -L cloudcli attach -t session-123');
  view.rerender(<SharedTerminalStatus connected={false} connecting attachCommand={null} />);
  expect(screen.getByRole('status').textContent).toContain('Connecting');
  expect(screen.queryByRole('button')).toBeNull();
});

test('clipboard failure offers manual copying rather than claiming success', async () => {
  mocks.copy.mockResolvedValue(false);
  render(<SharedTerminalStatus connected={false} connecting={false} attachCommand="tmux attach" />);
  fireEvent.click(screen.getByText('Attach from a local terminal'));
  fireEvent.click(screen.getByRole('button', { name: 'Copy command' }));
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('copy it manually'));
  expect(screen.queryByText('Copied')).toBeNull();
});
