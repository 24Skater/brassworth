import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { useOrganization } from '@/contexts/OrganizationContext';
import { storage } from '@/lib/storage';
import { deriveStatus, isOverdue } from '@/lib/lifecycle';
import { ItemStatusBadge } from '@/components/items/ItemStatusBadge';
import { ItemValueSummary } from '@/components/items/ItemValueSummary';
import { ItemLifecycle } from '@/components/items/ItemLifecycle';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { Item, ItemEvent } from '@/types';
import { ArrowLeft, Pencil } from 'lucide-react';

/**
 * One item, built for acting on rather than editing. This is what a scanned
 * label opens, so checking a thing back in has to be reachable without
 * scrolling past a form.
 */
export default function ItemView() {
  const { id } = useParams();
  const { currentOrg } = useOrganization();
  const [item, setItem] = useState<Item | null>(null);
  const [events, setEvents] = useState<ItemEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    const [found, log] = await Promise.all([storage.getItem(id), storage.getItemEventsByItem(id)]);
    setItem(found);
    setEvents(log);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return null;

  if (!item) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <p className="text-muted-foreground">That item could not be found.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/items">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to items
            </Link>
          </Button>
        </main>
      </div>
    );
  }

  const subtitle = [item.brand, item.model].filter(Boolean).join(' ');

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        <div className="flex items-start justify-between gap-4" data-testid="item-header">
          <div>
            <h1 className="text-2xl font-semibold">{item.name}</h1>
            {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
            {item.serialNumber && (
              <p className="text-sm text-muted-foreground">Serial {item.serialNumber}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <ItemStatusBadge status={deriveStatus(events)} overdue={isOverdue(events)} />
            <Button asChild variant="outline">
              <Link to={`/items/${item.id}/edit`}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Link>
            </Button>
          </div>
        </div>

        {item.description && (
          <Card>
            <CardContent className="pt-6">
              <p>{item.description}</p>
            </CardContent>
          </Card>
        )}

        <ItemValueSummary itemId={item.id} />
        {currentOrg && <ItemLifecycle itemId={item.id} organizationId={currentOrg.id} />}
      </main>
    </div>
  );
}
