import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ParsedReceipt, ParsedReceiptItem } from '@/lib/receipt';
import { Category, Location } from '@/types';

interface ReceiptReviewTableProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: ParsedReceipt;
  onConfirm: (data: ConfirmedReceiptData) => void;
  categories: Category[];
  locations: Location[];
}

export interface ConfirmedReceiptData {
  storeName: string;
  purchaseDate: string;
  items: ParsedReceiptItem[];
  categoryId?: string;
  locationId?: string;
}

export function ReceiptReviewTable({
  open,
  onOpenChange,
  receipt,
  onConfirm,
  categories,
  locations,
}: ReceiptReviewTableProps) {
  const [storeName, setStoreName] = useState(receipt.storeName || '');
  const [purchaseDate, setPurchaseDate] = useState(
    receipt.purchaseDate || new Date().toISOString().split('T')[0]
  );
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [locationId, setLocationId] = useState<string | undefined>(undefined);
  const [items, setItems] = useState<(ParsedReceiptItem & { selected: boolean })[]>(
    receipt.items.map((item) => ({ ...item, selected: true }))
  );

  const updateItem = (index: number, field: keyof ParsedReceiptItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const toggleItem = (index: number) => {
    const newItems = [...items];
    newItems[index].selected = !newItems[index].selected;
    setItems(newItems);
  };

  const handleConfirm = () => {
    const selectedItems = items
      .filter((item) => item.selected)
      .map(({ selected, ...item }) => item);

    if (selectedItems.length === 0) {
      alert('Please select at least one item to import.');
      return;
    }

    onConfirm({
      storeName,
      purchaseDate,
      items: selectedItems,
      categoryId,
      locationId,
    });
  };

  const selectedCount = items.filter((i) => i.selected).length;
  const selectedTotal = items
    .filter((i) => i.selected)
    .reduce((sum, item) => sum + (item.lineTotal || (item.unitPrice || 0) * item.quantity), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review Receipt Items</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="store-name">Store Name</Label>
              <Input
                id="store-name"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="e.g., Home Depot"
              />
            </div>
            <div>
              <Label htmlFor="purchase-date">Purchase Date</Label>
              <Input
                id="purchase-date"
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="category">Category (Optional)</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="location">Location (Optional)</Label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger id="location">
                  <SelectValue placeholder="Select location..." />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-muted p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-sm text-muted-foreground">Selected Items:</span>
                <span className="ml-2 font-medium">
                  {selectedCount} of {items.length}
                </span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Total:</span>
                <span className="ml-2 font-medium">${selectedTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium w-12"></th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Item Name</th>
                    <th className="px-4 py-3 text-left text-sm font-medium w-24">Qty</th>
                    <th className="px-4 py-3 text-left text-sm font-medium w-32">Unit Price</th>
                    <th className="px-4 py-3 text-left text-sm font-medium w-32">Total</th>
                    <th className="px-4 py-3 text-left text-sm font-medium w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((item, index) => (
                    <tr key={index} className={!item.selected ? 'opacity-50' : ''}>
                      <td className="px-4 py-3">
                        <Checkbox
                          checked={item.selected}
                          onCheckedChange={() => toggleItem(index)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          className="min-w-[200px]"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(index, 'quantity', parseInt(e.target.value) || 1)
                          }
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unitPrice || ''}
                          onChange={(e) =>
                            updateItem(index, 'unitPrice', parseFloat(e.target.value) || undefined)
                          }
                          placeholder="$0.00"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.lineTotal || ''}
                          onChange={(e) =>
                            updateItem(index, 'lineTotal', parseFloat(e.target.value) || undefined)
                          }
                          placeholder="$0.00"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                          className="hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={selectedCount === 0}>
            Import {selectedCount} Item{selectedCount !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
