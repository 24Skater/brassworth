import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { useOrganization } from '@/contexts/OrganizationContext';
import { storage } from '@/lib/storage';
import { itemUrl } from '@/lib/labels/itemUrl';
import { qrSvg } from '@/lib/labels/qr';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Item } from '@/types';
import { Printer } from 'lucide-react';

/**
 * A sheet of QR labels to stick on gear.
 *
 * Printing goes through the browser's own print dialog against a print
 * stylesheet, rather than through a PDF library. A label is a page of squares
 * and text; a dependency that renders one would be 400 KB to avoid writing a
 * grid.
 */
export default function Labels() {
  const { currentOrg } = useOrganization();
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [codes, setCodes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!currentOrg) return;
    const all = await storage.getItems();
    setItems(all.filter((item) => item.organizationId === currentOrg.id && !item.isArchived));
  }, [currentOrg]);

  useEffect(() => {
    void load();
  }, [load]);

  // Encode only what has been chosen, and only once per item.
  useEffect(() => {
    let cancelled = false;
    const missing = [...chosen].filter((id) => !codes[id]);
    if (missing.length === 0) return;

    void (async () => {
      const origin = window.location.origin;
      const rendered = await Promise.all(
        missing.map(async (id) => [id, await qrSvg(itemUrl(id, origin))] as const)
      );
      if (cancelled) return;
      setCodes((current) => ({ ...current, ...Object.fromEntries(rendered) }));
    })();

    return () => {
      cancelled = true;
    };
  }, [chosen, codes]);

  const toggle = (id: string) => {
    setChosen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selected = items.filter((item) => chosen.has(item.id));

  // Without a property there is nothing to read, and the empty-list wording
  // below would tell somebody to add an item when what they actually need is
  // to pick a property. Same guard the other pages use.
  if (!currentOrg) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>No Property Selected</CardTitle>
            <CardDescription>Please select or create a property first</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/organizations')}>Go to Properties</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="print:hidden">
        <Navigation />
      </div>

      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between print:hidden">
          <h1 className="text-2xl font-semibold">Labels</h1>
          <Button onClick={() => window.print()} disabled={selected.length === 0}>
            <Printer className="h-4 w-4 mr-2" />
            Print {selected.length > 0 ? `${selected.length} labels` : 'labels'}
          </Button>
        </div>

        <Card className="print:hidden">
          <CardHeader>
            <CardTitle>Choose what to label</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {items.length === 0 && (
              <p className="text-muted-foreground">
                Nothing to label yet. Add an item first and it will appear here.
              </p>
            )}
            {items.map((item) => (
              <label key={item.id} className="flex items-center gap-3">
                <Checkbox
                  id={`label-${item.id}`}
                  aria-label={item.name}
                  checked={chosen.has(item.id)}
                  onCheckedChange={() => toggle(item.id)}
                />
                <span>{item.name}</span>
              </label>
            ))}
          </CardContent>
        </Card>

        <div
          data-testid="label-sheet"
          className="grid grid-cols-2 sm:grid-cols-3 gap-4 print:grid-cols-3"
        >
          {selected.map((item) => (
            <div
              key={item.id}
              className="border border-border rounded-lg p-3 flex flex-col items-center gap-2 break-inside-avoid"
            >
              {codes[item.id] ? (
                <div
                  className="w-24 h-24 [&>svg]:w-full [&>svg]:h-full"
                  // The QR encoder emits an <svg> of <path> data derived from
                  // the bit matrix; it never echoes the payload it encoded, so
                  // there is no route from an item's fields into this markup.
                  // That, rather than "the input is ours", is what makes it
                  // safe — the input being ours is true today and is exactly
                  // the kind of thing a later feature quietly changes.
                  dangerouslySetInnerHTML={{ __html: codes[item.id] as string }}
                />
              ) : (
                <div className="w-24 h-24 bg-muted animate-pulse rounded" />
              )}
              <span className="text-xs text-center font-medium">{item.name}</span>
              {item.serialNumber && (
                <span className="text-[10px] text-muted-foreground">{item.serialNumber}</span>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
