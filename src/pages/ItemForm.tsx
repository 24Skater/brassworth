import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useOrganization } from '@/contexts/OrganizationContext';
import { storage } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Item, ItemCondition, PurchaseSource } from '@/types';
import { ArrowLeft } from 'lucide-react';

export default function ItemForm() {
  const { id } = useParams();
  const { currentOrg } = useOrganization();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [formData, setFormData] = useState<Partial<Item>>({
    name: '',
    description: '',
    brand: '',
    model: '',
    serialNumber: '',
    purchaseDate: '',
    purchasePrice: undefined,
    currentEstimatedValue: undefined,
    purchaseLocation: undefined,
    purchaseSourceName: '',
    condition: 'GOOD',
    quantity: 1,
    notes: '',
    categoryId: undefined,
    locationId: undefined,
    tags: [],
  });

  const categories = storage.getCategories().filter(cat => cat.organizationId === currentOrg?.id);
  const locations = storage.getLocations().filter(loc => loc.organizationId === currentOrg?.id);

  useEffect(() => {
    if (isEditing && id) {
      const item = storage.getItems().find(i => i.id === id);
      if (item) setFormData(item);
    }
  }, [id, isEditing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg || !formData.name) return;

    const items = storage.getItems();
    
    if (isEditing && id) {
      const updated = items.map(item =>
        item.id === id ? { ...item, ...formData, updatedAt: new Date().toISOString() } : item
      );
      storage.setItems(updated);
    } else {
      const newItem: Item = {
        id: crypto.randomUUID(),
        organizationId: currentOrg.id,
        name: formData.name,
        description: formData.description,
        categoryId: formData.categoryId,
        locationId: formData.locationId,
        brand: formData.brand,
        model: formData.model,
        serialNumber: formData.serialNumber,
        purchaseDate: formData.purchaseDate,
        purchasePrice: formData.purchasePrice,
        currentEstimatedValue: formData.currentEstimatedValue,
        purchaseLocation: formData.purchaseLocation,
        purchaseSourceName: formData.purchaseSourceName,
        condition: formData.condition as ItemCondition,
        quantity: formData.quantity || 1,
        notes: formData.notes,
        isArchived: false,
        tags: formData.tags || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      storage.setItems([...items, newItem]);
    }

    navigate('/items');
  };

  if (!currentOrg) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>No Property Selected</CardTitle>
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
          <Button variant="ghost" onClick={() => navigate('/items')} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Items
          </Button>
          <h1 className="text-2xl font-bold text-foreground">{isEditing ? 'Edit Item' : 'Add New Item'}</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Item Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.categoryId} onValueChange={(value) => setFormData({ ...formData, categoryId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="location">Location</Label>
                  <Select value={formData.locationId} onValueChange={(value) => setFormData({ ...formData, locationId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map(loc => <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="brand">Brand</Label>
                  <Input id="brand" value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} />
                </div>

                <div>
                  <Label htmlFor="model">Model</Label>
                  <Input id="model" value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} />
                </div>
              </div>

              <div>
                <Label htmlFor="serialNumber">Serial Number</Label>
                <Input id="serialNumber" value={formData.serialNumber} onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="condition">Condition *</Label>
                  <Select value={formData.condition} onValueChange={(value) => setFormData({ ...formData, condition: value as ItemCondition })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NEW">New</SelectItem>
                      <SelectItem value="GOOD">Good</SelectItem>
                      <SelectItem value="FAIR">Fair</SelectItem>
                      <SelectItem value="POOR">Poor</SelectItem>
                      <SelectItem value="DAMAGED">Damaged</SelectItem>
                      <SelectItem value="DISPOSED">Disposed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input id="quantity" type="number" min="1" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="purchaseDate">Purchase Date</Label>
                  <Input id="purchaseDate" type="date" value={formData.purchaseDate} onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })} />
                </div>

                <div>
                  <Label htmlFor="purchasePrice">Purchase Price</Label>
                  <Input id="purchasePrice" type="number" step="0.01" min="0" value={formData.purchasePrice || ''} onChange={(e) => setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) || undefined })} />
                </div>
              </div>

              <div>
                <Label htmlFor="currentEstimatedValue">Current Estimated Value</Label>
                <Input id="currentEstimatedValue" type="number" step="0.01" min="0" value={formData.currentEstimatedValue || ''} onChange={(e) => setFormData({ ...formData, currentEstimatedValue: parseFloat(e.target.value) || undefined })} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="purchaseLocation">Purchase Source</Label>
                  <Select value={formData.purchaseLocation} onValueChange={(value) => setFormData({ ...formData, purchaseLocation: value as PurchaseSource })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STORE">Store</SelectItem>
                      <SelectItem value="ONLINE">Online</SelectItem>
                      <SelectItem value="DONATION">Donation</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="purchaseSourceName">Source Name</Label>
                  <Input id="purchaseSourceName" value={formData.purchaseSourceName} onChange={(e) => setFormData({ ...formData, purchaseSourceName: e.target.value })} placeholder="e.g., Best Buy, Amazon" />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate('/items')}>Cancel</Button>
                <Button type="submit">{isEditing ? 'Save Changes' : 'Create Item'}</Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </main>
    </div>
  );
}
