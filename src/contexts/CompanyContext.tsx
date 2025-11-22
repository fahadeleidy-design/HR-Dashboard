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
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name_en');

      if (error) {
        console.error('Error fetching companies:', error);
        setCompanies([]);
      } else {
        setCompanies(data || []);

        if (data && data.length > 0 && !currentCompany) {
          const savedCompanyId = localStorage.getItem('currentCompanyId');
          const company = savedCompanyId
            ? data.find(c => c.id === savedCompanyId) || data[0]
            : data[0];
          setCurrentCompanyState(company);
        }
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
