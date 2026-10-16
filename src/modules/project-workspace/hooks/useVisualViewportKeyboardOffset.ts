import { useEffect } from 'react';

/** Keeps the workspace inside the visible viewport when a mobile keyboard opens. */
export function useVisualViewportKeyboardOffset() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return undefined;
    const style = document.documentElement.style;
    const update = () => {
      // Preserve browser magnification: resizing the app during pinch zoom fights panning.
      if (viewport.scale !== 1) return;
      style.setProperty('--workspace-viewport-height', `${viewport.height}px`);
      style.setProperty('--workspace-viewport-top', `${viewport.offsetTop}px`);
    };
    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      style.removeProperty('--workspace-viewport-height');
      style.removeProperty('--workspace-viewport-top');
    };
  }, []);
}
