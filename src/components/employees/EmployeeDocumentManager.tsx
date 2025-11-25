import { useState, useEffect } from 'react';
import { FileText, Upload, Download, Eye, Trash2, AlertCircle, CheckCircle, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface EmployeeDocumentManagerProps {
  employeeId: string;
  companyId: string;
}

interface Document {
  id: string;
  document_type: string;
  document_name: string;
  document_category?: string;
  file_url: string;
  file_size?: number;
  version: number;
  is_current_version: boolean;
  issue_date?: string;
  expiry_date?: string;
  is_sensitive: boolean;
  requires_signature: boolean;
  is_signed: boolean;
  signed_date?: string;
  notes?: string;
  created_at: string;
}

export function EmployeeDocumentManager({ employeeId, companyId }: EmployeeDocumentManagerProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [showExpiring, setShowExpiring] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [employeeId]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('employee_documents')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('is_current_version', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('employee_documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;

      alert('Document deleted successfully!');
      fetchDocuments();
    } catch (error: any) {
      console.error('Error deleting document:', error);
      alert('Failed to delete document: ' + error.message);
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      id_proof: 'ID Proof',
      passport: 'Passport',
      visa: 'Visa',
      iqama: 'Iqama',
      contract: 'Contract',
      resume: 'Resume',
      certificate: 'Certificate',
      offer_letter: 'Offer Letter',
      termination_letter: 'Termination Letter',
      performance_review: 'Performance Review',
      warning_letter: 'Warning Letter',
      other: 'Other'
    };
    return labels[type] || type;
  };

  const getDocumentTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      id_proof: 'bg-blue-100 text-blue-800',
      passport: 'bg-purple-100 text-purple-800',
      visa: 'bg-green-100 text-green-800',
      iqama: 'bg-yellow-100 text-yellow-800',
      contract: 'bg-red-100 text-red-800',
      resume: 'bg-gray-100 text-gray-800',
      certificate: 'bg-orange-100 text-orange-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const isExpiringSoon = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  };

  const isExpired = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    return expiry < today;
  };

  const filteredDocuments = documents.filter(doc => {
    if (filterType !== 'all' && doc.document_type !== filterType) {
      return false;
    }
    if (showExpiring && doc.expiry_date) {
      return isExpiringSoon(doc.expiry_date) || isExpired(doc.expiry_date);
    }
    return true;
  });

  const documentTypes = Array.from(new Set(documents.map(d => d.document_type)));

  const expiringCount = documents.filter(d => d.expiry_date && (isExpiringSoon(d.expiry_date) || isExpired(d.expiry_date))).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Document Manager</h2>
          <p className="text-gray-600 mt-1">{documents.length} documents</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
          <Upload className="h-4 w-4 inline mr-2" />
          Upload Document
        </button>
      </div>

      {expiringCount > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-900">
                {expiringCount} document{expiringCount !== 1 ? 's' : ''} expiring soon or expired
              </p>
              <button
                onClick={() => setShowExpiring(!showExpiring)}
                className="text-xs text-yellow-700 underline mt-1"
              >
                {showExpiring ? 'Show all documents' : 'View expiring documents'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterType === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({documents.length})
          </button>
          {documentTypes.map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterType === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {getDocumentTypeLabel(type)} ({documents.filter(d => d.document_type === type).length})
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDocuments.map((document) => (
          <div key={document.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDocumentTypeColor(document.document_type)}`}>
                      {getDocumentTypeLabel(document.document_type)}
                    </span>
                  </div>
                  <h3 className="font-medium text-gray-900 mb-1">{document.document_name}</h3>
                  {document.document_category && (
                    <p className="text-xs text-gray-500">{document.document_category}</p>
                  )}
                </div>
                <span className="text-xs text-gray-500">v{document.version}</span>
              </div>

              <div className="space-y-2 text-sm">
                {document.issue_date && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>Issued: {new Date(document.issue_date).toLocaleDateString()}</span>
                  </div>
                )}
                {document.expiry_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span className={
                      isExpired(document.expiry_date)
                        ? 'text-red-600 font-medium'
                        : isExpiringSoon(document.expiry_date)
                        ? 'text-yellow-600 font-medium'
                        : 'text-gray-600'
                    }>
                      Expires: {new Date(document.expiry_date).toLocaleDateString()}
                      {isExpired(document.expiry_date) && ' (Expired)'}
                      {isExpiringSoon(document.expiry_date) && !isExpired(document.expiry_date) && ' (Soon)'}
                    </span>
                  </div>
                )}
              </div>

              {document.requires_signature && (
                <div className="mt-3 flex items-center gap-2">
                  {document.is_signed ? (
                    <div className="flex items-center gap-2 px-2 py-1 bg-green-50 rounded-lg">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-xs text-green-700">
                        Signed {document.signed_date ? new Date(document.signed_date).toLocaleDateString() : ''}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-2 py-1 bg-yellow-50 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <span className="text-xs text-yellow-700">Signature Required</span>
                    </div>
                  )}
                </div>
              )}

              {document.is_sensitive && (
                <div className="mt-3">
                  <span className="px-2 py-1 bg-red-50 text-red-700 text-xs rounded">Confidential</span>
                </div>
              )}

              {document.notes && (
                <div className="mt-3 p-2 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600">{document.notes}</p>
                </div>
              )}
            </div>

            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {new Date(document.created_at).toLocaleDateString()}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => window.open(document.file_url, '_blank')}
                  className="text-blue-600 hover:text-blue-800"
                  title="View"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  onClick={() => window.open(document.file_url, '_blank')}
                  className="text-green-600 hover:text-green-800"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={() => deleteDocument(document.id)}
                  className="text-red-600 hover:text-red-800"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredDocuments.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900 mb-2">No Documents Found</p>
          <p className="text-sm text-gray-600 mb-6">
            {showExpiring
              ? 'No expiring or expired documents'
              : filterType !== 'all'
              ? `No ${getDocumentTypeLabel(filterType)} documents`
              : 'Upload documents to get started'}
          </p>
        </div>
      )}
    </div>
  );
}
