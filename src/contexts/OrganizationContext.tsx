import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Organization } from '@/types';
import { storage } from '@/lib/storage';
import { useAuth } from './AuthContext';

interface OrganizationContextType {
  currentOrg: Organization | null;
  organizations: Organization[];
  setCurrentOrg: (org: Organization | null) => void;
  createOrganization: (name: string, type: Organization['type'], address?: string) => Organization;
  updateOrganization: (id: string, updates: Partial<Organization>) => void;
  deleteOrganization: (id: string) => void;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);

  useEffect(() => {
    if (user) {
      const orgs = storage.getOrganizations();
      const memberships = storage.getMemberships();
      const userOrgs = orgs.filter(org => 
        memberships.some(m => m.userId === user.id && m.organizationId === org.id)
      );
      setOrganizations(userOrgs);
      
      if (userOrgs.length > 0 && !currentOrg) {
        setCurrentOrg(userOrgs[0]);
      }
    } else {
      setOrganizations([]);
      setCurrentOrg(null);
    }
  }, [user]);

  const createOrganization = (name: string, type: Organization['type'], address?: string): Organization => {
    if (!user) throw new Error('User must be logged in');

    const newOrg: Organization = {
      id: crypto.randomUUID(),
      name,
      type,
      address,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const orgs = storage.getOrganizations();
    storage.setOrganizations([...orgs, newOrg]);

    const memberships = storage.getMemberships();
    storage.setMemberships([
      ...memberships,
      {
        id: crypto.randomUUID(),
        userId: user.id,
        organizationId: newOrg.id,
        role: 'OWNER',
      },
    ]);

    setOrganizations([...organizations, newOrg]);
    setCurrentOrg(newOrg);
    return newOrg;
  };

  const updateOrganization = (id: string, updates: Partial<Organization>) => {
    const orgs = storage.getOrganizations();
    const updated = orgs.map(org =>
      org.id === id ? { ...org, ...updates, updatedAt: new Date().toISOString() } : org
    );
    storage.setOrganizations(updated);
    setOrganizations(updated.filter(org => 
      storage.getMemberships().some(m => m.userId === user?.id && m.organizationId === org.id)
    ));
    if (currentOrg?.id === id) {
      setCurrentOrg(updated.find(org => org.id === id) || null);
    }
  };

  const deleteOrganization = (id: string) => {
    const orgs = storage.getOrganizations();
    storage.setOrganizations(orgs.filter(org => org.id !== id));
    
    const memberships = storage.getMemberships();
    storage.setMemberships(memberships.filter(m => m.organizationId !== id));
    
    setOrganizations(organizations.filter(org => org.id !== id));
    if (currentOrg?.id === id) {
      setCurrentOrg(organizations[0] || null);
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
