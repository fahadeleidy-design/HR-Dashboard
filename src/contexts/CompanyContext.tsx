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
  const { user } = useAuth();
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
        .select('company_id, companies(*)')
        .eq('user_id', user.id);

      if (rolesError) {
        console.error('Error fetching user roles:', rolesError);
        setCompanies([]);
        setLoading(false);
        return;
      }

      const userCompanies = userRoles?.map(ur => ur.companies).filter(Boolean) || [];

      setCompanies(userCompanies);

      if (userCompanies.length > 0 && !currentCompany) {
        const savedCompanyId = localStorage.getItem('currentCompanyId');
        const company = savedCompanyId
          ? userCompanies.find(c => c.id === savedCompanyId) || userCompanies[0]
          : userCompanies[0];
        setCurrentCompanyState(company);
      } else if (userCompanies.length === 0) {
        console.warn('User has no company assignments');
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
    fetchCompanies();
  }, [user]);

  const value = {
    currentCompany,
    companies,
    loading,
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
