import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useRoles } from '@/contexts/RolesContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Navigation } from '@/components/Navigation';
import { UserCard } from '@/components/users/UserCard';
import { InviteUserDialog } from '@/components/users/InviteUserDialog';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function Users() {
  const navigate = useNavigate();
  const { user, listUsers } = useAuth();
  const { hasPermission, getUserRole } = useRoles();
  const { currentOrg } = useOrganization();
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!currentOrg) {
      navigate('/organizations');
      return;
    }

    if (!hasPermission('canManageUsers')) {
      navigate('/dashboard');
      return;
    }

    // Load users
    const allUsers = listUsers();
    setUsers(allUsers);
  }, [user, currentOrg, navigate, hasPermission, listUsers]);

  if (!user || !currentOrg) {
    return null;
  }

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
              <h1 className="text-3xl font-bold text-foreground">User Management</h1>
              <p className="text-muted-foreground mt-1">
                Manage users and their roles for {currentOrg.name}
              </p>
            </div>
            <InviteUserDialog />
          </div>
        </div>

        <div className="space-y-4">
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
        </div>
      </div>
    </div>
  );
}
