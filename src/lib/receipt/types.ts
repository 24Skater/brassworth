export interface ReceiptParserProvider {
  parseImage(file: File): Promise<ParsedReceipt>;
  parseText(text: string): Promise<ParsedReceipt>;
}

export interface ParsedReceipt {
  storeName?: string;
  purchaseDate?: string;
  items: ParsedReceiptItem[];
  rawText: string;
}

export interface ParsedReceiptItem {
  description: string;
  quantity: number;
  unitPrice?: number;
  lineTotal?: number;
}
