import { Company } from '@/types/database';

export function buildCompanyFilter<T>(
  query: T,
  isConsolidatedView: boolean,
  companies: Company[],
  currentCompany: Company | null
): T {
  if (isConsolidatedView && companies.length > 0) {
    const companyIds = companies.map(c => c.id);
    return (query as any).in('company_id', companyIds);
  } else if (currentCompany) {
    return (query as any).eq('company_id', currentCompany.id);
  }
  return query;
}
