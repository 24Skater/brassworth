import { useState } from 'react';
import { UserRole } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RoleSelect } from './RoleSelect';
import { UserPlus } from 'lucide-react';
import { toast } from 'sonner';

export function InviteUserDialog() {
  const { inviteUser } = useAuth();
  const { currentOrg } = useOrganization();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('VIEWER');
  const [isLoading, setIsLoading] = useState(false);

  const handleInvite = async () => {
    if (!currentOrg) return;

    setIsLoading(true);
    try {
      await inviteUser(email, name, currentOrg.id, role);
      toast.success('User invited successfully');
      setOpen(false);
      setEmail('');
      setName('');
      setRole('VIEWER');
    } catch (error: any) {
      toast.error(error.message || 'Failed to invite user');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite User
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite User</DialogTitle>
          <DialogDescription>
            Add a new user to {currentOrg?.name}. They will receive access based on their assigned role.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <RoleSelect value={role} onChange={setRole} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleInvite} disabled={isLoading || !email || !name}>
            {isLoading ? 'Inviting...' : 'Invite User'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
