import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OfflineBanner } from '@/components/OfflineBanner';

function setOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value });
}

afterEach(() => {
  setOnline(true);
  vi.unstubAllEnvs();
});

describe('OfflineBanner', () => {
  describe('server mode (VITE_STORAGE_PROVIDER=api)', () => {
    beforeEach(() => {
      vi.stubEnv('VITE_STORAGE_PROVIDER', 'api');
    });

    it('says nothing while online', () => {
      render(<OfflineBanner />);
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('says what is and is not possible while offline', () => {
      setOnline(false);
      render(<OfflineBanner />);

      const banner = screen.getByRole('status');
      expect(banner).toHaveTextContent(/offline/i);
      expect(banner).toHaveTextContent(/changes you make will not save/i);
    });
  });

  describe('local-first mode (the default)', () => {
    it('says nothing while offline, because local writes save fine without a network', () => {
      setOnline(false);
      render(<OfflineBanner />);
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });
});
