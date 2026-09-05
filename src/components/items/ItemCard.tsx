import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Item } from '@/types';
import { Archive, Trash2 } from 'lucide-react';

interface ItemCardProps {
  item: Item;
  categoryName: string;
  locationName: string;
  onView: () => void;
  onArchive: () => void;
  onDelete: () => void;
  selected?: boolean;
  onToggleSelect?: () => void;
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

export function ItemCard({
  item,
  categoryName,
  locationName,
  onView,
  onArchive,
  onDelete,
  selected,
  onToggleSelect,
}: ItemCardProps) {
  return (
    <Card
      className={`cursor-pointer hover:border-primary transition-colors group relative ${selected ? 'ring-2 ring-primary' : ''}`}
    >
      {onToggleSelect && (
        <div className="absolute top-3 left-3 z-10" onClick={(e) => e.stopPropagation()}>
          <Checkbox checked={selected} onCheckedChange={onToggleSelect} />
        </div>
      )}
      <div onClick={onView} className={onToggleSelect ? 'pl-6' : ''}>
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg">{item.name}</CardTitle>
            <Badge variant="outline" className={getConditionColor(item.condition)}>
              {item.condition}
            </Badge>
          </div>
          <CardDescription>{categoryName}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {item.brand && <p className="text-muted-foreground">Brand: {item.brand}</p>}
            <p className="text-muted-foreground">Location: {locationName}</p>
            {item.purchasePrice && (
              <p className="font-semibold">Value: ${item.purchasePrice.toFixed(2)}</p>
            )}
            {item.quantity > 1 && (
              <p className="text-muted-foreground">Quantity: {item.quantity}</p>
            )}
          </div>
        </CardContent>
      </div>
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            onArchive();
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
            onDelete();
          }}
          aria-label={`Delete ${item.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
