import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Item } from '@/types';
import { Archive, Trash2 } from 'lucide-react';

interface ItemListViewProps {
  item: Item;
  categoryName: string;
  locationName: string;
  onView: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

const getConditionColor = (condition: Item['condition']) => {
  switch (condition) {
    case 'NEW': return 'bg-green-500/10 text-green-500 border-green-500/20';
    case 'GOOD': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    case 'FAIR': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    case 'POOR': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
    case 'DAMAGED': return 'bg-red-500/10 text-red-500 border-red-500/20';
    default: return 'bg-muted text-muted-foreground';
  }
};

export function ItemListView({ item, categoryName, locationName, onView, onArchive, onDelete }: ItemListViewProps) {
  return (
    <div
      className="flex items-center gap-4 p-4 border rounded-lg hover:border-primary transition-colors cursor-pointer group"
      onClick={onView}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold truncate">{item.name}</h3>
          <Badge variant="outline" className={getConditionColor(item.condition)}>
            {item.condition}
          </Badge>
        </div>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>{categoryName}</span>
          <span>{locationName}</span>
          {item.brand && <span>{item.brand}</span>}
          {item.purchasePrice && <span className="font-semibold text-foreground">${item.purchasePrice.toFixed(2)}</span>}
        </div>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            onArchive();
          }}
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
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
