import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { BulkDocumentUpload } from '@/components/BulkDocumentUpload';
import { FileText, AlertTriangle, CheckCircle, Plus, Upload, X, Loader2, Layers } from 'lucide-react';
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
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    employee_id: '',
    document_type: 'iqama',
    document_name: '',
    issue_date: '',
    expiry_date: '',
    file: null as File | null
  });

  useEffect(() => {
    if (currentCompany) {
      fetchDocuments();
      fetchEmployees();
    }
  }, [currentCompany]);

  const fetchEmployees = async () => {
    if (!currentCompany) return;

    const { data } = await supabase
      .from('employees')
      .select('id, first_name_en, last_name_en, employee_number')
      .eq('company_id', currentCompany.id)
      .order('first_name_en');

    if (data) setEmployees(data);
  };

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

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany || !formData.employee_id) return;

    setUploading(true);
    try {
      let documentUrl = null;

      if (formData.file) {
        const fileName = `${currentCompany.id}/${formData.employee_id}/${Date.now()}-${formData.file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(fileName, formData.file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(fileName);

        documentUrl = urlData.publicUrl;
      }

      const { error: insertError } = await supabase
        .from('documents')
        .insert({
          company_id: currentCompany.id,
          employee_id: formData.employee_id,
          document_type: formData.document_type,
          document_name: formData.document_name,
          document_url: documentUrl,
          issue_date: formData.issue_date || null,
          expiry_date: formData.expiry_date || null,
          status: 'active'
        });

      if (insertError) throw insertError;

      setShowUploadModal(false);
      setFormData({
        employee_id: '',
        document_type: 'iqama',
        document_name: '',
        issue_date: '',
        expiry_date: '',
        file: null
      });
      fetchDocuments();
    } catch (error: any) {
      console.error('Error uploading document:', error);
      alert(error.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

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
        <div className="flex gap-3">
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg font-medium hover:from-primary-700 hover:to-primary-800 transition-all duration-200 shadow-lg shadow-primary-200 hover:shadow-xl hover:scale-105"
          >
            <Plus className="h-5 w-5" />
            <span>{t.documents.addDocument}</span>
          </button>
          <button
            onClick={() => setShowBulkUploadModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg font-medium hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-lg shadow-purple-200 hover:shadow-xl hover:scale-105"
          >
            <Layers className="h-5 w-5" />
            <span>AI Bulk Upload</span>
          </button>
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

      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">{t.documents.addDocument}</h2>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-600" />
                </button>
              </div>
            </div>

            <form onSubmit={handleUpload} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.common.employee} *
                </label>
                <select
                  required
                  value={formData.employee_id}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
                >
                  <option value="">Select employee...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name_en} {emp.last_name_en} ({emp.employee_number})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.documents.documentType} *
                </label>
                <select
                  required
                  value={formData.document_type}
                  onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
                >
                  <option value="iqama">Iqama</option>
                  <option value="passport">Passport</option>
                  <option value="contract">Contract</option>
                  <option value="certificate">Certificate</option>
                  <option value="visa">Visa</option>
                  <option value="medical">Medical</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.document_name}
                  onChange={(e) => setFormData({ ...formData, document_name: e.target.value })}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
                  placeholder="Enter document name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.documents.issueDate}
                  </label>
                  <input
                    type="date"
                    value={formData.issue_date}
                    onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.documents.expiryDate}
                  </label>
                  <input
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload File (Optional)
                </label>
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-400 hover:bg-primary-50 transition-all cursor-pointer"
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  {formData.file ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="h-6 w-6 text-primary-600" />
                      <span className="text-sm text-gray-700">{formData.file.name}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFormData({ ...formData, file: null });
                        }}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        <X className="h-4 w-4 text-gray-600" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">Click to upload document</p>
                      <p className="text-xs text-gray-500 mt-1">PDF, DOC, DOCX, JPG, PNG (max 10MB)</p>
                    </>
                  )}
                </div>
                <input
                  id="file-upload"
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && file.size <= 10 * 1024 * 1024) {
                      setFormData({ ...formData, file });
                    } else {
                      alert('File size must be less than 10MB');
                    }
                  }}
                  className="hidden"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg font-medium hover:from-primary-700 hover:to-primary-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-5 w-5" />
                      <span>Upload Document</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  disabled={uploading}
                  className="px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBulkUploadModal && (
        <div className="fixed inset-0 bg-gradient-to-br from-black/60 to-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h2 className="text-2xl font-bold text-gray-900">AI Bulk Document Upload</h2>
              <p className="text-gray-600 mt-1">Upload multiple documents with automatic employee and type detection</p>
            </div>

            <div className="p-6">
              <BulkDocumentUpload
                companyId={currentCompany!.id}
                onComplete={() => {
                  setShowBulkUploadModal(false);
                  fetchDocuments();
                }}
                onCancel={() => setShowBulkUploadModal(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
