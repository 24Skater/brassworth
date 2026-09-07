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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    try {
      const [found, log] = await Promise.all([
        storage.getItem(id),
        storage.getItemEventsByItem(id),
      ]);
      setItem(found);
      setEvents(log);
    } catch {
      // In server mode this is the offline-with-nothing-cached case, which is
      // the exact situation this release exists for. Swallowing it left the
      // page rendering null: no navigation, no message, a white screen.
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return null;

  // Without a property the lifecycle actions below render nothing, so the page
  // would show an item you cannot act on and never say why. Every other page
  // asks for a property instead.
  if (!currentOrg) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>No Property Selected</CardTitle>
            <CardDescription>Please select or create a property first</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/organizations">Go to Properties</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (failed) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <p className="text-muted-foreground">
            This item could not be loaded. If you are offline, it has not been opened on this device
            before; reconnect and try again.
          </p>
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

  // An id is printed on a sticker and passed around, so one from another
  // property is a normal thing to arrive with. Reading it here would let
  // ItemLifecycle write events tagged with the property that happens to be
  // selected rather than the one that owns the item.
  if (!item || item.organizationId !== currentOrg.id) {
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
        <ItemLifecycle itemId={item.id} organizationId={currentOrg.id} />
      </main>
    </div>
  );
}
