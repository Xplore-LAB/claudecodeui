import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';

import { Codex } from '@openai/codex-sdk';
import type { Thread, ThreadOptions } from '@openai/codex-sdk';

import { codexRuntime } from '@/modules/providers/list/codex/codex-runtime.provider.js';
import type { ProviderRuntimeContext } from '@/shared/index.js';

for (const resumed of [false, true]) {
  for (const permissionMode of [undefined, 'default', 'unknown', 'acceptEdits', 'bypassPermissions']) {
    test(`Codex ${resumed ? 'resumes' : 'starts'} with supported permissions (${permissionMode ?? 'omitted'})`, async (t) => {
      let capturedOptions: ThreadOptions | undefined;
      let capturedPrompt: unknown;
      const messages: unknown[] = [];
      const thread = {
        id: 'native-thread',
        async runStreamed(prompt: unknown) {
          capturedPrompt = prompt;
          return { events: (async function* () {
            yield { type: 'thread.started', thread_id: 'native-thread' };
          })() };
        },
      } as unknown as Thread;

      const start = t.mock.method(Codex.prototype, 'startThread', (options?: ThreadOptions) => {
        capturedOptions = options;
        return thread;
      });
      const resume = t.mock.method(Codex.prototype, 'resumeThread', (id: string, options?: ThreadOptions) => {
        assert.equal(id, 'native-thread');
        capturedOptions = options;
        return thread;
      });
      const context: ProviderRuntimeContext = {
        resolveProviderSessionId: () => resumed ? 'native-thread' : null,
        resolveResumeModel: async () => 'test-model',
        getProviderModels: async () => ({ OPTIONS: [], DEFAULT: 'test-model' }),
        normalizeMessage: () => [],
        isProviderInstalled: async () => true,
      };

      await codexRuntime.run('hey there', {
        sessionId: resumed ? 'app-session' : undefined,
        permissionMode,
        cwd: process.cwd(),
      }, { isWebSocketWriter: true, send: (message) => messages.push(message) }, context);

      assert.equal(start.mock.callCount(), resumed ? 0 : 1);
      assert.equal(resume.mock.callCount(), resumed ? 1 : 0);
      assert.equal(capturedPrompt, 'hey there');
      assert.equal(capturedOptions?.sandboxMode, permissionMode === 'bypassPermissions' ? 'danger-full-access' : 'workspace-write');
      assert.equal(capturedOptions?.approvalPolicy, permissionMode === 'acceptEdits' || permissionMode === 'bypassPermissions' ? 'never' : 'on-request');
      assert.ok(messages.some((message: any) => message.kind === 'complete' && message.exitCode === 0));
      assert.ok(!messages.some((message: any) => message.kind === 'error'));
    });
  }
}

for (const command of ['', '  \n\t']) {
  test(`Codex supplies a prompt for an image-only turn (${JSON.stringify(command)})`, async (t) => {
    let capturedPrompt: unknown;
    const imagePath = path.join(process.cwd(), 'public', 'favicon.png');
    const thread = {
      id: 'native-thread',
      async runStreamed(prompt: unknown) {
        capturedPrompt = prompt;
        return { events: (async function* () {
          yield { type: 'thread.started', thread_id: 'native-thread' };
        })() };
      },
    } as unknown as Thread;

    t.mock.method(Codex.prototype, 'startThread', () => thread);
    const context: ProviderRuntimeContext = {
      resolveProviderSessionId: () => null,
      resolveResumeModel: async () => 'test-model',
      getProviderModels: async () => ({ OPTIONS: [], DEFAULT: 'test-model' }),
      normalizeMessage: () => [],
      isProviderInstalled: async () => true,
    };

    await codexRuntime.run(command, {
      cwd: process.cwd(),
      images: [{ path: imagePath, mimeType: 'image/png' }],
    }, { isWebSocketWriter: true, send: () => {} }, context);

    assert.deepEqual(capturedPrompt, [
      { type: 'text', text: 'Please analyze the attached image(s).' },
      { type: 'local_image', path: imagePath },
    ]);
  });
}

test('Codex forwards GPT-6.1 Sol reasoning effort and retries a transient writer conflict', async (t) => {
  let calls = 0;
  let options: ThreadOptions | undefined;
  const messages: unknown[] = [];
  const thread = {
    id: 'native-thread',
    async runStreamed() {
      calls += 1;
      if (calls === 1) {
        return { events: {
          [Symbol.asyncIterator]: () => ({
            next: async () => { throw new Error('thread-store conflict: thread native-thread already has an active writer'); },
          }),
        } };
      }
      return { events: (async function* () {
        yield { type: 'thread.started', thread_id: 'native-thread' };
      })() };
    },
  } as unknown as Thread;
  t.mock.method(Codex.prototype, 'resumeThread', (_id: string, threadOptions?: ThreadOptions) => {
    options = threadOptions;
    return thread;
  });
  const context: ProviderRuntimeContext = {
    resolveProviderSessionId: () => 'native-thread',
    resolveResumeModel: async () => 'gpt-6.1-sol',
    getProviderModels: async () => ({
      DEFAULT: 'gpt-6.1-sol',
      OPTIONS: [{ value: 'gpt-6.1-sol', label: 'GPT-6.1 Sol', effort: {
        default: 'low', values: [{ value: 'low' }, { value: 'ultra' }],
      } }],
    }),
    normalizeMessage: () => [],
    isProviderInstalled: async () => true,
  };

  await codexRuntime.run('hello', { sessionId: 'app-session', effort: 'ultra' },
    { isWebSocketWriter: true, send: (message) => messages.push(message) }, context);

  assert.equal(calls, 2);
  assert.equal(options?.model, 'gpt-6.1-sol');
  assert.equal(options?.modelReasoningEffort, 'ultra');
  assert.ok(messages.some((message: any) => message.kind === 'complete' && message.exitCode === 0));
  assert.ok(!messages.some((message: any) => message.kind === 'error'));
});

test('Codex explains how to continue when another process keeps the writer lock', async (t) => {
  let calls = 0;
  const messages: unknown[] = [];
  const thread = {
    id: 'native-thread',
    async runStreamed() {
      calls += 1;
      return { events: {
        [Symbol.asyncIterator]: () => ({
          next: async () => { throw new Error('thread-store conflict: already has an active writer'); },
        }),
      } };
    },
  } as unknown as Thread;
  t.mock.method(Codex.prototype, 'resumeThread', () => thread);
  const context: ProviderRuntimeContext = {
    resolveProviderSessionId: () => 'native-thread',
    resolveResumeModel: async () => 'gpt-6.1-sol',
    getProviderModels: async () => ({ DEFAULT: 'gpt-6.1-sol', OPTIONS: [] }),
    normalizeMessage: () => [],
    isProviderInstalled: async () => true,
  };

  await codexRuntime.run('hello', { sessionId: 'locked-session' },
    { isWebSocketWriter: true, send: (message) => messages.push(message) }, context);

  assert.equal(calls, 4);
  assert.ok(messages.some((message: any) => message.kind === 'error' && message.content.includes('Start a new CloudCLI conversation')));
  assert.ok(messages.some((message: any) => message.kind === 'complete' && message.exitCode === 1));
});

test('Codex rejects overlapping aliases before launching a second writer and releases after completion', async (t) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  let calls = 0;
  const thread = {
    id: 'shared-native-thread',
    async runStreamed() {
      calls += 1;
      return { events: (async function* () {
        await gate;
        yield { type: 'thread.started', thread_id: 'shared-native-thread' };
      })() };
    },
  } as unknown as Thread;
  t.mock.method(Codex.prototype, 'resumeThread', () => thread);
  const context: ProviderRuntimeContext = {
    resolveProviderSessionId: () => 'shared-native-thread',
    resolveResumeModel: async () => 'test-model',
    getProviderModels: async () => ({ DEFAULT: 'test-model', OPTIONS: [] }),
    normalizeMessage: () => [],
    isProviderInstalled: async () => true,
  };
  const messages: any[] = [];
  const writer = { isWebSocketWriter: true, send: (message: unknown) => messages.push(message) };
  const first = codexRuntime.run('first', { sessionId: 'first-alias' }, writer, context);
  try {
    await codexRuntime.run('duplicate', { sessionId: 'second-alias' }, writer, context);
    assert.ok(messages.some((message) => message.kind === 'error' && message.content.includes('占用')));
    assert.ok(messages.some((message) => message.kind === 'complete' && message.exitCode === 1));
  } finally {
    release();
    await first;
  }
  assert.equal(calls, 1);
  await codexRuntime.run('next', { sessionId: 'second-alias' }, writer, context);
  assert.equal(calls, 2);
});

test('Codex never replays a prompt after a stream has already emitted an event', async (t) => {
  let calls = 0;
  const thread = {
    id: 'started-thread',
    async runStreamed() {
      calls += 1;
      return { events: (async function* () {
        yield { type: 'thread.started', thread_id: 'started-thread' };
        throw new Error('thread-store conflict: already has an active writer');
      })() };
    },
  } as unknown as Thread;
  t.mock.method(Codex.prototype, 'resumeThread', () => thread);
  const context: ProviderRuntimeContext = {
    resolveProviderSessionId: () => 'started-thread',
    resolveResumeModel: async () => 'test-model',
    getProviderModels: async () => ({ DEFAULT: 'test-model', OPTIONS: [] }),
    normalizeMessage: () => [],
    isProviderInstalled: async () => true,
  };
  const messages: any[] = [];
  await codexRuntime.run('do once', { sessionId: 'started-app-session' },
    { isWebSocketWriter: true, send: (message) => messages.push(message) }, context);
  assert.equal(calls, 1);
  assert.ok(messages.some((message) => message.kind === 'complete' && message.exitCode === 1));
});
