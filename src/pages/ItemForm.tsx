import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useOrganization } from '@/contexts/OrganizationContext';
import { storage } from '@/lib/storage';
import { ItemLifecycle } from '@/components/items/ItemLifecycle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Item, ItemCondition, PurchaseSource, Photo, Category, Location } from '@/types';
import { ArrowLeft, ImagePlus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ItemForm() {
  const { id } = useParams();
  const { currentOrg } = useOrganization();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEditing = !!id;
  const [photos, setPhotos] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

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

  const loadData = useCallback(async () => {
    if (!currentOrg) return;
    const [cats, locs] = await Promise.all([storage.getCategories(), storage.getLocations()]);
    setCategories(cats.filter((cat) => cat.organizationId === currentOrg.id));
    setLocations(locs.filter((loc) => loc.organizationId === currentOrg.id));
  }, [currentOrg]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const loadItem = async () => {
      if (isEditing && id) {
        const items = await storage.getItems();
        const item = items.find((i) => i.id === id);
        if (item) {
          setFormData(item);
          const allPhotos = await storage.getPhotos();
          const itemPhotos = allPhotos.filter((p) => p.itemId === item.id);
          setPhotos(itemPhotos.map((p) => p.fileUrl));
        }
      }
    };
    loadItem();
  }, [id, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg || !formData.name) return;

    const items = await storage.getItems();
    const itemId = isEditing && id ? id : crypto.randomUUID();

    if (isEditing && id) {
      const updated = items.map((item) =>
        item.id === id ? { ...item, ...formData, updatedAt: new Date().toISOString() } : item
      );
      await storage.setItems(updated);

      // Clear existing photos for this item
      const existingPhotos = await storage.getPhotos();
      await storage.setPhotos(existingPhotos.filter((p) => p.itemId !== id));
    } else {
      const newItem: Item = {
        id: itemId,
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
      await storage.setItems([...items, newItem]);
    }

    // Save photos
    const newPhotos: Photo[] = photos.map((photoUrl) => ({
      id: crypto.randomUUID(),
      itemId: itemId,
      fileUrl: photoUrl,
      takenAt: new Date().toISOString(),
    }));
    const existingPhotos = await storage.getPhotos();
    await storage.setPhotos([...existingPhotos, ...newPhotos]);

    navigate('/items');
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please select images under 5MB',
          variant: 'destructive',
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setPhotos((prev) => [...prev, dataUrl]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
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
          <h1 className="text-2xl font-bold text-foreground">
            {isEditing ? 'Edit Item' : 'Add New Item'}
          </h1>
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
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.categoryId}
                    onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="location">Location</Label>
                  <Select
                    value={formData.locationId}
                    onValueChange={(value) => setFormData({ ...formData, locationId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="brand">Brand</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="serialNumber">Serial Number</Label>
                <Input
                  id="serialNumber"
                  value={formData.serialNumber}
                  onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="condition">Condition *</Label>
                  <Select
                    value={formData.condition}
                    onValueChange={(value) =>
                      setFormData({ ...formData, condition: value as ItemCondition })
                    }
                  >
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
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="purchaseDate">Purchase Date</Label>
                  <Input
                    id="purchaseDate"
                    type="date"
                    value={formData.purchaseDate}
                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="purchasePrice">Purchase Price</Label>
                  <Input
                    id="purchasePrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.purchasePrice || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        purchasePrice: parseFloat(e.target.value) || undefined,
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="currentEstimatedValue">Current Estimated Value</Label>
                <Input
                  id="currentEstimatedValue"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.currentEstimatedValue || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      currentEstimatedValue: parseFloat(e.target.value) || undefined,
                    })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="purchaseLocation">Purchase Source</Label>
                  <Select
                    value={formData.purchaseLocation}
                    onValueChange={(value) =>
                      setFormData({ ...formData, purchaseLocation: value as PurchaseSource })
                    }
                  >
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
                  <Input
                    id="purchaseSourceName"
                    value={formData.purchaseSourceName}
                    onChange={(e) =>
                      setFormData({ ...formData, purchaseSourceName: e.target.value })
                    }
                    placeholder="e.g., Best Buy, Amazon"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div>
                <Label>Photos</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={photo}
                        alt={`Item ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border border-border"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors">
                    <ImagePlus className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">Add Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate('/items')}>
                  Cancel
                </Button>
                <Button type="submit">{isEditing ? 'Save Changes' : 'Create Item'}</Button>
              </div>
            </CardContent>
          </Card>
        </form>

        {/* History only exists once the item does. */}
        {isEditing && id && currentOrg && (
          <ItemLifecycle itemId={id} organizationId={currentOrg.id} />
        )}
      </main>
    </div>
  );
}
