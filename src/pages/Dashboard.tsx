import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { storage } from '@/lib/storage';
import { groupByItem, overdueItems } from '@/lib/lifecycle';
import type { ItemEvent } from '@/types';
import { Package, MapPin, FolderOpen } from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { DashboardSkeleton } from '@/components/common/Skeletons';
import { Item, Location, Category } from '@/types';

export default function Dashboard() {
  const { user, isLoading } = useAuth();
  const { currentOrg } = useOrganization();
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [itemEvents, setItemEvents] = useState<ItemEvent[]>([]);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    const loadData = async () => {
      if (!currentOrg) {
        setDataLoading(false);
        return;
      }

      setDataLoading(true);
      try {
        const [allItems, allLocations, allCategories, allEvents] = await Promise.all([
          storage.getItems(),
          storage.getLocations(),
          storage.getCategories(),
          storage.getItemEvents(),
        ]);

        setItems(allItems.filter((item) => item.organizationId === currentOrg.id));
        setLocations(allLocations.filter((loc) => loc.organizationId === currentOrg.id));
        setCategories(allCategories.filter((cat) => cat.organizationId === currentOrg.id));
        setItemEvents(allEvents.filter((e) => e.organizationId === currentOrg.id));
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setDataLoading(false);
      }
    };

    loadData();
  }, [currentOrg]);

  // Show loading skeleton while auth is loading or data is loading
  if (isLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <DashboardSkeleton />
        </main>
      </div>
    );
  }

  if (!user) return null;

  const overdue = overdueItems(groupByItem(itemEvents));
  const itemName = (itemId: string) => items.find((i) => i.id === itemId)?.name ?? 'Unknown item';

  const totalValue = items.reduce((sum, item) => sum + (item.purchasePrice || 0), 0);
  const estimatedValue = items.reduce(
    (sum, item) => sum + (item.currentEstimatedValue || item.purchasePrice || 0),
    0
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        {!currentOrg ? (
          <Card>
            <CardHeader>
              <CardTitle>Welcome to Brassworth</CardTitle>
              <CardDescription>Create your first property to get started</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/organizations')}>Create Property</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Items</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{items.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Purchase Value</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${totalValue.toFixed(2)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Estimated Value</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${estimatedValue.toFixed(2)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Locations</CardTitle>
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{locations.length}</div>
                </CardContent>
              </Card>
            </div>

            {overdue.length > 0 && (
              <Card className="border-destructive" data-testid="overdue-card">
                <CardHeader>
                  <CardTitle className="text-destructive">
                    {overdue.length} item{overdue.length === 1 ? '' : 's'} overdue
                  </CardTitle>
                  <CardDescription>Lent out and past the date they were due back.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {overdue.map((entry) => (
                      <li
                        key={entry.itemId}
                        className="flex flex-wrap items-baseline gap-x-2 text-sm"
                      >
                        <button
                          type="button"
                          className="font-medium underline underline-offset-2 hover:text-primary"
                          onClick={() => navigate(`/items/${entry.itemId}`)}
                        >
                          {itemName(entry.itemId)}
                        </button>
                        {entry.holder && <span>with {entry.holder}</span>}
                        <span className="text-muted-foreground">
                          due {new Date(entry.expectedBackOn).toLocaleDateString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => navigate('/items')}
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Manage Items
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => navigate('/locations')}
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    Manage Locations
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => navigate('/categories')}
                  >
                    <FolderOpen className="h-4 w-4 mr-2" />
                    Manage Categories
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest items added</CardDescription>
                </CardHeader>
                <CardContent>
                  {items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No items yet. Add your first item to get started!
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {items.slice(0, 5).map((item) => (
                        <div key={item.id} className="flex justify-between items-center">
                          <span className="text-sm">{item.name}</span>
                          <span className="text-sm text-muted-foreground">
                            ${item.purchasePrice?.toFixed(2) || '0.00'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
