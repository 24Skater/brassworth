import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Breakdown } from '@/lib/reporting';

const money = (value: number) =>
  value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface BreakdownListProps {
  rows: Breakdown[];
  emptyMessage: string;
}

function BreakdownList({ rows, emptyMessage }: BreakdownListProps) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  // Bars are relative to the largest group, so the shape of the collection is
  // readable without reading every number.
  const largest = Math.max(...rows.map((row) => row.currentTotal), 0);

  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.key} className="space-y-1">
          <div className="flex items-baseline justify-between gap-4 text-sm">
            <span className="font-medium truncate">{row.key}</span>
            <span className="tabular-nums whitespace-nowrap">
              {money(row.currentTotal)}
              <span className="text-muted-foreground">
                {' '}
                · {row.count} item{row.count === 1 ? '' : 's'}
              </span>
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-primary"
              style={{ width: largest > 0 ? `${(row.currentTotal / largest) * 100}%` : '0%' }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

interface ValueBreakdownProps {
  byCategory: Breakdown[];
  byLocation: Breakdown[];
  byBrand: Breakdown[];
}

export function ValueBreakdown({ byCategory, byLocation, byBrand }: ValueBreakdownProps) {
  return (
    <Card data-testid="value-breakdown">
      <CardHeader>
        <CardTitle>Where the value is</CardTitle>
        <CardDescription>
          Estimated current value of everything you still hold. Sold and lost items are excluded.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="category">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="category">Category</TabsTrigger>
            <TabsTrigger value="location">Location</TabsTrigger>
            <TabsTrigger value="brand">Brand</TabsTrigger>
          </TabsList>

          <TabsContent value="category" className="mt-4">
            <BreakdownList rows={byCategory} emptyMessage="No items yet." />
          </TabsContent>
          <TabsContent value="location" className="mt-4">
            <BreakdownList rows={byLocation} emptyMessage="No items yet." />
          </TabsContent>
          <TabsContent value="brand" className="mt-4">
            <BreakdownList
              rows={byBrand}
              emptyMessage="Add a brand to an item to see it broken down here."
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
