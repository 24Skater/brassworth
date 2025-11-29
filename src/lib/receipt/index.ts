import { ReceiptParserProvider } from './types';
import { ClientSideReceiptParser } from './providers/clientSideParser';

export function createReceiptParser(): ReceiptParserProvider {
  // Default: fully client-side, no external dependencies
  return new ClientSideReceiptParser();
}

export * from './types';
