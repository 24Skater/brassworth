import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { storage } from '@/lib/storage';
import {
  costOfOwnership,
  currentValue,
  describeAge,
  resolveAcquisition,
  DEPRECIATION_LABELS,
} from '@/lib/valuation';
import type { Item, ItemEvent } from '@/types';
import { TrendingDown } from 'lucide-react';

const money = (value: number) =>
  value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Figure {
  label: string;
  value: string;
  hint?: string;
}

interface ItemValueSummaryProps {
  itemId: string;
}

export function ItemValueSummary({ itemId }: ItemValueSummaryProps) {
  const [item, setItem] = useState<Item | null>(null);
  const [events, setEvents] = useState<ItemEvent[]>([]);

  const load = useCallback(async () => {
    const [items, itemEvents] = await Promise.all([
      storage.getItems(),
      storage.getItemEventsByItem(itemId),
    ]);
    setItem(items.find((i) => i.id === itemId) ?? null);
    setEvents(itemEvents);
  }, [itemId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!item) return null;

  const acquisition = resolveAcquisition(item, events);
  const age = describeAge(acquisition.at);
  const value = currentValue(item, events);
  const cost = costOfOwnership(item, events);
  const method = item.depreciationMethod ?? 'NONE';

  const figures: Figure[] = [];

  if (age) {
    figures.push({ label: 'Owned for', value: age });
  }

  if (typeof acquisition.price === 'number') {
    figures.push({ label: 'Paid', value: money(acquisition.price) });
  }

  if (typeof value === 'number') {
    figures.push({
      label: 'Worth now',
      value: money(value),
      hint: method === 'NONE' ? undefined : DEPRECIATION_LABELS[method],
    });
  }

  if (cost.repairs > 0) {
    figures.push({ label: 'Repairs', value: money(cost.repairs) });
  }

  if (cost.total > 0) {
    figures.push({
      label: 'Cost of ownership',
      value: money(cost.net),
      hint: cost.perMonth !== undefined ? `${money(cost.perMonth)} per month` : undefined,
    });
  }

  // Nothing known about this item's money or age — say so rather than showing
  // a grid of zeroes, which would read as "worthless" instead of "unrecorded".
  if (figures.length === 0) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Value
          </CardTitle>
          <CardDescription>
            Add a purchase date and price to track what this is worth over time.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5" />
          Value
        </CardTitle>
        <CardDescription>
          What it cost, what it is worth, and how long you have had it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3" data-testid="value-summary">
          {figures.map((figure) => (
            <div key={figure.label}>
              <dt className="text-sm text-muted-foreground">{figure.label}</dt>
              <dd className="text-lg font-semibold tabular-nums">{figure.value}</dd>
              {figure.hint && <dd className="text-xs text-muted-foreground">{figure.hint}</dd>}
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
