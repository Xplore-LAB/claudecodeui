import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';

import pty from 'node-pty';

import { buildPersistentTerminalLaunch } from '@/modules/websocket/services/persistent-terminal.service.js';

test('tmux preserves the actual terminal process when its web transport exits', async () => {
  const socket = `cloudcli-test-${randomUUID()}`;
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'terminal-test-'));
  const launch = buildPersistentTerminalLaunch({
    key: 'shared-app-session', cwd: root, command: 'exec bash --norc --noprofile',
    cols: 80, rows: 24, restart: false, environment: { PATH: process.env.PATH || '' },
  });
  const args = [...launch.args];
  args[1] = socket;
  args.splice(3, 0, '-d');
  let client: ReturnType<typeof pty.spawn> | undefined;
  try {
    execFileSync('tmux', args, { stdio: 'ignore' });
    const sessionName = args[args.indexOf('-s') + 1];
    const panePid = () => execFileSync('tmux', ['-L', socket, 'display-message', '-p', '-t', sessionName, '#{pane_pid}'], { encoding: 'utf8' }).trim();
    const originalPid = panePid();
    const attach = () => pty.spawn('tmux', ['-L', socket, 'attach-session', '-t', sessionName], {
      name: 'xterm-256color', cols: 80, rows: 24, cwd: root,
      env: { ...process.env, TERM: 'xterm-256color' },
    });
    client = attach();
    await delay(100);
    client.kill();
    client = undefined;
    await delay(100);
    assert.equal(panePid(), originalPid);
    client = attach();
    client.write("printf 'shared-terminal-ok' > result.txt\r");
    let result = '';
    for (let attempt = 0; attempt < 40; attempt += 1) {
      result = await fs.readFile(path.join(root, 'result.txt'), 'utf8').catch(() => '');
      if (result) break;
      await delay(50);
    }
    assert.equal(result, 'shared-terminal-ok');
    assert.equal(panePid(), originalPid);
  } finally {
    client?.kill();
    try { execFileSync('tmux', ['-L', socket, 'kill-server'], { stdio: 'ignore' }); } catch { /* Already stopped. */ }
    await fs.rm(root, { recursive: true, force: true });
  }
});
