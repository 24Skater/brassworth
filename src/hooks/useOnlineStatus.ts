import { useEffect, useState } from 'react';

/**
 * Whether the browser thinks it has a network.
 *
 * `navigator.onLine` is optimistic — it reports a connection that may not reach
 * anything — so this drives a message, never a decision about whether a write
 * is safe. The write path finds out by failing.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return online;
}
