import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { isApiStorageTier } from '@/lib/storage';
import { WifiOff } from 'lucide-react';

/**
 * Says plainly when there is no network -- but only in server mode.
 *
 * v2.1 caches reads only. Queuing writes is v2.2, and until it exists the
 * honest message in server mode is that changes will not save -- a silent
 * failure here would lose somebody's checkout and tell them it worked.
 *
 * Local-first (the default) has no server round trip: a write is a browser
 * API call that succeeds with or without a network. Showing this banner there
 * would be a false warning, and a false warning is worse than none -- it
 * would tell someone their work is at risk when it plainly is not.
 */
export function OfflineBanner() {
  const online = useOnlineStatus();

  if (online || !isApiStorageTier()) return null;

  return (
    <div
      role="status"
      className="flex items-center gap-2 bg-amber-500/15 text-amber-800 dark:text-amber-300 px-4 py-2 text-sm"
    >
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>
        You are offline. You can read what is already loaded; changes you make will not save yet.
      </span>
    </div>
  );
}
