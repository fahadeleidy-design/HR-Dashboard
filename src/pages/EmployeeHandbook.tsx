import { useState, useEffect } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  BookOpen,
  Upload,
  Download,
  Eye,
  FileText,
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  Plus,
  Edit,
  Trash2,
  AlertCircle,
  X,
  File
} from 'lucide-react';
import { format } from 'date-fns';

interface Handbook {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  version: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  file_type: string | null;
  effective_date: string;
  is_active: boolean;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

interface HandbookStats {
  total_employees: number;
  acknowledged_count: number;
  pending_count: number;
  acknowledgment_rate: number;
}

export function EmployeeHandbook() {
  const { currentCompany } = useCompany();
  const { user } = useAuth();
  const [handbooks, setHandbooks] = useState<Handbook[]>([]);
  const [selectedHandbook, setSelectedHandbook] = useState<Handbook | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [stats, setStats] = useState<HandbookStats | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    version: '',
    effective_date: new Date().toISOString().split('T')[0],
    is_active: true,
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (currentCompany && user) {
      loadHandbooks();
      loadUserRole();
    }
  }, [currentCompany, user]);

  const loadUserRole = async () => {
    if (!currentCompany || !user) return;

    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('company_id', currentCompany.id)
      .maybeSingle();

    if (data) {
      setUserRole(data.role);
    }
  };

  const loadHandbooks = async () => {
    if (!currentCompany) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('employee_handbooks')
      .select('*')
      .eq('company_id', currentCompany.id)
      .order('effective_date', { ascending: false });

    if (!error && data) {
      setHandbooks(data);
    }
    setLoading(false);
  };

  const loadHandbookStats = async (handbookId: string) => {
    const { data, error } = await supabase
      .rpc('get_handbook_stats', { handbook_uuid: handbookId });

    if (!error && data && data.length > 0) {
      setStats(data[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !currentCompany || !user) return;

    setUploading(true);

    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${currentCompany.id}/${Date.now()}.${fileExt}`;
      const filePath = `handbooks/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('employee_handbooks')
        .insert({
          company_id: currentCompany.id,
          title: formData.title,
          description: formData.description || null,
          version: formData.version,
          file_name: selectedFile.name,
          file_url: publicUrl,
          file_size: selectedFile.size,
          file_type: selectedFile.type,
          effective_date: formData.effective_date,
          is_active: formData.is_active,
          uploaded_by: user.id,
        });

      if (dbError) throw dbError;

      setShowUploadForm(false);
      setFormData({
        title: '',
        description: '',
        version: '',
        effective_date: new Date().toISOString().split('T')[0],
        is_active: true,
      });
      setSelectedFile(null);
      loadHandbooks();
    } catch (error: any) {
      console.error('Error uploading handbook:', error);
      alert(error.message || 'Failed to upload handbook');
    } finally {
      setUploading(false);
    }
  };

  const handleView = (handbook: Handbook) => {
    setSelectedHandbook(handbook);
    loadHandbookStats(handbook.id);
    setShowViewer(true);
  };

  const handleDownload = (handbook: Handbook) => {
    window.open(handbook.file_url, '_blank');
  };

  const handleDelete = async (handbookId: string) => {
    if (!confirm('Are you sure you want to delete this handbook?')) return;

    const { error } = await supabase
      .from('employee_handbooks')
      .delete()
      .eq('id', handbookId);

    if (!error) {
      loadHandbooks();
    }
  };

  const toggleActiveStatus = async (handbook: Handbook) => {
    const { error } = await supabase
      .from('employee_handbooks')
      .update({ is_active: !handbook.is_active })
      .eq('id', handbook.id);

    if (!error) {
      loadHandbooks();
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const canManageHandbooks = userRole === 'admin' || userRole === 'super_admin';

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-primary-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Employee Handbook</h1>
              <p className="text-sm text-gray-600">Company policies and guidelines</p>
            </div>
          </div>
          {canManageHandbooks && (
            <button
              onClick={() => setShowUploadForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Upload Handbook
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Available Handbooks</h3>
            </div>

            <div className="divide-y divide-gray-200">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading handbooks...</div>
              ) : handbooks.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  <p>No handbooks available</p>
                  {canManageHandbooks && (
                    <p className="text-sm mt-2">Upload your first employee handbook to get started</p>
                  )}
                </div>
              ) : (
                handbooks.map((handbook) => (
                  <div key={handbook.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="bg-primary-100 rounded-lg p-3">
                          <File className="h-6 w-6 text-primary-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-gray-900 truncate">{handbook.title}</h4>
                            {handbook.is_active ? (
                              <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded">
                                Active
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                                Archived
                              </span>
                            )}
                          </div>
                          {handbook.description && (
                            <p className="text-sm text-gray-600 mb-2">{handbook.description}</p>
                          )}
                          <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>Version {handbook.version}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>Effective {format(new Date(handbook.effective_date), 'MMM dd, yyyy')}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              <span>{formatFileSize(handbook.file_size)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => handleView(handbook)}
                          className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDownload(handbook)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Download"
                        >
                          <Download className="h-5 w-5" />
                        </button>
                        {canManageHandbooks && (
                          <>
                            <button
                              onClick={() => toggleActiveStatus(handbook)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title={handbook.is_active ? 'Archive' : 'Activate'}
                            >
                              <Edit className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(handbook.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg shadow-md p-6 text-white">
            <div className="flex items-center gap-3 mb-4">
              <BookOpen className="h-8 w-8" />
              <div>
                <h3 className="text-lg font-semibold">Quick Info</h3>
                <p className="text-sm text-primary-100">Handbook overview</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-primary-100">Total Handbooks</span>
                <span className="text-2xl font-bold">{handbooks.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-primary-100">Active</span>
                <span className="text-2xl font-bold">
                  {handbooks.filter(h => h.is_active).length}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Important</p>
                <ul className="space-y-1 ml-4 list-disc">
                  <li>Review handbooks carefully</li>
                  <li>Keep handbooks up to date</li>
                  <li>Ensure all employees have access</li>
                  <li>Track acknowledgments for compliance</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showUploadForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-900">Upload Employee Handbook</h3>
                <button
                  onClick={() => setShowUploadForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleUpload} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="e.g., Employee Handbook 2024"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Brief description of the handbook"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Version *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.version}
                      onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="e.g., 1.0, 2024.1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Effective Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.effective_date}
                      onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Handbook File * (PDF, DOCX)
                  </label>
                  <input
                    type="file"
                    required
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileSelect}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  {selectedFile && (
                    <p className="mt-2 text-sm text-gray-600">
                      Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="is_active" className="text-sm text-gray-700">
                    Set as active handbook
                  </label>
                </div>
              </div>

              <div className="mt-6 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowUploadForm(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:bg-gray-400"
                >
                  {uploading ? (
                    <>Uploading...</>
                  ) : (
                    <>
                      <Upload className="h-5 w-5" />
                      Upload Handbook
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showViewer && selectedHandbook && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-primary-600 to-primary-700 text-white">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold">{selectedHandbook.title}</h3>
                  <p className="text-primary-100 mt-1">Version {selectedHandbook.version}</p>
                </div>
                <button
                  onClick={() => setShowViewer(false)}
                  className="text-white hover:text-primary-100 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {selectedHandbook.description && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
                  <p className="text-gray-700">{selectedHandbook.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Handbook Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">File Name:</span>
                      <span className="text-gray-900">{selectedHandbook.file_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">File Size:</span>
                      <span className="text-gray-900">{formatFileSize(selectedHandbook.file_size)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Effective Date:</span>
                      <span className="text-gray-900">
                        {format(new Date(selectedHandbook.effective_date), 'MMM dd, yyyy')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className="text-gray-900">
                        {selectedHandbook.is_active ? 'Active' : 'Archived'}
                      </span>
                    </div>
                  </div>
                </div>

                {stats && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Acknowledgment Status</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Employees:</span>
                        <span className="text-gray-900">{stats.total_employees}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Acknowledged:</span>
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="h-4 w-4" />
                          {stats.acknowledged_count}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Pending:</span>
                        <span className="flex items-center gap-1 text-red-600">
                          <XCircle className="h-4 w-4" />
                          {stats.pending_count}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Acknowledgment Rate:</span>
                        <span className="text-gray-900 font-semibold">
                          {stats.acknowledgment_rate}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 pt-6">
                <button
                  onClick={() => handleDownload(selectedHandbook)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Download className="h-5 w-5" />
                  Download Handbook
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}