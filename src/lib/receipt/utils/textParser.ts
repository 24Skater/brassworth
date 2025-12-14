import { ParsedReceipt, ParsedReceiptItem } from '../types';

export function parseReceiptText(text: string): ParsedReceipt {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Extract store name (usually first few lines)
  const storeName = extractStoreName(lines);

  // Extract purchase date
  const purchaseDate = extractDate(lines);

  // Extract line items
  const items = extractLineItems(lines);

  return {
    storeName,
    purchaseDate,
    items,
    rawText: text,
  };
}

function extractStoreName(lines: string[]): string | undefined {
  // Look for common store patterns in first 5 lines
  const topLines = lines.slice(0, 5).join(' ');

  // Common store patterns
  const storePatterns = [
    /(?:walmart|target|costco|home depot|lowes?|amazon|best buy|kroger|safeway|whole foods)/i,
    /^[A-Z][A-Za-z\s&]+(?:store|market|shop|depot|mart)/i,
  ];

  for (const pattern of storePatterns) {
    const match = topLines.match(pattern);
    if (match) {
      return match[0].trim();
    }
  }

  // Fallback: first non-empty line that looks like a name
  const firstLine = lines[0];
  if (firstLine && /^[A-Z]/.test(firstLine)) {
    return firstLine;
  }

  return undefined;
}

function extractDate(lines: string[]): string | undefined {
  const datePatterns = [
    // MM/DD/YYYY or MM-DD-YYYY
    /(\d{1,2})[/-](\d{1,2})[/-](\d{4})/,
    // YYYY-MM-DD
    /(\d{4})[/-](\d{1,2})[/-](\d{1,2})/,
    // Month DD, YYYY
    /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* (\d{1,2}),? (\d{4})/i,
  ];

  for (const line of lines) {
    for (const pattern of datePatterns) {
      const match = line.match(pattern);
      if (match) {
        // Try to normalize to YYYY-MM-DD
        try {
          const dateStr = match[0];
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
          }
        } catch (_e) {
          // Continue trying other patterns
        }
      }
    }
  }

  return undefined;
}

function extractLineItems(lines: string[]): ParsedReceiptItem[] {
  const items: ParsedReceiptItem[] = [];

  // Pattern: anything followed by a price (with optional quantity)
  // Examples:
  // "Widget 2 @ $5.99 $11.98"
  // "Thing $19.99"
  // "Item x3 $29.97"
  const pricePattern = /\$?\s*(\d+[,.]?\d*\.?\d{2})\s*$/;
  const qtyPattern = /(?:x|qty:?\s*)(\d+)/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip lines that look like headers or totals
    if (/^(subtotal|tax|total|payment|change|thank you)/i.test(line)) {
      continue;
    }

    const priceMatch = line.match(pricePattern);
    if (priceMatch) {
      const priceStr = priceMatch[1].replace(',', '');
      const lineTotal = parseFloat(priceStr);

      if (isNaN(lineTotal) || lineTotal <= 0) continue;

      // Extract description (everything before the price)
      let description = line.substring(0, priceMatch.index).trim();

      // Check for quantity in description
      let quantity = 1;
      const qtyMatch = description.match(qtyPattern);
      if (qtyMatch) {
        quantity = parseInt(qtyMatch[1], 10);
        description = description.replace(qtyMatch[0], '').trim();
      }

      // Remove leading/trailing symbols and numbers that aren't part of the name
      description = description.replace(/^[\d\s-*]+/, '').trim();

      if (description.length > 0) {
        const unitPrice = quantity > 1 ? lineTotal / quantity : lineTotal;

        items.push({
          description,
          quantity,
          unitPrice: parseFloat(unitPrice.toFixed(2)),
          lineTotal: parseFloat(lineTotal.toFixed(2)),
        });
      }
    }
  }

  return items;
}
