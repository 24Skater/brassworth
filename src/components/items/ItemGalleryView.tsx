import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Item, Photo } from '@/types';
import { Archive, Trash2, Package } from 'lucide-react';
import { storage } from '@/lib/storage';

interface ItemGalleryViewProps {
  item: Item;
  categoryName: string;
  locationName: string;
  onView: () => void;
  onArchive: () => void;
  onDelete: () => void;
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

export function ItemGalleryView({
  item,
  categoryName,
  locationName,
  onView,
  onArchive,
  onDelete,
}: ItemGalleryViewProps) {
  const [firstPhoto, setFirstPhoto] = useState<string | undefined>(undefined);

  useEffect(() => {
    const loadPhoto = async () => {
      const photos = await storage.getPhotos();
      const itemPhotos = photos.filter((p) => p.itemId === item.id);
      setFirstPhoto(itemPhotos[0]?.fileUrl);
    };
    loadPhoto();
  }, [item.id]);

  return (
    <div className="group cursor-pointer" onClick={onView}>
      <div className="relative aspect-square rounded-lg overflow-hidden bg-muted mb-2">
        {firstPhoto ? (
          <img src={firstPhoto} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="icon"
            variant="secondary"
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
            variant="secondary"
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
        <Badge
          variant="outline"
          className={`absolute bottom-2 right-2 ${getConditionColor(item.condition)}`}
        >
          {item.condition}
        </Badge>
      </div>
      <div className="space-y-1">
        <h3 className="font-semibold truncate">{item.name}</h3>
        <p className="text-sm text-muted-foreground truncate">{categoryName}</p>
        {item.purchasePrice && (
          <p className="text-sm font-semibold">${item.purchasePrice.toFixed(2)}</p>
        )}
      </div>
    </div>
  );
}
