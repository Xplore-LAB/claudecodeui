import { renderHook } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';

import { useVisualViewportKeyboardOffset } from '@/modules/project-workspace/hooks/useVisualViewportKeyboardOffset';

afterEach(() => vi.unstubAllGlobals());

function viewportFixture() {
  const viewport = Object.assign(new EventTarget(), { height: 480, offsetTop: 90, scale: 1 });
  vi.stubGlobal('visualViewport', viewport);
  return viewport;
}

test('initializes and follows keyboard resizing and Safari viewport panning, then cleans up', () => {
  const viewport = viewportFixture();
  const { unmount } = renderHook(() => useVisualViewportKeyboardOffset());
  const style = document.documentElement.style;
  expect(style.getPropertyValue('--workspace-viewport-height')).toBe('480px');
  expect(style.getPropertyValue('--workspace-viewport-top')).toBe('90px');
  viewport.height = 320;
  viewport.dispatchEvent(new Event('resize'));
  expect(style.getPropertyValue('--workspace-viewport-height')).toBe('320px');
  viewport.offsetTop = 140;
  viewport.dispatchEvent(new Event('scroll'));
  expect(style.getPropertyValue('--workspace-viewport-top')).toBe('140px');
  unmount();
  viewport.dispatchEvent(new Event('resize'));
  expect(style.getPropertyValue('--workspace-viewport-height')).toBe('');
  expect(style.getPropertyValue('--workspace-viewport-top')).toBe('');
});

test('does not resize the layout during pinch zoom', () => {
  const viewport = viewportFixture();
  const { unmount } = renderHook(() => useVisualViewportKeyboardOffset());
  viewport.scale = 2;
  viewport.height = 200;
  viewport.dispatchEvent(new Event('resize'));
  expect(document.documentElement.style.getPropertyValue('--workspace-viewport-height')).toBe('480px');
  unmount();
});

test('supports browsers without VisualViewport', () => {
  vi.stubGlobal('visualViewport', undefined);
  const { unmount } = renderHook(() => useVisualViewportKeyboardOffset());
  expect(document.documentElement.style.getPropertyValue('--workspace-viewport-height')).toBe('');
  unmount();
});
