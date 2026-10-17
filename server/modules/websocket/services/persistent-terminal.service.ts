import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

function terminalName(key: string): string {
  return `agent-${createHash('sha256').update(key).digest('hex').slice(0, 24)}`;
}

/** Used by the providers dispatcher to prevent SDK turns from competing with a live agent terminal. */
export function isAgentTerminalActive(projectPath: string, provider: string, sessionId: string): boolean {
  try {
    const name = terminalName(JSON.stringify([path.resolve(projectPath), provider, sessionId, '']));
    execFileSync('tmux', ['-L', 'cloudcli', 'has-session', '-t', `=${name}`], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/** Used by shell-websocket to attach clients to a terminal owned by the independent tmux service. */
export function buildPersistentTerminalLaunch(input: {
  key: string;
  command: string;
  cwd: string;
  cols: number;
  rows: number;
  restart: boolean;
  environment: Record<string, string>;
}): { args: string[]; attachCommand: string } {
  const sessionName = terminalName(input.key);
  if (input.restart) {
    const exists = (() => {
      try {
        execFileSync('tmux', ['-L', 'cloudcli', 'has-session', '-t', `=${sessionName}`], { stdio: 'ignore' });
        return true;
      } catch {
        return false;
      }
    })();
    if (exists) execFileSync('tmux', ['-L', 'cloudcli', 'kill-session', '-t', `=${sessionName}`]);
  }
  const quote = (value: string) => `'${value.replace(/'/g, `'\\''`)}'`;
  const environment = Object.entries(input.environment).map(([key, value]) => quote(`${key}=${value}`)).join(' ');
  // new-session -A is atomic: another browser or a service restart attaches
  // instead of creating a competing agent. The tmux daemon owns the process.
  const command = `exec env ${environment} bash -c ${quote(input.command)}`;
  return {
    args: ['-L', 'cloudcli', 'new-session', '-A', '-s', sessionName,
      '-c', input.cwd, '-x', String(input.cols), '-y', String(input.rows), command],
    attachCommand: `tmux -L cloudcli attach-session -t ${sessionName}`,
  };
}
