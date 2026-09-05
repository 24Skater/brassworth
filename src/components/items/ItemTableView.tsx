import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Item } from '@/types';
import { Archive, Trash2 } from 'lucide-react';

interface ItemTableViewProps {
  items: Item[];
  getCategoryName: (categoryId?: string) => string;
  getLocationName: (locationId?: string) => string;
  onView: (item: Item) => void;
  onArchive: (item: Item) => void;
  onDelete: (item: Item) => void;
}

const getConditionColor = (condition: Item['condition']) => {
  switch (condition) {
    case 'NEW':
      return 'bg-green-500/10 text-green-500 border-green-500/20';
    case 'GOOD':
      return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    case 'FAIR':
      return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    case 'POOR':
      return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
    case 'DAMAGED':
      return 'bg-red-500/10 text-red-500 border-red-500/20';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export function ItemTableView({
  items,
  getCategoryName,
  getLocationName,
  onView,
  onArchive,
  onDelete,
}: ItemTableViewProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Brand</TableHead>
            <TableHead>Condition</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Value</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow
              key={item.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onView(item)}
            >
              <TableCell className="font-medium">{item.name}</TableCell>
              <TableCell>{getCategoryName(item.categoryId)}</TableCell>
              <TableCell>{getLocationName(item.locationId)}</TableCell>
              <TableCell>{item.brand || '-'}</TableCell>
              <TableCell>
                <Badge variant="outline" className={getConditionColor(item.condition)}>
                  {item.condition}
                </Badge>
              </TableCell>
              <TableCell>{item.quantity}</TableCell>
              <TableCell>
                {item.purchasePrice ? `$${item.purchasePrice.toFixed(2)}` : '-'}
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      onArchive(item);
                    }}
                    aria-label={item.isArchived ? `Restore ${item.name}` : `Archive ${item.name}`}
                  >
                    <Archive className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(item);
                    }}
                    aria-label={`Delete ${item.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
