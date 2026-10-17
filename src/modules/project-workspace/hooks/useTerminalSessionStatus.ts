import { useEffect, useState } from 'react';

import { api } from '@/shared/api';

/** Used by WorkspaceMain to route terminal-owned conversations back to their existing process. */
export function useTerminalSessionStatus(sessionId: string | null): boolean {
  // Retain the last confirmed owner, tagged with its session to prevent stale responses crossing selections.
  const [status, setStatus] = useState<{ sessionId: string; active: boolean } | null>(null);
  useEffect(() => {
    if (!sessionId) return;
    let disposed = false;
    let checking = false;
    const check = async () => {
      if (checking) return;
      checking = true;
      try {
        const response = await api.sessionDetails(sessionId);
        if (!response.ok) return;
        const body = await response.json();
        if (!disposed) setStatus({ sessionId, active: body?.data?.terminalActive === true });
      } catch {
        // The backend still enforces ownership if a temporary network error hides status.
      } finally {
        checking = false;
      }
    };
    void check();
    const timer = window.setInterval(() => void check(), 5000);
    return () => { disposed = true; window.clearInterval(timer); };
  }, [sessionId]);
  return status?.sessionId === sessionId && status.active;
}
