import { createContext, useContext, useState, useRef, ReactNode, useEffect } from 'react';
import { Company } from '@/types/database';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

interface CompanyContextType {
  currentCompany: Company | null;
  companies: Company[];
  loading: boolean;
  isConsolidatedView: boolean;
  setCurrentCompany: (company: Company) => void;
  setConsolidatedView: () => void;
  refreshCompanies: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [currentCompany, setCurrentCompanyState] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConsolidatedView, setIsConsolidatedViewState] = useState(false);
  const lastFetchedUserIdRef = useRef<string | null>(null);

  const fetchCompanies = async () => {
    if (!user) {
      setCompanies([]);
      setCurrentCompanyState(null);
      setIsConsolidatedViewState(false);
      setLoading(false);
      return;
    }

    setLoading(true);

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

      if (userCompanies.length > 0) {
        const savedView = localStorage.getItem('currentView');
        const savedCompanyId = localStorage.getItem('currentCompanyId');

        if (savedView === 'consolidated' && hasPrivilegedRole) {
          setIsConsolidatedViewState(true);
          setCurrentCompanyState(null);
        } else if (savedCompanyId) {
          const company = userCompanies.find(c => c.id === savedCompanyId) || userCompanies[0];
          setCurrentCompanyState(company);
          setIsConsolidatedViewState(false);
        } else if (!currentCompany) {
          setCurrentCompanyState(userCompanies[0]);
          setIsConsolidatedViewState(false);
        }
      } else {
        console.warn('No companies available for user');
        setCurrentCompanyState(null);
        setIsConsolidatedViewState(false);
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
    setIsConsolidatedViewState(false);
    localStorage.setItem('currentCompanyId', company.id);
    localStorage.setItem('currentView', 'single');
  };

  const setConsolidatedView = () => {
    setCurrentCompanyState(null);
    setIsConsolidatedViewState(true);
    localStorage.setItem('currentView', 'consolidated');
    localStorage.removeItem('currentCompanyId');
  };

  useEffect(() => {
    if (authLoading) return;

    const userId = user?.id ?? null;
    if (userId === lastFetchedUserIdRef.current && companies.length > 0) return;

    lastFetchedUserIdRef.current = userId;
    fetchCompanies();
  }, [user, authLoading]);

  const value = {
    currentCompany,
    companies,
    loading: authLoading || loading,
    isConsolidatedView,
    setCurrentCompany,
    setConsolidatedView,
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
