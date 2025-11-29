import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import { ReceiptParserProvider, ParsedReceipt } from '../types';
import { parseReceiptText } from '../utils/textParser';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export class ClientSideReceiptParser implements ReceiptParserProvider {
  async parseImage(file: File): Promise<ParsedReceipt> {
    // Use Tesseract.js for OCR
    const worker = await createWorker('eng');
    
    try {
      const { data: { text } } = await worker.recognize(file);
      return this.parseText(text);
    } finally {
      await worker.terminate();
    }
  }

  async parseText(text: string): Promise<ParsedReceipt> {
    return parseReceiptText(text);
  }

  async parsePDF(file: File): Promise<ParsedReceipt> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    
    // Extract text from all pages
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }
    
    return this.parseText(fullText);
  }
}
