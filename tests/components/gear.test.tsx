import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GearProfilePicker } from '@/components/gear/GearProfilePicker';
import { GearProfilePanel } from '@/components/gear/GearProfilePanel';
import { DataPlateScanner } from '@/components/gear/DataPlateScanner';
import type { DataPlateOcr } from '@/lib/gear/ocr';
import type { DataPlateReading } from '@/lib/gear/dataPlate';
import type { GearProfile } from '@/types';

function profile(over: Partial<GearProfile> = {}): GearProfile {
  return {
    id: 'p1',
    brand: 'DeWalt',
    model: 'DCD791D2',
    productType: 'Cordless drill',
    specs: [
      { label: 'Voltage', value: '20', unit: 'V' },
      { label: 'Chuck', value: '1/2 in' },
    ],
    source: 'CATALOGUE',
    licence: 'ODbL-1.0',
    sourceName: 'Community catalogue',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

const PROFILES = [
  profile(),
  profile({ id: 'p2', brand: 'Makita', model: 'XPH12Z', productType: 'Hammer drill' }),
];

describe('GearProfilePicker', () => {
  it('offers no results until something is typed', () => {
    render(
      <GearProfilePicker profiles={PROFILES} selected={null} onSelect={vi.fn()} onClear={vi.fn()} />
    );
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('lists matches as you type', async () => {
    const user = userEvent.setup();
    render(
      <GearProfilePicker profiles={PROFILES} selected={null} onSelect={vi.fn()} onClear={vi.fn()} />
    );

    await user.type(screen.getByLabelText('Gear profile'), 'makita');
    expect(await screen.findByText('Makita XPH12Z')).toBeInTheDocument();
    expect(screen.queryByText('DeWalt DCD791D2')).not.toBeInTheDocument();
  });

  it('selects a profile when its row is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <GearProfilePicker
        profiles={PROFILES}
        selected={null}
        onSelect={onSelect}
        onClear={vi.fn()}
      />
    );

    await user.type(screen.getByLabelText('Gear profile'), 'dcd791');
    await user.click(await screen.findByText('DeWalt DCD791D2'));

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }));
  });

  it('says so plainly when nothing matches, rather than showing an empty list', async () => {
    const user = userEvent.setup();
    render(
      <GearProfilePicker profiles={PROFILES} selected={null} onSelect={vi.fn()} onClear={vi.fn()} />
    );

    await user.type(screen.getByLabelText('Gear profile'), 'festool');
    expect(await screen.findByText(/Nothing in the catalogue matches/i)).toBeInTheDocument();
  });

  it('shows the linked profile instead of the search box once one is chosen', () => {
    render(
      <GearProfilePicker
        profiles={PROFILES}
        selected={profile()}
        onSelect={vi.fn()}
        onClear={vi.fn()}
      />
    );

    expect(screen.getByText('DeWalt DCD791D2')).toBeInTheDocument();
    expect(screen.queryByLabelText('Gear profile')).not.toBeInTheDocument();
  });

  it('marks a catalogue profile as such, and a user one as theirs', () => {
    const { rerender } = render(
      <GearProfilePicker
        profiles={PROFILES}
        selected={profile()}
        onSelect={vi.fn()}
        onClear={vi.fn()}
      />
    );
    expect(screen.getByText('Catalogue')).toBeInTheDocument();

    rerender(
      <GearProfilePicker
        profiles={PROFILES}
        selected={profile({ source: 'USER' })}
        onSelect={vi.fn()}
        onClear={vi.fn()}
      />
    );
    expect(screen.getByText('Yours')).toBeInTheDocument();
  });

  it('can be unlinked', async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(
      <GearProfilePicker
        profiles={PROFILES}
        selected={profile()}
        onSelect={vi.fn()}
        onClear={onClear}
      />
    );

    await user.click(screen.getByLabelText('Unlink gear profile'));
    expect(onClear).toHaveBeenCalled();
  });
});

describe('GearProfilePanel', () => {
  it('renders each spec with its unit', () => {
    render(<GearProfilePanel profile={profile()} />);
    expect(screen.getByText('20 V')).toBeInTheDocument();
    expect(screen.getByText('1/2 in')).toBeInTheDocument();
  });

  it('says so when a profile has no specs yet', () => {
    render(<GearProfilePanel profile={profile({ specs: [] })} />);
    expect(screen.getByText(/No specifications recorded/i)).toBeInTheDocument();
  });

  it('attributes the catalogue and its licence, so the terms are visible', () => {
    render(<GearProfilePanel profile={profile()} />);
    expect(screen.getByText(/ODbL-1.0/)).toBeInTheDocument();
  });

  it('does not claim a licence over a profile the user wrote', () => {
    render(<GearProfilePanel profile={profile({ source: 'USER', licence: undefined })} />);
    expect(screen.queryByText(/ODbL/)).not.toBeInTheDocument();
  });

  it('opens a manual link in a new tab without handing it window.opener', () => {
    render(<GearProfilePanel profile={profile({ manualUrl: 'https://example.com/m.pdf' })} />);
    const link = screen.getByRole('link', { name: /Manual/i });
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('renders no link section when the profile carries no links', () => {
    render(<GearProfilePanel profile={profile()} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});

describe('DataPlateScanner', () => {
  function ocrReturning(reading: DataPlateReading): DataPlateOcr {
    return { read: vi.fn(async () => reading) };
  }

  function file(): File {
    return new File(['plate'], 'plate.jpg', { type: 'image/jpeg' });
  }

  it('hands the parsed reading to its caller', async () => {
    const user = userEvent.setup();
    const onRead = vi.fn();
    const reading: DataPlateReading = {
      brand: 'DeWalt',
      model: 'DCD791',
      serialNumber: '2019-45-A0012',
      rawText: 'raw',
    };

    render(
      <DataPlateScanner knownBrands={['DeWalt']} onRead={onRead} ocr={ocrReturning(reading)} />
    );
    await user.upload(screen.getByTestId('data-plate-input'), file());

    await waitFor(() => expect(onRead).toHaveBeenCalledWith(reading));
  });

  it('passes the known brands through, so what it recognises grows with the catalogue', async () => {
    const user = userEvent.setup();
    const ocr = ocrReturning({ rawText: '' });

    render(<DataPlateScanner knownBrands={['Makita', 'Ryobi']} onRead={vi.fn()} ocr={ocr} />);
    await user.upload(screen.getByTestId('data-plate-input'), file());

    await waitFor(() =>
      expect(ocr.read).toHaveBeenCalledWith(expect.any(File), ['Makita', 'Ryobi'])
    );
  });

  it('reports a failed read instead of failing silently', async () => {
    const user = userEvent.setup();
    const failing: DataPlateOcr = {
      read: vi.fn(async () => {
        throw new Error('worker died');
      }),
    };

    render(<DataPlateScanner knownBrands={[]} onRead={vi.fn()} ocr={failing} />);
    await user.upload(screen.getByTestId('data-plate-input'), file());

    expect(await screen.findByRole('alert')).toHaveTextContent(/Could not read that photo/i);
  });

  it('recovers after a failure rather than staying stuck on Reading', async () => {
    const user = userEvent.setup();
    const failing: DataPlateOcr = {
      read: vi.fn(async () => {
        throw new Error('worker died');
      }),
    };

    render(<DataPlateScanner knownBrands={[]} onRead={vi.fn()} ocr={failing} />);
    await user.upload(screen.getByTestId('data-plate-input'), file());

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Scan data plate/i })).toBeEnabled()
    );
  });

  it('can be disabled', () => {
    render(<DataPlateScanner knownBrands={[]} onRead={vi.fn()} disabled />);
    expect(screen.getByRole('button', { name: /Scan data plate/i })).toBeDisabled();
  });
});
