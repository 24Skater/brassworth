import { useState } from 'react';
import { Upload, FileText, Image as ImageIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { createReceiptParser, ParsedReceipt } from '@/lib/receipt';

interface ReceiptUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onParsed: (receipt: ParsedReceipt, file?: File) => void;
}

export function ReceiptUploadDialog({ open, onOpenChange, onParsed }: ReceiptUploadDialogProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [manualText, setManualText] = useState('');

  const handleFile = async (file: File) => {
    setIsProcessing(true);
    setProcessingStatus('Analyzing receipt...');

    try {
      const parser = createReceiptParser();
      let result: ParsedReceipt;

      if (file.type === 'application/pdf') {
        setProcessingStatus('Extracting text from PDF...');
        result = await (parser as any).parsePDF(file);
      } else if (file.type.startsWith('image/')) {
        setProcessingStatus('Running OCR on image...');
        result = await parser.parseImage(file);
      } else {
        throw new Error('Unsupported file type');
      }

      onParsed(result, file);
    } catch (error) {
      console.error('Error processing receipt:', error);
      alert('Failed to process receipt. Please try pasting the text manually.');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleManualText = async () => {
    if (!manualText.trim()) return;

    setIsProcessing(true);
    setProcessingStatus('Parsing text...');

    try {
      const parser = createReceiptParser();
      const result = await parser.parseText(manualText);
      onParsed(result);
    } catch (error) {
      console.error('Error parsing text:', error);
      alert('Failed to parse receipt text.');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
      setManualText('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Items from Receipt</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {isProcessing ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="text-sm text-muted-foreground">{processingStatus}</p>
            </div>
          ) : (
            <>
              {/* File Upload Area */}
              <div>
                <Label>Upload Receipt Image or PDF</Label>
                <div
                  className={`mt-2 border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragging
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                >
                  <div className="flex flex-col items-center space-y-4">
                    <div className="flex space-x-2">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        Drop your receipt here or click to browse
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Supports images (JPG, PNG) and PDF files
                      </p>
                    </div>
                    <input
                      type="file"
                      id="receipt-upload"
                      className="hidden"
                      accept="image/*,application/pdf"
                      onChange={handleFileInput}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('receipt-upload')?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Choose File
                    </Button>
                  </div>
                </div>
              </div>

              {/* Manual Text Entry */}
              <div>
                <Label htmlFor="manual-text">Or Paste Receipt Text</Label>
                <Textarea
                  id="manual-text"
                  placeholder="Paste receipt text here (e.g., from an email receipt)..."
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  rows={8}
                  className="mt-2"
                />
                <Button
                  onClick={handleManualText}
                  disabled={!manualText.trim()}
                  className="mt-2"
                >
                  Parse Text
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
