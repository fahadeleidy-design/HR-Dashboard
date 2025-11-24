import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { FileText, AlertTriangle, CheckCircle } from 'lucide-react';
import { useSortableData, SortableTableHeader } from '@/components/SortableTable';
import { formatNumber } from '@/lib/formatters';

interface Document {
  id: string;
  employee_id: string;
  document_type: string;
  document_number: string;
  issue_date: string;
  expiry_date: string | null;
  status: 'active' | 'expired' | 'expiring_soon';
  employee: {
    employee_number: string;
    first_name_en: string;
    last_name_en: string;
  };
}

export function Documents() {
  const { currentCompany } = useCompany();
  const { t, language, isRTL } = useLanguage();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'expiring_soon' | 'expired'>('all');

  useEffect(() => {
    if (currentCompany) {
      fetchDocuments();
    }
  }, [currentCompany]);

  const fetchDocuments = async () => {
    if (!currentCompany) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select(`
          *,
          employee:employees(employee_number, first_name_en, last_name_en)
        `)
        .eq('company_id', currentCompany.id)
        .order('expiry_date', { ascending: true });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    if (filter === 'all') return true;
    return doc.status === filter;
  });

  const activeCount = documents.filter(d => d.status === 'active').length;
  const expiringSoonCount = documents.filter(d => d.status === 'expiring_soon').length;
  const expiredCount = documents.filter(d => d.status === 'expired').length;

  const { sortedData, sortConfig, requestSort } = useSortableData(filteredDocuments);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : 'text-left'}>
          <h1 className="text-3xl font-bold text-gray-900">{t.documents.title}</h1>
          <p className="text-gray-600 mt-1">{t.documents.subtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.common.total} {t.documents.title}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(documents.length, language)}</p>
            </div>
            <FileText className="h-12 w-12 text-gray-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.common.active}</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{formatNumber(activeCount, language)}</p>
            </div>
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.common.expiringSoon}</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">{formatNumber(expiringSoonCount, language)}</p>
            </div>
            <AlertTriangle className="h-12 w-12 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.common.expired}</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{formatNumber(expiredCount, language)}</p>
            </div>
            <AlertTriangle className="h-12 w-12 text-red-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <div className="flex space-x-2">
            {['all', 'active', 'expiring_soon', 'expired'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status as any)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filter === status
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? t.common.all : status === 'active' ? t.common.active : status === 'expiring_soon' ? t.common.expiringSoon : t.common.expired}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <SortableTableHeader
                  label={t.common.employee}
                  sortKey="employee.first_name_en"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label={t.documents.documentType}
                  sortKey="document_type"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label={t.documents.documentNumber}
                  sortKey="document_number"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label={t.documents.issueDate}
                  sortKey="issue_date"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label={t.documents.expiryDate}
                  sortKey="expiry_date"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label={t.common.status}
                  sortKey="status"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    {t.messages.noResults}
                  </td>
                </tr>
              ) : (
                sortedData.map((document) => (
                  <tr key={document.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {document.employee.first_name_en} {document.employee.last_name_en}
                      </div>
                      <div className="text-sm text-gray-500">{document.employee.employee_number}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {document.document_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {document.document_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(document.issue_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {document.expiry_date ? new Date(document.expiry_date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        document.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : document.status === 'expiring_soon'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {document.status.split('_').join(' ')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
