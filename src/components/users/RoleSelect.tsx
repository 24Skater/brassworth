import { UserRole } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getRoleLabel, getRoleDescription } from '@/lib/auth/permissions';

interface RoleSelectProps {
  value: UserRole;
  onChange: (role: UserRole) => void;
  disabled?: boolean;
}

const ALL_ROLES: UserRole[] = ['ADMIN', 'MANAGER', 'VIEWER', 'CONTRIBUTOR'];

export function RoleSelect({ value, onChange, disabled }: RoleSelectProps) {
  return (
    <Select value={value} onValueChange={(val) => onChange(val as UserRole)} disabled={disabled}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ALL_ROLES.map((role) => (
          <SelectItem key={role} value={role}>
            <div className="flex flex-col">
              <span className="font-medium">{getRoleLabel(role)}</span>
              <span className="text-xs text-muted-foreground">{getRoleDescription(role)}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
