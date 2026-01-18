import React, { useState, useEffect } from 'react';
import { Award, AlertCircle, CheckCircle, Clock, Plus, FileText, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';

interface Certification {
  id: string;
  certification_name: string;
  issuing_organization: string;
  certification_number: string;
  issue_date: string;
  expiry_date: string;
  status: string;
  is_verified: boolean;
  employee: any;
  ce_hours_completed: number;
  ce_hours_required: number;
}

export default function CertificationTracking() {
  const { selectedCompany } = useCompany();
  const { showToast } = useToast();
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCert, setNewCert] = useState({
    employee_id: '',
    certification_name: '',
    issuing_organization: '',
    certification_number: '',
    issue_date: '',
    expiry_date: '',
    ce_hours_required: 0,
  });

  useEffect(() => {
    if (selectedCompany) {
      loadData();
    }
  }, [selectedCompany]);

  const loadData = async () => {
    try {
      setLoading(true);

      const { data: certsData } = await supabase
        .from('employee_certifications')
        .select(`
          *,
          employee:employees(id, first_name_en, last_name_en, job_title_en, company_id)
        `)
        .eq('employee.company_id', selectedCompany!.id)
        .order('expiry_date', { ascending: true });

      setCertifications(certsData || []);

      const { data: catalogData } = await supabase
        .from('certifications_catalog')
        .select('*')
        .eq('is_active', true)
        .order('certification_name');

      setCatalog(catalogData || []);
    } catch (error) {
      console.error('Error loading certifications:', error);
      showToast('Failed to load certifications', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCertification = async () => {
    try {
      const { error } = await supabase.from('employee_certifications').insert([
        {
          ...newCert,
          status: 'active',
        },
      ]);

      if (error) throw error;

      showToast('Certification added successfully', 'success');
      setShowAddModal(false);
      setNewCert({
        employee_id: '',
        certification_name: '',
        issuing_organization: '',
        certification_number: '',
        issue_date: '',
        expiry_date: '',
        ce_hours_required: 0,
      });
      loadData();
    } catch (error: any) {
      console.error('Error adding certification:', error);
      showToast(error.message || 'Failed to add certification', 'error');
    }
  };

  const verifyCertification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('employee_certifications')
        .update({
          is_verified: true,
          verified_date: new Date().toISOString().split('T')[0],
          verification_method: 'manual',
        })
        .eq('id', id);

      if (error) throw error;

      showToast('Certification verified', 'success');
      loadData();
    } catch (error: any) {
      console.error('Error verifying certification:', error);
      showToast(error.message || 'Failed to verify certification', 'error');
    }
  };

  const getDaysUntilExpiry = (expiryDate: string): number => {
    if (!expiryDate) return 999;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getExpiryBadge = (expiryDate: string) => {
    if (!expiryDate) return null;

    const daysLeft = getDaysUntilExpiry(expiryDate);

    if (daysLeft < 0) {
      return (
        <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs flex items-center">
          <AlertCircle className="h-3 w-3 mr-1" />
          Expired
        </span>
      );
    } else if (daysLeft <= 30) {
      return (
        <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs flex items-center">
          <AlertCircle className="h-3 w-3 mr-1" />
          Expires in {daysLeft} days
        </span>
      );
    } else if (daysLeft <= 90) {
      return (
        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs flex items-center">
          <Clock className="h-3 w-3 mr-1" />
          Expires in {daysLeft} days
        </span>
      );
    }
    return null;
  };

  const filteredCertifications = certifications.filter((cert) => {
    if (filter === 'all') return true;
    if (filter === 'expiring_soon') {
      const daysLeft = getDaysUntilExpiry(cert.expiry_date);
      return daysLeft >= 0 && daysLeft <= 90;
    }
    return cert.status === filter;
  });

  const stats = {
    total: certifications.length,
    active: certifications.filter((c) => c.status === 'active').length,
    expiringSoon: certifications.filter((c) => {
      const days = getDaysUntilExpiry(c.expiry_date);
      return days >= 0 && days <= 90;
    }).length,
    expired: certifications.filter((c) => c.status === 'expired').length,
  };

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
          <h2 className="text-2xl font-bold text-gray-900">Certification Tracking</h2>
          <p className="text-gray-600 mt-1">Manage and track employee certifications and renewals</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Certification
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Award className="h-8 w-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Expiring Soon</p>
              <p className="text-2xl font-bold text-orange-600">{stats.expiringSoon}</p>
            </div>
            <Clock className="h-8 w-8 text-orange-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Expired</p>
              <p className="text-2xl font-bold text-red-600">{stats.expired}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-400" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {[
              { key: 'all', label: 'All' },
              { key: 'active', label: 'Active' },
              { key: 'expiring_soon', label: 'Expiring Soon' },
              { key: 'expired', label: 'Expired' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  filter === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {filteredCertifications.length === 0 ? (
            <div className="text-center py-12">
              <Award className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">No certifications in this category</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCertifications.map((cert) => (
                <div key={cert.id} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {cert.certification_name}
                        </h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(cert.status)}`}>
                          {cert.status}
                        </span>
                        {cert.is_verified && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs flex items-center">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Verified
                          </span>
                        )}
                        {getExpiryBadge(cert.expiry_date)}
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{cert.issuing_organization}</p>
                      <p className="text-sm text-gray-500">
                        Employee: {cert.employee?.first_name_en} {cert.employee?.last_name_en} -{' '}
                        {cert.employee?.job_title_en}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    {cert.certification_number && (
                      <div>
                        <div className="text-xs text-gray-600">Certificate Number</div>
                        <div className="text-sm font-medium text-gray-900">{cert.certification_number}</div>
                      </div>
                    )}
                    <div>
                      <div className="text-xs text-gray-600">Issue Date</div>
                      <div className="text-sm font-medium text-gray-900">
                        {new Date(cert.issue_date).toLocaleDateString()}
                      </div>
                    </div>
                    {cert.expiry_date && (
                      <div>
                        <div className="text-xs text-gray-600">Expiry Date</div>
                        <div className="text-sm font-medium text-gray-900">
                          {new Date(cert.expiry_date).toLocaleDateString()}
                        </div>
                      </div>
                    )}
                    {cert.ce_hours_required > 0 && (
                      <div>
                        <div className="text-xs text-gray-600">CE Hours</div>
                        <div className="text-sm font-medium text-gray-900">
                          {cert.ce_hours_completed || 0} / {cert.ce_hours_required}
                        </div>
                      </div>
                    )}
                  </div>

                  {cert.ce_hours_required > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                        <span>Continuing Education Progress</span>
                        <span>
                          {Math.round(((cert.ce_hours_completed || 0) / cert.ce_hours_required) * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{
                            width: `${Math.min(
                              ((cert.ce_hours_completed || 0) / cert.ce_hours_required) * 100,
                              100
                            )}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="flex items-center space-x-2">
                      {!cert.is_verified && (
                        <button
                          onClick={() => verifyCertification(cert.id)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm flex items-center"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Verify
                        </button>
                      )}
                      <button className="px-4 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 text-sm flex items-center">
                        <FileText className="h-4 w-4 mr-1" />
                        View Certificate
                      </button>
                    </div>
                    {cert.expiry_date && getDaysUntilExpiry(cert.expiry_date) <= 90 && (
                      <button className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        Schedule Renewal
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Certification</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Certification Name</label>
                <input
                  type="text"
                  value={newCert.certification_name}
                  onChange={(e) => setNewCert({ ...newCert, certification_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Issuing Organization
                </label>
                <input
                  type="text"
                  value={newCert.issuing_organization}
                  onChange={(e) => setNewCert({ ...newCert, issuing_organization: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Certificate Number
                </label>
                <input
                  type="text"
                  value={newCert.certification_number}
                  onChange={(e) => setNewCert({ ...newCert, certification_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date</label>
                  <input
                    type="date"
                    value={newCert.issue_date}
                    onChange={(e) => setNewCert({ ...newCert, issue_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={newCert.expiry_date}
                    onChange={(e) => setNewCert({ ...newCert, expiry_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CE Hours Required (optional)
                </label>
                <input
                  type="number"
                  value={newCert.ce_hours_required}
                  onChange={(e) =>
                    setNewCert({ ...newCert, ce_hours_required: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCertification}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Certification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
