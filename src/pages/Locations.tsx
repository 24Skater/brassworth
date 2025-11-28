import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '@/contexts/OrganizationContext';
import { storage } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Location } from '@/types';
import { MapPin, Pencil, Trash2 } from 'lucide-react';

export default function Locations() {
  const { currentOrg } = useOrganization();
  const navigate = useNavigate();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [formData, setFormData] = useState({ name: '', notes: '' });

  const locations = storage.getLocations().filter(loc => loc.organizationId === currentOrg?.id);

  const handleCreate = () => {
    if (!currentOrg || !formData.name) return;
    const newLocation: Location = {
      id: crypto.randomUUID(),
      organizationId: currentOrg.id,
      name: formData.name,
      notes: formData.notes,
    };
    storage.setLocations([...storage.getLocations(), newLocation]);
    setFormData({ name: '', notes: '' });
    setIsCreateOpen(false);
  };

  const handleEdit = () => {
    if (!editingLocation) return;
    const updated = storage.getLocations().map(loc =>
      loc.id === editingLocation.id ? { ...loc, name: formData.name, notes: formData.notes } : loc
    );
    storage.setLocations(updated);
    setIsEditOpen(false);
    setEditingLocation(null);
    setFormData({ name: '', notes: '' });
  };

  const handleDelete = (id: string) => {
    storage.setLocations(storage.getLocations().filter(loc => loc.id !== id));
  };

  const openEdit = (location: Location) => {
    setEditingLocation(location);
    setFormData({ name: location.name, notes: location.notes || '' });
    setIsEditOpen(true);
  };

  const getItemCount = (locationId: string) => {
    return storage.getItems().filter(item => item.locationId === locationId && !item.isArchived).length;
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
          <h1 className="text-2xl font-bold text-foreground">Locations</h1>
          <p className="text-sm text-muted-foreground">{currentOrg.name}</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <p className="text-muted-foreground">{locations.length} {locations.length === 1 ? 'location' : 'locations'}</p>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>Add Location</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Location</DialogTitle>
                <DialogDescription>Create a new location for organizing items.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Location Name</Label>
                  <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Living Room, Basement" />
                </div>
                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea id="notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={!formData.name}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {locations.map((location) => (
            <Card key={location.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <CardTitle>{location.name}</CardTitle>
                      <CardDescription>{getItemCount(location.id)} items</CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(location)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(location.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {location.notes && (
                <CardContent>
                  <p className="text-sm text-muted-foreground">{location.notes}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Location</DialogTitle>
              <DialogDescription>Update location details.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Location Name</Label>
                <Input id="edit-name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="edit-notes">Notes (Optional)</Label>
                <Textarea id="edit-notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
              <Button onClick={handleEdit} disabled={!formData.name}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
