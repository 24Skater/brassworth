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
});
