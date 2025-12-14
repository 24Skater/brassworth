import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useRoles } from '@/contexts/RolesContext';
import { Navigation } from '@/components/Navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { UserCard } from '@/components/users/UserCard';
import { InviteUserDialog } from '@/components/users/InviteUserDialog';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ArrowLeft, Save, Download, Upload, Shield } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { storage } from '@/lib/storage';

export default function Settings() {
  const navigate = useNavigate();
  const { user, listUsers } = useAuth();
  const { currentOrg, updateOrganization } = useOrganization();
  const { hasPermission, getUserRole } = useRoles();
  const [activeTab, setActiveTab] = useState('users');

  // Organization form state
  const [orgName, setOrgName] = useState('');
  const [orgType, setOrgType] = useState<'home' | 'church' | 'small_business' | 'other'>('home');
  const [orgAddress, setOrgAddress] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!currentOrg) {
      navigate('/organizations');
      return;
    }

    if (!hasPermission('canManageUsers') && !hasPermission('canManageOrganization')) {
      navigate('/dashboard');
      return;
    }

    // Initialize organization form
    if (currentOrg) {
      setOrgName(currentOrg.name);
      setOrgType(currentOrg.type);
      setOrgAddress(currentOrg.address || '');
    }
  }, [user, currentOrg, navigate, hasPermission]);

  const handleSaveOrganization = () => {
    if (!currentOrg) return;

    try {
      updateOrganization(currentOrg.id, {
        name: orgName,
        type: orgType,
        address: orgAddress,
      });
      toast.success('Organization settings updated');
    } catch (error) {
      toast.error('Failed to update organization');
    }
  };

  const handleExportData = () => {
    if (!currentOrg) return;

    try {
      const items = storage.getItems().filter((item) => item.organizationId === currentOrg.id);
      const locations = storage
        .getLocations()
        .filter((loc) => loc.organizationId === currentOrg.id);
      const categories = storage
        .getCategories()
        .filter((cat) => cat.organizationId === currentOrg.id);

      const workbook = XLSX.utils.book_new();

      // Export items
      const itemsData = items.map((item) => ({
        Name: item.name,
        Description: item.description || '',
        Category: categories.find((c) => c.id === item.categoryId)?.name || '',
        Location: locations.find((l) => l.id === item.locationId)?.name || '',
        Brand: item.brand || '',
        Model: item.model || '',
        'Serial Number': item.serialNumber || '',
        'Purchase Date': item.purchaseDate || '',
        'Purchase Price': item.purchasePrice || '',
        'Current Value': item.currentEstimatedValue || '',
        Condition: item.condition,
        Quantity: item.quantity,
        Notes: item.notes || '',
      }));

      const itemsSheet = XLSX.utils.json_to_sheet(itemsData);
      XLSX.utils.book_append_sheet(workbook, itemsSheet, 'Items');

      // Export locations
      const locationsData = locations.map((loc) => ({
        Name: loc.name,
        'Parent Location': locations.find((l) => l.id === loc.parentLocationId)?.name || '',
        Notes: loc.notes || '',
      }));
      const locationsSheet = XLSX.utils.json_to_sheet(locationsData);
      XLSX.utils.book_append_sheet(workbook, locationsSheet, 'Locations');

      // Export categories
      const categoriesData = categories.map((cat) => ({
        Name: cat.name,
        Description: cat.description || '',
      }));
      const categoriesSheet = XLSX.utils.json_to_sheet(categoriesData);
      XLSX.utils.book_append_sheet(workbook, categoriesSheet, 'Categories');

      // Download
      XLSX.writeFile(
        workbook,
        `${currentOrg.name}-inventory-${new Date().toISOString().split('T')[0]}.xlsx`
      );
      toast.success('Data exported successfully');
    } catch (error) {
      toast.error('Failed to export data');
    }
  };

  const handleClearData = () => {
    if (!currentOrg) return;
    if (!confirm('Are you sure you want to clear all data? This action cannot be undone.')) return;

    try {
      const items = storage.getItems().filter((item) => item.organizationId !== currentOrg.id);
      const locations = storage
        .getLocations()
        .filter((loc) => loc.organizationId !== currentOrg.id);
      const categories = storage
        .getCategories()
        .filter((cat) => cat.organizationId !== currentOrg.id);

      storage.setItems(items);
      storage.setLocations(locations);
      storage.setCategories(categories);

      toast.success('All data cleared');
    } catch (error) {
      toast.error('Failed to clear data');
    }
  };

  if (!user || !currentOrg) {
    return null;
  }

  const users = listUsers();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Settings</h1>
              <p className="text-muted-foreground mt-1">
                Manage settings and preferences for {currentOrg.name}
              </p>
            </div>
            <ThemeToggle />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="organization">Organization</TabsTrigger>
            <TabsTrigger value="data">Data</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>
                      Invite users and manage their roles and permissions
                    </CardDescription>
                  </div>
                  <InviteUserDialog />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {users.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">
                      No users found. Invite your first user to get started.
                    </p>
                  </div>
                ) : (
                  users.map((usr) => {
                    const role = getUserRole(usr.id, currentOrg.id);
                    return <UserCard key={usr.id} user={usr} userRole={role} />;
                  })
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Role Permissions</CardTitle>
                <CardDescription>Overview of what each role can do</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border-l-4 border-primary pl-4">
                    <h4 className="font-semibold text-foreground">Admin</h4>
                    <p className="text-sm text-muted-foreground">
                      Full control - manage users, delete items, edit all settings
                    </p>
                  </div>
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h4 className="font-semibold text-foreground">Manager</h4>
                    <p className="text-sm text-muted-foreground">
                      Edit access - add/edit/archive items, manage locations & categories
                    </p>
                  </div>
                  <div className="border-l-4 border-green-500 pl-4">
                    <h4 className="font-semibold text-foreground">Contributor</h4>
                    <p className="text-sm text-muted-foreground">
                      Add items only - create items and upload photos
                    </p>
                  </div>
                  <div className="border-l-4 border-gray-500 pl-4">
                    <h4 className="font-semibold text-foreground">Viewer</h4>
                    <p className="text-sm text-muted-foreground">
                      Read-only - view items and export data
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Organization Tab */}
          <TabsContent value="organization" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Organization Details</CardTitle>
                <CardDescription>Update your organization information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="orgName">Organization Name</Label>
                  <Input
                    id="orgName"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="My Organization"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orgType">Organization Type</Label>
                  <Select value={orgType} onValueChange={(val) => setOrgType(val as any)}>
                    <SelectTrigger id="orgType">
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
                <div className="space-y-2">
                  <Label htmlFor="orgAddress">Address (Optional)</Label>
                  <Textarea
                    id="orgAddress"
                    value={orgAddress}
                    onChange={(e) => setOrgAddress(e.target.value)}
                    placeholder="123 Main St, City, State ZIP"
                    rows={3}
                  />
                </div>
                <Button onClick={handleSaveOrganization}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data Tab */}
          <TabsContent value="data" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Export Data</CardTitle>
                <CardDescription>Download all your inventory data as an Excel file</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleExportData}>
                  <Download className="h-4 w-4 mr-2" />
                  Export to Excel
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Import Data</CardTitle>
                <CardDescription>Bulk import items from an Excel file</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate('/items')} variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Go to Import Page
                </Button>
              </CardContent>
            </Card>

            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>
                  Irreversible actions that will permanently delete data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="destructive" onClick={handleClearData}>
                  Clear All Data
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Security Preferences</CardTitle>
                <CardDescription>Configure security and authentication settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-4 p-4 border rounded-lg">
                  <Shield className="h-5 w-5 text-primary mt-1" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground mb-1">Authentication Provider</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Currently using localStorage authentication (prototype mode)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      For production deployments, configure a custom authentication provider. See{' '}
                      <code className="bg-muted px-1 py-0.5 rounded">docs/AUTH_PROVIDERS.md</code>{' '}
                      for details.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 border rounded-lg">
                  <Shield className="h-5 w-5 text-primary mt-1" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground mb-1">
                      Role-Based Access Control
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Roles are stored separately from user profiles for security. All permission
                      checks are enforced on both client and server (when using backend).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 border rounded-lg">
                  <Shield className="h-5 w-5 text-primary mt-1" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground mb-1">Data Storage</h4>
                    <p className="text-sm text-muted-foreground">
                      Data is currently stored locally in your browser. For production use with
                      multiple users, integrate with a backend database.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
