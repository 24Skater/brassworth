import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { usePermission } from '@/contexts/RolesContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Home, Package, MapPin, FolderOpen, Building2, LogOut, Settings as SettingsIcon, Menu, LucideIcon } from 'lucide-react';
import { NavLink } from './NavLink';
import { cn } from '@/lib/utils';

interface MobileNavLinkProps {
  to: string;
  icon: LucideIcon;
  children: React.ReactNode;
  onClick?: () => void;
}

function MobileNavLink({ to, icon: Icon, children, onClick }: MobileNavLinkProps) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-accent"
      )}
    >
      <Icon className="h-5 w-5" />
      {children}
    </Link>
  );
}

export function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { logout } = useAuth();
  const { currentOrg } = useOrganization();
  const canManageUsers = usePermission('canManageUsers');
  const canManageOrg = usePermission('canManageOrganization');
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header className="border-b border-border bg-card sticky top-0 z-10">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-3 md:mb-3">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="md:hidden"
                  aria-label="Open navigation menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72">
                <SheetHeader className="text-left">
                  <SheetTitle>Home Inventory</SheetTitle>
                  {currentOrg && (
                    <p className="text-sm text-muted-foreground">{currentOrg.name}</p>
                  )}
                </SheetHeader>
                <nav className="flex flex-col gap-1 mt-6">
                  <MobileNavLink to="/dashboard" icon={Home} onClick={closeMobileMenu}>
                    Dashboard
                  </MobileNavLink>
                  <MobileNavLink to="/items" icon={Package} onClick={closeMobileMenu}>
                    Items
                  </MobileNavLink>
                  <MobileNavLink to="/categories" icon={FolderOpen} onClick={closeMobileMenu}>
                    Categories
                  </MobileNavLink>
                  <MobileNavLink to="/locations" icon={MapPin} onClick={closeMobileMenu}>
                    Locations
                  </MobileNavLink>
                  {(canManageUsers || canManageOrg) && (
                    <MobileNavLink to="/settings" icon={SettingsIcon} onClick={closeMobileMenu}>
                      Settings
                    </MobileNavLink>
                  )}
                  <hr className="my-4 border-border" />
                  <MobileNavLink to="/organizations" icon={Building2} onClick={closeMobileMenu}>
                    Switch Property
                  </MobileNavLink>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors text-left"
                  >
                    <LogOut className="h-5 w-5" />
                    Logout
                  </button>
                </nav>
              </SheetContent>
            </Sheet>
            
            <div>
              <h1 className="text-xl font-bold text-foreground">Home Inventory</h1>
              {currentOrg && (
                <p className="text-sm text-muted-foreground hidden sm:block">{currentOrg.name}</p>
              )}
            </div>
          </div>
          
          {/* Desktop header buttons */}
          <div className="hidden md:flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/organizations')}
              aria-label="Switch property"
            >
              <Building2 className="h-4 w-4 mr-2" />
              Switch Property
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout}
              aria-label="Log out"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
          
          {/* Mobile logout button (visible when menu is closed) */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleLogout}
            className="md:hidden"
            aria-label="Log out"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Desktop navigation */}
        <nav className="hidden md:flex gap-1">
          <NavLink to="/dashboard" icon={Home}>Dashboard</NavLink>
          <NavLink to="/items" icon={Package}>Items</NavLink>
          <NavLink to="/categories" icon={FolderOpen}>Categories</NavLink>
          <NavLink to="/locations" icon={MapPin}>Locations</NavLink>
          {(canManageUsers || canManageOrg) && <NavLink to="/settings" icon={SettingsIcon}>Settings</NavLink>}
        </nav>
      </div>
    </header>
  );
}
