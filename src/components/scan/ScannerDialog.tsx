import { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { resolveDetector } from '@/lib/scan/detector';

interface ScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the raw decoded text. The caller decides what it means. */
  onDecoded: (text: string) => void;
}

/**
 * Point the camera at a label.
 *
 * The decoded text is handed straight out rather than acted on here, so the
 * origin check lives in one place (`parseItemUrl`) and this component stays a
 * camera and a loop.
 *
 * `onDecoded` is read through a ref rather than listed as an effect
 * dependency. Callers typically pass an inline arrow, which gets a new
 * identity on every render; depending on it directly would restart the
 * camera any time the caller re-rendered for an unrelated reason, not just
 * when the dialog opens or closes.
 */
export function ScannerDialog({ open, onOpenChange, onDecoded }: ScannerDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onDecodedRef = useRef(onDecoded);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onDecodedRef.current = onDecoded;
  }, [onDecoded]);

  useEffect(() => {
    if (!open) return;

    let stream: MediaStream | null = null;
    let frame = 0;
    let stopped = false;

    void (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
      } catch {
        setError('Brassworth could not open the camera. Check the permission and try again.');
        return;
      }

      if (stopped) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play().catch(() => undefined);
      }

      const detector = await resolveDetector();

      const tick = async () => {
        if (stopped || !videoRef.current) return;
        try {
          const [first] = await detector.detect(videoRef.current);
          if (first) {
            onDecodedRef.current(first.rawValue);
            return;
          }
        } catch {
          // A frame that cannot be decoded is the normal case, not an error.
        }
        frame = requestAnimationFrame(() => void tick());
      };

      frame = requestAnimationFrame(() => void tick());
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Scan a label</DialogTitle>
          <DialogDescription>Point the camera at the QR code on your gear.</DialogDescription>
        </DialogHeader>
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <video ref={videoRef} className="w-full rounded-lg" muted playsInline />
        )}
      </DialogContent>
    </Dialog>
  );
}
