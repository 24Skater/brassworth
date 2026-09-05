import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Organization, UserRole } from '@/types';
import { storage, getStorageProvider } from '@/lib/storage';
import { ApiStorageProvider } from '@/lib/storage/providers/apiProvider';
import { useAuth } from './AuthContext';
import { createRoleProvider } from '@/lib/auth';

interface OrganizationContextType {
  currentOrg: Organization | null;
  organizations: Organization[];
  setCurrentOrg: (org: Organization | null) => void;
  createOrganization: (
    name: string,
    type: Organization['type'],
    address?: string
  ) => Promise<Organization>;
  updateOrganization: (id: string, updates: Partial<Organization>) => Promise<void>;
  deleteOrganization: (id: string) => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentOrg, setCurrentOrgState] = useState<Organization | null>(null);

  /**
   * Selecting a property also tells the storage provider which tenant it is
   * acting for. The local providers do not care — organizationId is just a
   * column they filter on — but the API provider puts it in the URL, and a
   * provider that was never told would read nothing at all.
   */
  const setCurrentOrg = useCallback((org: Organization | null) => {
    setCurrentOrgState(org);

    const provider = getStorageProvider();
    if (provider instanceof ApiStorageProvider) {
      provider.setOrganization(org?.id ?? null);
    }
  }, []);
  const [organizations, setOrganizations] = useState<Organization[]>([]);

  useEffect(() => {
    const loadOrganizations = async () => {
      if (user) {
        const orgs = await storage.getOrganizations();
        const memberships = await storage.getMemberships();
        const userOrgs = orgs.filter((org) =>
          memberships.some((m) => m.userId === user.id && m.organizationId === org.id)
        );
        setOrganizations(userOrgs);

        if (userOrgs.length > 0 && !currentOrg) {
          setCurrentOrg(userOrgs[0] ?? null);
        }
      } else {
        setOrganizations([]);
        setCurrentOrg(null);
      }
    };

    loadOrganizations();
  }, [user]);

  const createOrganization = async (
    name: string,
    type: Organization['type'],
    address?: string
  ): Promise<Organization> => {
    if (!user) throw new Error('User must be logged in');

    const newOrg: Organization = {
      id: crypto.randomUUID(),
      name,
      type,
      address,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const orgs = await storage.getOrganizations();
    await storage.setOrganizations([...orgs, newOrg]);

    const memberships = await storage.getMemberships();
    await storage.setMemberships([
      ...memberships,
      {
        id: crypto.randomUUID(),
        userId: user.id,
        organizationId: newOrg.id,
      },
    ]);

    // Assign ADMIN role to the creator
    const roleProvider = createRoleProvider();
    await roleProvider.setUserRole(user.id, newOrg.id, 'ADMIN' as UserRole);

    setOrganizations([...organizations, newOrg]);
    setCurrentOrg(newOrg);
    return newOrg;
  };

  const updateOrganization = async (id: string, updates: Partial<Organization>) => {
    const orgs = await storage.getOrganizations();
    const updated = orgs.map((org) =>
      org.id === id ? { ...org, ...updates, updatedAt: new Date().toISOString() } : org
    );
    await storage.setOrganizations(updated);
    const memberships = await storage.getMemberships();
    setOrganizations(
      updated.filter((org) =>
        memberships.some((m) => m.userId === user?.id && m.organizationId === org.id)
      )
    );
    if (currentOrg?.id === id) {
      setCurrentOrg(updated.find((org) => org.id === id) || null);
    }
  };

  const deleteOrganization = async (id: string) => {
    const orgs = await storage.getOrganizations();
    await storage.setOrganizations(orgs.filter((org) => org.id !== id));

    const memberships = await storage.getMemberships();
    await storage.setMemberships(memberships.filter((m) => m.organizationId !== id));

    const remainingOrgs = organizations.filter((org) => org.id !== id);
    setOrganizations(remainingOrgs);
    if (currentOrg?.id === id) {
      setCurrentOrg(remainingOrgs[0] || null);
    }
  };

  return (
    <OrganizationContext.Provider
      value={{
        currentOrg,
        organizations,
        setCurrentOrg,
        createOrganization,
        updateOrganization,
        deleteOrganization,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}
