import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Loader2 } from 'lucide-react';
import { TesseractDataPlateOcr, type DataPlateOcr } from '@/lib/gear/ocr';
import type { DataPlateReading } from '@/lib/gear/dataPlate';

interface DataPlateScannerProps {
  /** Spellings the reader can recognise, taken from the catalogue in use. */
  knownBrands: readonly string[];
  onRead: (reading: DataPlateReading) => void;
  /** Injectable so tests do not have to load a language model. */
  ocr?: DataPlateOcr;
  disabled?: boolean;
}

const defaultOcr = new TesseractDataPlateOcr();

/**
 * Photograph the rating plate instead of typing off it.
 *
 * Serial numbers are long, meaningless and printed small — the field people get
 * wrong and never notice, because nothing checks it until an insurance claim.
 *
 * The read *fills the form* rather than saving anything. OCR on a scratched
 * metal plate in a garage is not reliable enough to be trusted silently, and
 * putting the result in editable fields means a bad character is obvious and
 * one keystroke from fixed.
 */
export function DataPlateScanner({
  knownBrands,
  onRead,
  ocr = defaultOcr,
  disabled,
}: DataPlateScannerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isReading, setIsReading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setIsReading(true);
    setError(null);

    try {
      onRead(await ocr.read(file, knownBrands));
    } catch {
      setError('Could not read that photo. Try again in better light, or type the details in.');
    } finally {
      setIsReading(false);
      // Clearing lets the same file be chosen again after a failed read.
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        data-testid="data-plate-input"
        aria-label="Data plate photo"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || isReading}
        onClick={() => inputRef.current?.click()}
      >
        {isReading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Camera className="mr-2 h-4 w-4" aria-hidden="true" />
        )}
        {isReading ? 'Reading…' : 'Scan data plate'}
      </Button>

      <p className="mt-1 text-xs text-muted-foreground">
        Photograph the rating plate to fill in make, model and serial number. Check them before
        saving.
      </p>

      {error && (
        <p role="alert" className="mt-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
