import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Organization } from '@/types';
import { Home, Church, Building2, FolderOpen, Pencil, Trash2 } from 'lucide-react';

export default function Organizations() {
  const { user } = useAuth();
  const { organizations, currentOrg, setCurrentOrg, createOrganization, updateOrganization, deleteOrganization } = useOrganization();
  const navigate = useNavigate();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [formData, setFormData] = useState({ name: '', type: 'home' as Organization['type'], address: '' });

  const handleCreate = () => {
    createOrganization(formData.name, formData.type, formData.address);
    setFormData({ name: '', type: 'home', address: '' });
    setIsCreateOpen(false);
  };

  const handleEdit = () => {
    if (editingOrg) {
      updateOrganization(editingOrg.id, { name: formData.name, type: formData.type, address: formData.address });
      setIsEditOpen(false);
      setEditingOrg(null);
      setFormData({ name: '', type: 'home', address: '' });
    }
  };

  const openEdit = (org: Organization) => {
    setEditingOrg(org);
    setFormData({ name: org.name, type: org.type, address: org.address || '' });
    setIsEditOpen(true);
  };

  const getOrgIcon = (type: Organization['type']) => {
    switch (type) {
      case 'home': return <Home className="h-5 w-5" />;
      case 'church': return <Church className="h-5 w-5" />;
      case 'small_business': return <Building2 className="h-5 w-5" />;
      default: return <FolderOpen className="h-5 w-5" />;
    }
  };

  const getOrgTypeLabel = (type: Organization['type']) => {
    switch (type) {
      case 'home': return 'Home';
      case 'church': return 'Church';
      case 'small_business': return 'Small Business';
      default: return 'Other';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Properties</h1>
          <p className="text-muted-foreground">Manage your homes, churches, and organizations</p>
        </div>

        <div className="flex justify-between items-center mb-6">
          <p className="text-muted-foreground">{organizations.length} {organizations.length === 1 ? 'property' : 'properties'}</p>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>Create Property</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Property</DialogTitle>
                <DialogDescription>Add a new home, church, or organization to track inventory.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="My Home" />
                </div>
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value as Organization['type'] })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="home">Home</SelectItem>
                      <SelectItem value="church">Church</SelectItem>
                      <SelectItem value="small_business">Small Business</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="address">Address (Optional)</Label>
                  <Input id="address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="123 Main St" />
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
          {organizations.map((org) => (
            <Card key={org.id} className={currentOrg?.id === org.id ? 'border-primary' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getOrgIcon(org.type)}
                    <div>
                      <CardTitle>{org.name}</CardTitle>
                      <CardDescription>{getOrgTypeLabel(org.type)}</CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(org)} aria-label={`Edit ${org.name}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteOrganization(org.id)} aria-label={`Delete ${org.name}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {org.address && <p className="text-sm text-muted-foreground mb-3">{org.address}</p>}
                <Button variant={currentOrg?.id === org.id ? 'secondary' : 'outline'} className="w-full" onClick={() => { setCurrentOrg(org); navigate('/dashboard'); }}>
                  {currentOrg?.id === org.id ? 'Current Property' : 'Switch to this property'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Property</DialogTitle>
              <DialogDescription>Update property details.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Name</Label>
                <Input id="edit-name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="edit-type">Type</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value as Organization['type'] })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="home">Home</SelectItem>
                    <SelectItem value="church">Church</SelectItem>
                    <SelectItem value="small_business">Small Business</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-address">Address (Optional)</Label>
                <Input id="edit-address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
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
