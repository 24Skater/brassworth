/**
 * QR rendering, imported lazily.
 *
 * Labels are printed rarely and the encoder is dead weight in a bundle a phone
 * downloads over cellular, so it is only fetched when somebody actually opens
 * the label sheet. SVG rather than a data URL because these are printed, and a
 * raster image at print resolution is large and scans worse.
 */
export async function qrSvg(text: string): Promise<string> {
  const { toString } = await import('qrcode');
  return toString(text, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 1,
  });
}
