import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserRole } from '@/types';
import { createRoleProvider } from '@/lib/auth';
import { Permission, hasPermission as checkPermission } from '@/lib/auth/permissions';
import { useOrganization } from './OrganizationContext';
import { useAuth } from './AuthContext';

interface RolesContextType {
  userRole: UserRole | null;
  hasPermission: (permission: Permission) => boolean;
  getUserRole: (userId: string, organizationId: string) => UserRole | null;
  setUserRole: (userId: string, organizationId: string, role: UserRole) => void;
  removeUserRole: (userId: string, organizationId: string) => void;
  getUserRolesInOrg: (organizationId: string) => Array<{ userId: string; role: UserRole }>;
}

const RolesContext = createContext<RolesContextType | undefined>(undefined);

export function RolesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { currentOrg } = useOrganization();
  const [userRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const roleProvider = createRoleProvider();

  useEffect(() => {
    if (user && currentOrg) {
      const role = roleProvider.getUserRole(user.id, currentOrg.id);
      setCurrentUserRole(role);
    } else {
      setCurrentUserRole(null);
    }
  }, [user, currentOrg]);

  const hasPermission = (permission: Permission): boolean => {
    return checkPermission(userRole, permission);
  };

  const getUserRole = (userId: string, organizationId: string): UserRole | null => {
    return roleProvider.getUserRole(userId, organizationId);
  };

  const setUserRole = (userId: string, organizationId: string, role: UserRole): void => {
    roleProvider.setUserRole(userId, organizationId, role);
    // Update current user role if it's the current user
    if (user && userId === user.id && currentOrg && organizationId === currentOrg.id) {
      setCurrentUserRole(role);
    }
  };

  const removeUserRole = (userId: string, organizationId: string): void => {
    roleProvider.removeUserRole(userId, organizationId);
    // Clear current user role if it's the current user
    if (user && userId === user.id && currentOrg && organizationId === currentOrg.id) {
      setCurrentUserRole(null);
    }
  };

  const getUserRolesInOrg = (organizationId: string): Array<{ userId: string; role: UserRole }> => {
    return roleProvider.getUserRolesInOrg(organizationId);
  };

  return (
    <RolesContext.Provider
      value={{
        userRole,
        hasPermission,
        getUserRole,
        setUserRole,
        removeUserRole,
        getUserRolesInOrg,
      }}
    >
      {children}
    </RolesContext.Provider>
  );
}

export function useRoles() {
  const context = useContext(RolesContext);
  if (context === undefined) {
    throw new Error('useRoles must be used within a RolesProvider');
  }
  return context;
}

export function usePermission(permission: Permission): boolean {
  const { hasPermission } = useRoles();
  return hasPermission(permission);
}
