import { useState } from 'react';
import { User, UserRole } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useRoles } from '@/contexts/RolesContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RoleSelect } from './RoleSelect';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { UserMinus, Mail, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { getRoleLabel } from '@/lib/auth/permissions';

interface UserCardProps {
  user: User;
  userRole: UserRole | null;
}

export function UserCard({ user, userRole }: UserCardProps) {
  const { removeUser, user: currentUser } = useAuth();
  const { setUserRole, hasPermission } = useRoles();
  const { currentOrg } = useOrganization();
  const [role, setRole] = useState<UserRole>(userRole || 'VIEWER');
  const [isUpdating, setIsUpdating] = useState(false);

  const canManage = hasPermission('canManageUsers');
  const isCurrentUser = currentUser?.id === user.id;

  const handleRoleChange = async (newRole: UserRole) => {
    if (!currentOrg) return;
    
    setIsUpdating(true);
    try {
      setUserRole(user.id, currentOrg.id, newRole);
      setRole(newRole);
      toast.success('User role updated');
    } catch (error) {
      toast.error('Failed to update role');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemove = async () => {
    if (!currentOrg) return;
    
    try {
      await removeUser(user.id, currentOrg.id);
      toast.success('User removed from organization');
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove user');
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-foreground truncate">{user.name}</h3>
              {isCurrentUser && (
                <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">You</span>
              )}
            </div>
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Mail className="h-3 w-3" />
                <span className="truncate">{user.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {canManage && !isCurrentUser ? (
              <>
                <div className="w-48">
                  <RoleSelect
                    value={role}
                    onChange={handleRoleChange}
                    disabled={isUpdating}
                  />
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="w-48">
                      <UserMinus className="h-4 w-4 mr-2" />
                      Remove User
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove User</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to remove {user.name} from this organization? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleRemove}>Remove</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            ) : (
              <div className="px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground text-sm font-medium">
                {getRoleLabel(role)}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
