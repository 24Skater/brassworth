import { screen, waitFor, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ScannerDialog } from '@/components/scan/ScannerDialog';

function renderDialog(props: Partial<React.ComponentProps<typeof ScannerDialog>> = {}) {
  return render(
    <MemoryRouter>
      <ScannerDialog open onOpenChange={() => {}} onDecoded={() => {}} {...props} />
    </MemoryRouter>
  );
}

describe('ScannerDialog', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('explains itself when the camera is refused', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn().mockRejectedValue(new Error('denied')) },
    });

    renderDialog();

    expect(await screen.findByText(/could not open the camera/i)).toBeInTheDocument();
  });

  it('explains itself when there is no camera API at all', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: undefined,
    });

    renderDialog();

    await waitFor(() => {
      expect(screen.getByText(/could not open the camera/i)).toBeInTheDocument();
    });
  });
  it('releases the camera when the dialog closes', async () => {
    // The single most important property of this component. A scanner that
    // leaves the camera running is visible to the user as a light that will
    // not go out, and it was previously asserted nowhere.
    const stop = vi.fn();
    const stream = { getTracks: () => [{ stop }] };
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn().mockResolvedValue(stream) },
    });

    const { rerender } = renderDialog();
    await waitFor(() => {
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
    });

    rerender(
      <MemoryRouter>
        <ScannerDialog open={false} onOpenChange={() => {}} onDecoded={() => {}} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(stop).toHaveBeenCalled();
    });
  });

  it('releases the camera on unmount', async () => {
    const stop = vi.fn();
    const stream = { getTracks: () => [{ stop }] };
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn().mockResolvedValue(stream) },
    });

    const { unmount } = renderDialog();
    await waitFor(() => {
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
    });

    unmount();

    await waitFor(() => {
      expect(stop).toHaveBeenCalled();
    });
  });
});
