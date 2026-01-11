import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Company } from '@/types/database';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

interface CompanyContextType {
  currentCompany: Company | null;
  companies: Company[];
  loading: boolean;
  setCurrentCompany: (company: Company) => void;
  refreshCompanies: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [currentCompany, setCurrentCompanyState] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCompanies = async () => {
    if (!user) {
      setCompanies([]);
      setCurrentCompanyState(null);
      setLoading(false);
      return;
    }

    try {
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role, company_id')
        .eq('user_id', user.id);

      if (rolesError) {
        console.error('Error fetching user roles:', rolesError);
        setCompanies([]);
        setLoading(false);
        return;
      }

      if (!userRoles || userRoles.length === 0) {
        console.warn('User has no role assignments');
        setCompanies([]);
        setCurrentCompanyState(null);
        setLoading(false);
        return;
      }

      const hasPrivilegedRole = userRoles.some(
        role => ['super_admin', 'hr', 'finance'].includes(role.role)
      );

      let userCompanies: Company[] = [];

      if (hasPrivilegedRole) {
        const { data: allCompanies, error: companiesError } = await supabase
          .from('companies')
          .select('*')
          .order('name_en');

        if (companiesError) {
          console.error('Error fetching companies:', companiesError);
        } else {
          userCompanies = allCompanies || [];
        }
      } else {
        const companyIds = [...new Set(userRoles.map(ur => ur.company_id))];

        const { data: assignedCompanies, error: companiesError } = await supabase
          .from('companies')
          .select('*')
          .in('id', companyIds)
          .order('name_en');

        if (companiesError) {
          console.error('Error fetching companies:', companiesError);
        } else {
          userCompanies = assignedCompanies || [];
        }
      }

      setCompanies(userCompanies);

      if (userCompanies.length > 0 && !currentCompany) {
        const savedCompanyId = localStorage.getItem('currentCompanyId');
        const company = savedCompanyId
          ? userCompanies.find(c => c.id === savedCompanyId) || userCompanies[0]
          : userCompanies[0];
        setCurrentCompanyState(company);
      } else if (userCompanies.length === 0) {
        console.warn('No companies available for user');
        setCurrentCompanyState(null);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshCompanies = async () => {
    setLoading(true);
    await fetchCompanies();
  };

  const setCurrentCompany = (company: Company) => {
    setCurrentCompanyState(company);
    localStorage.setItem('currentCompanyId', company.id);
  };

  useEffect(() => {
    if (!authLoading) {
      fetchCompanies();
    }
  }, [user, authLoading]);

  const value = {
    currentCompany,
    companies,
    loading: authLoading || loading,
    setCurrentCompany,
    refreshCompanies,
  };

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}
