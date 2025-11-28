import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '@/contexts/OrganizationContext';
import { storage } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Item } from '@/types';
import { Search, Plus, Package } from 'lucide-react';

export default function Items() {
  const { currentOrg } = useOrganization();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterLocation, setFilterLocation] = useState<string>('all');
  const [filterCondition, setFilterCondition] = useState<string>('all');

  const items = storage.getItems().filter(item => item.organizationId === currentOrg?.id && !item.isArchived);
  const categories = storage.getCategories().filter(cat => cat.organizationId === currentOrg?.id);
  const locations = storage.getLocations().filter(loc => loc.organizationId === currentOrg?.id);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.model?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = filterCategory === 'all' || item.categoryId === filterCategory;
      const matchesLocation = filterLocation === 'all' || item.locationId === filterLocation;
      const matchesCondition = filterCondition === 'all' || item.condition === filterCondition;
      return matchesSearch && matchesCategory && matchesLocation && matchesCondition;
    });
  }, [items, searchQuery, filterCategory, filterLocation, filterCondition]);

  const getCategoryName = (categoryId?: string) => {
    return categories.find(c => c.id === categoryId)?.name || 'Uncategorized';
  };

  const getLocationName = (locationId?: string) => {
    return locations.find(l => l.id === locationId)?.name || 'No location';
  };

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
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-foreground">Inventory Items</h1>
          <p className="text-sm text-muted-foreground">{currentOrg.name}</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">{filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}</p>
            <Button onClick={() => navigate('/items/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search items..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterLocation} onValueChange={setFilterLocation}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map(loc => <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterCondition} onValueChange={setFilterCondition}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Conditions</SelectItem>
                <SelectItem value="NEW">New</SelectItem>
                <SelectItem value="GOOD">Good</SelectItem>
                <SelectItem value="FAIR">Fair</SelectItem>
                <SelectItem value="POOR">Poor</SelectItem>
                <SelectItem value="DAMAGED">Damaged</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No items found</p>
              <Button onClick={() => navigate('/items/new')}>Add your first item</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item) => (
              <Card key={item.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => navigate(`/items/${item.id}`)}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                    <Badge variant="outline" className={getConditionColor(item.condition)}>{item.condition}</Badge>
                  </div>
                  <CardDescription>{getCategoryName(item.categoryId)}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {item.brand && <p className="text-muted-foreground">Brand: {item.brand}</p>}
                    <p className="text-muted-foreground">Location: {getLocationName(item.locationId)}</p>
                    {item.purchasePrice && <p className="font-semibold">Value: ${item.purchasePrice.toFixed(2)}</p>}
                    {item.quantity > 1 && <p className="text-muted-foreground">Quantity: {item.quantity}</p>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
