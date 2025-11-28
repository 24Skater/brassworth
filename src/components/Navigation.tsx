import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Button } from '@/components/ui/button';
import { Home, Package, MapPin, FolderOpen, Building2, LogOut } from 'lucide-react';
import { NavLink } from './NavLink';

export function Navigation() {
  const { logout } = useAuth();
  const { currentOrg } = useOrganization();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="border-b border-border bg-card sticky top-0 z-10">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">Home Inventory</h1>
            {currentOrg && (
              <p className="text-sm text-muted-foreground">{currentOrg.name}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/organizations')}>
              <Building2 className="h-4 w-4 mr-2" />
              Switch Property
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
        <nav className="flex gap-1">
          <NavLink to="/dashboard" icon={Home}>Dashboard</NavLink>
          <NavLink to="/items" icon={Package}>Items</NavLink>
          <NavLink to="/categories" icon={FolderOpen}>Categories</NavLink>
          <NavLink to="/locations" icon={MapPin}>Locations</NavLink>
        </nav>
      </div>
    </header>
  );
}
