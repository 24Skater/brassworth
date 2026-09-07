import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useOrganization } from '@/contexts/OrganizationContext';
import { storage } from '@/lib/storage';
import { GearProfilePicker } from '@/components/gear/GearProfilePicker';
import { GearProfilePanel } from '@/components/gear/GearProfilePanel';
import { DataPlateScanner } from '@/components/gear/DataPlateScanner';
import { applyProfile, profileLabel } from '@/lib/gear';
import { brandsFrom } from '@/lib/gear/dataPlate';
import { availableProfiles, fetchVendorCatalogue } from '@/lib/gear/resolve';
import type { GearProfile } from '@/types';
import type { DataPlateReading } from '@/lib/gear/dataPlate';
import { DEPRECIATION_LABELS } from '@/lib/valuation';
import type { DepreciationMethod } from '@/types';
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
  const [gearProfiles, setGearProfiles] = useState<GearProfile[]>([]);

  const [formData, setFormData] = useState<Partial<Item>>({
    name: '',
    description: '',
    brand: '',
    model: '',
    serialNumber: '',
    purchaseDate: '',
    purchasePrice: undefined,
    currentEstimatedValue: undefined,
    depreciationMethod: 'NONE',
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
    const [cats, locs, stored, vendor] = await Promise.all([
      storage.getCategories(),
      storage.getLocations(),
      storage.getGearProfiles(),
      // A vendor catalogue is optional and resolves to an empty list when the
      // server has none configured, so this never blocks the form.
      fetchVendorCatalogue(),
    ]);
    setCategories(cats.filter((cat) => cat.organizationId === currentOrg.id));
    setLocations(locs.filter((loc) => loc.organizationId === currentOrg.id));
    setGearProfiles(
      availableProfiles(
        stored.filter((profile) => profile.organizationId === currentOrg.id),
        vendor
      )
    );
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

  const selectedProfile = useMemo(
    () => gearProfiles.find((profile) => profile.id === formData.gearProfileId) ?? null,
    [gearProfiles, formData.gearProfileId]
  );

  const knownBrands = useMemo(() => brandsFrom(gearProfiles), [gearProfiles]);

  /**
   * Linking a profile fills what the form has left blank and nothing else.
   *
   * `applyProfile` never overwrites a value already typed — somebody who wrote
   * `DEWALT (used)` in the brand box meant it, and a catalogue tidying it to
   * `DeWalt` would be the app arguing with its user.
   */
  const handleSelectProfile = (profile: GearProfile) => {
    setFormData((current) => applyProfile(current as Item, profile));
    toast({
      title: 'Gear profile linked',
      description: `${profileLabel(profile)} — specifications come from the profile.`,
    });
  };

  /**
   * A data plate read fills blank fields only, for the same reason, and because
   * OCR on scratched metal is not reliable enough to overwrite anything.
   */
  const handleDataPlate = (reading: DataPlateReading) => {
    const filled: Partial<Item> = {};
    if (reading.brand && !formData.brand?.trim()) filled.brand = reading.brand;
    if (reading.model && !formData.model?.trim()) filled.model = reading.model;
    if (reading.serialNumber && !formData.serialNumber?.trim()) {
      filled.serialNumber = reading.serialNumber;
    }

    if (Object.keys(filled).length === 0) {
      toast({
        title: 'Nothing new on that plate',
        description: 'Everything it could fill in is already filled in.',
      });
      return;
    }

    setFormData((current) => ({ ...current, ...filled }));
    toast({
      title: 'Data plate read',
      description: `Filled in ${Object.keys(filled).join(', ')}. Check it before saving.`,
    });
  };

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
        gearProfileId: formData.gearProfileId,
        purchaseDate: formData.purchaseDate,
        purchasePrice: formData.purchasePrice,
        currentEstimatedValue: formData.currentEstimatedValue,
        depreciationMethod: formData.depreciationMethod,
        usefulLifeMonths: formData.usefulLifeMonths,
        declineRatePerYear: formData.declineRatePerYear,
        salvageValue: formData.salvageValue,
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

    // Editing returns to the item's own page, since that is where the edit
    // was launched from and where its history and value now live. Creating
    // still lands on the list — there is no single item to return to yet.
    navigate(isEditing ? `/items/${itemId}` : '/items');
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

              <div className="space-y-4 rounded-md border border-border p-4">
                <div>
                  <Label htmlFor="depreciationMethod">How should value be estimated?</Label>
                  <Select
                    value={formData.depreciationMethod ?? 'NONE'}
                    onValueChange={(v) =>
                      setFormData({ ...formData, depreciationMethod: v as DepreciationMethod })
                    }
                  >
                    <SelectTrigger id="depreciationMethod">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(DEPRECIATION_LABELS) as DepreciationMethod[]).map((method) => (
                        <SelectItem key={method} value={method}>
                          {DEPRECIATION_LABELS[method]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-1">
                    Straight line loses the same amount each month. Declining balance loses a share
                    of what is left each year, which is closer to how tools and electronics behave.
                  </p>
                </div>

                {formData.depreciationMethod === 'STRAIGHT_LINE' && (
                  <div>
                    <Label htmlFor="usefulLifeMonths">Useful life (months)</Label>
                    <Input
                      id="usefulLifeMonths"
                      type="number"
                      min="1"
                      step="1"
                      value={formData.usefulLifeMonths || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          usefulLifeMonths: parseInt(e.target.value, 10) || undefined,
                        })
                      }
                    />
                  </div>
                )}

                {formData.depreciationMethod === 'DECLINING_BALANCE' && (
                  <div>
                    <Label htmlFor="declineRatePerYear">Value lost per year (%)</Label>
                    <Input
                      id="declineRatePerYear"
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={
                        formData.declineRatePerYear !== undefined
                          ? Math.round(formData.declineRatePerYear * 100)
                          : ''
                      }
                      onChange={(e) => {
                        const percent = parseFloat(e.target.value);
                        setFormData({
                          ...formData,
                          declineRatePerYear: Number.isFinite(percent) ? percent / 100 : undefined,
                        });
                      }}
                    />
                  </div>
                )}

                {(formData.depreciationMethod === 'STRAIGHT_LINE' ||
                  formData.depreciationMethod === 'DECLINING_BALANCE') && (
                  <div>
                    <Label htmlFor="salvageValue">Value it never drops below</Label>
                    <Input
                      id="salvageValue"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.salvageValue || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          salvageValue: parseFloat(e.target.value) || undefined,
                        })
                      }
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.categoryId}
                    onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                  >
                    <SelectTrigger id="category">
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
                    <SelectTrigger id="location">
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

              <GearProfilePicker
                profiles={gearProfiles}
                selected={selectedProfile}
                onSelect={handleSelectProfile}
                onClear={() => setFormData({ ...formData, gearProfileId: undefined })}
              />

              <DataPlateScanner knownBrands={knownBrands} onRead={handleDataPlate} />

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
                    <SelectTrigger id="condition">
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
                    <SelectTrigger id="purchaseLocation">
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(isEditing && id ? `/items/${id}` : '/items')}
                >
                  Cancel
                </Button>
                <Button type="submit">{isEditing ? 'Save Changes' : 'Create Item'}</Button>
              </div>
            </CardContent>
          </Card>
        </form>

        {/* What is known about the model, shared by every item that is one. */}
        {selectedProfile && <GearProfilePanel profile={selectedProfile} />}
      </main>
    </div>
  );
}
