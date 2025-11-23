import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/lib/supabase';
import { FileText, AlertCircle, CheckCircle, Clock, Plus, Edit, Trash2, X } from 'lucide-react';
import { useSortableData, SortableTableHeader } from '@/components/SortableTable';

interface GovDocument {
  id: string;
  document_type: string;
  document_number: string;
  document_name_en: string;
  document_name_ar?: string;
  issuing_authority: string;
  issue_date: string;
  expiry_date: string | null;
  status: string;
  annual_cost: number;
  renewal_period_months?: number;
  auto_renew?: boolean;
  notes?: string;
}

export function GovernmentalDocs() {
  const { currentCompany } = useCompany();
  const [documents, setDocuments] = useState<GovDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDoc, setEditingDoc] = useState<GovDocument | null>(null);
  const [formData, setFormData] = useState({
    document_type: 'commercial_registration',
    document_number: '',
    document_name_en: '',
    document_name_ar: '',
    issuing_authority: '',
    issue_date: '',
    expiry_date: '',
    annual_cost: 0,
    renewal_period_months: 12,
    auto_renew: false,
    notes: ''
  });

  useEffect(() => {
    if (currentCompany) {
      fetchDocuments();
    }
  }, [currentCompany]);

  const fetchDocuments = async () => {
    if (!currentCompany) return;

    setLoading(true);
    try {
      const { data } = await supabase
        .from('governmental_documents')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('expiry_date', { ascending: true });

      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany) return;

    try {
      const docData = {
        ...formData,
        company_id: currentCompany.id,
        status: formData.expiry_date && new Date(formData.expiry_date) < new Date() ? 'expired' : 'active',
        document_name_ar: formData.document_name_ar || null,
        expiry_date: formData.expiry_date || null,
        notes: formData.notes || null
      };

      if (editingDoc) {
        const { error } = await supabase
          .from('governmental_documents')
          .update(docData)
          .eq('id', editingDoc.id);
        if (error) throw error;
        alert('Document updated successfully!');
      } else {
        const { error } = await supabase
          .from('governmental_documents')
          .insert([docData]);
        if (error) throw error;
        alert('Document added successfully!');
      }

      setShowForm(false);
      setEditingDoc(null);
      resetForm();
      fetchDocuments();
    } catch (error: any) {
      console.error('Error saving document:', error);
      alert('Failed to save document: ' + error.message);
    }
  };

  const handleEdit = (doc: GovDocument) => {
    setEditingDoc(doc);
    setFormData({
      document_type: doc.document_type,
      document_number: doc.document_number,
      document_name_en: doc.document_name_en,
      document_name_ar: doc.document_name_ar || '',
      issuing_authority: doc.issuing_authority,
      issue_date: doc.issue_date,
      expiry_date: doc.expiry_date || '',
      annual_cost: doc.annual_cost,
      renewal_period_months: doc.renewal_period_months || 12,
      auto_renew: doc.auto_renew || false,
      notes: doc.notes || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const { error } = await supabase
        .from('governmental_documents')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('Document deleted successfully!');
      fetchDocuments();
    } catch (error: any) {
      console.error('Error deleting document:', error);
      alert('Failed to delete document: ' + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      document_type: 'commercial_registration',
      document_number: '',
      document_name_en: '',
      document_name_ar: '',
      issuing_authority: '',
      issue_date: '',
      expiry_date: '',
      annual_cost: 0,
      renewal_period_months: 12,
      auto_renew: false,
      notes: ''
    });
  };

  const activeCount = documents.filter(d => d.status === 'active').length;
  const expiringSoon = documents.filter(d => {
    if (!d.expiry_date) return false;
    const daysUntil = Math.floor((new Date(d.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil <= 30 && daysUntil >= 0;
  }).length;
  const expired = documents.filter(d => d.status === 'expired').length;
  const totalCost = documents.reduce((sum, d) => sum + (d.annual_cost || 0), 0);

  const { sortedData, sortConfig, requestSort } = useSortableData(documents);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Governmental Documents</h1>
          <p className="text-gray-600 mt-1">Track CR, licenses, permits, and certificates</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Add Document</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Documents</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{activeCount}</p>
            </div>
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Expiring Soon</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">{expiringSoon}</p>
            </div>
            <Clock className="h-12 w-12 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Expired</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{expired}</p>
            </div>
            <AlertCircle className="h-12 w-12 text-red-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Annual Cost</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">SAR {totalCost.toLocaleString()}</p>
            </div>
            <FileText className="h-12 w-12 text-gray-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <SortableTableHeader
                  label="Document Type"
                  sortKey="document_type"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label="Document Number"
                  sortKey="document_number"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label="Issuing Authority"
                  sortKey="issuing_authority"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label="Issue Date"
                  sortKey="issue_date"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label="Expiry Date"
                  sortKey="expiry_date"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label="Status"
                  sortKey="status"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No governmental documents found. Click "Add Document" to get started.
                  </td>
                </tr>
              ) : (
                sortedData.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{doc.document_name_en}</div>
                      <div className="text-sm text-gray-500 capitalize">{doc.document_type.replace(/_/g, ' ')}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {doc.document_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {doc.issuing_authority}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(doc.issue_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {doc.expiry_date ? new Date(doc.expiry_date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        doc.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : doc.status === 'expired'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {doc.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(doc)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingDoc ? 'Edit Document' : 'Add New Document'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingDoc(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Document Type *
                  </label>
                  <select
                    required
                    value={formData.document_type}
                    onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="commercial_registration">Commercial Registration</option>
                    <option value="business_license">Business License</option>
                    <option value="municipal_license">Municipal License</option>
                    <option value="chamber_membership">Chamber of Commerce Membership</option>
                    <option value="tax_registration">Tax Registration</option>
                    <option value="environmental_permit">Environmental Permit</option>
                    <option value="health_permit">Health Permit</option>
                    <option value="safety_certificate">Safety Certificate</option>
                    <option value="labor_office_registration">Labor Office Registration</option>
                    <option value="gosi_registration">GOSI Registration</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Document Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.document_number}
                    onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Document Name (English) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.document_name_en}
                    onChange={(e) => setFormData({ ...formData, document_name_en: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Document Name (Arabic)
                  </label>
                  <input
                    type="text"
                    value={formData.document_name_ar}
                    onChange={(e) => setFormData({ ...formData, document_name_ar: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Issuing Authority *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.issuing_authority}
                    onChange={(e) => setFormData({ ...formData, issuing_authority: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Issue Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.issue_date}
                    onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Annual Cost (SAR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.annual_cost}
                    onChange={(e) => setFormData({ ...formData, annual_cost: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Renewal Period (Months)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.renewal_period_months}
                    onChange={(e) => setFormData({ ...formData, renewal_period_months: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="flex items-center">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.auto_renew}
                      onChange={(e) => setFormData({ ...formData, auto_renew: e.target.checked })}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">Auto Renew</span>
                  </label>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingDoc(null);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                >
                  {editingDoc ? 'Update Document' : 'Add Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
