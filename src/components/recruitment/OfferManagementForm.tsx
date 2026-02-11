import { useState, useEffect } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { X } from 'lucide-react';
import { useErrorHandler } from '@/hooks/useErrorHandler';

interface Application {
  id: string;
  candidate: {
    id: string;
    full_name: string;
    email: string;
  };
  job_posting: {
    id: string;
    job_title: string;
  };
}

interface OfferFormProps {
  offer?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function OfferManagementForm({ offer, onClose, onSuccess }: OfferFormProps) {
  const { currentCompany, currentUser } = useCompany();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [formData, setFormData] = useState({
    application_id: '',
    offered_salary: '',
    offered_benefits: '',
    start_date: '',
    contract_type: 'full_time',
    probation_period: '90',
    response_deadline: '',
    notes: ''
  });
  const { logError } = useErrorHandler();

  useEffect(() => {
    fetchApplications();
    if (offer) {
      setFormData({
        application_id: offer.application_id || '',
        offered_salary: offer.offered_salary?.toString() || '',
        offered_benefits: offer.offered_benefits || '',
        start_date: offer.start_date || '',
        contract_type: offer.contract_type || 'full_time',
        probation_period: offer.probation_period?.toString() || '90',
        response_deadline: offer.response_deadline || '',
        notes: offer.notes || ''
      });
    }
  }, [offer]);

  const fetchApplications = async () => {
    if (!currentCompany) return;
    try {
      const { data, error } = await supabase
        .from('candidate_applications')
        .select(`
          id,
          candidate:candidates(id, full_name, email),
          job_posting:job_postings(id, job_title)
        `)
        .eq('company_id', currentCompany.id)
        .in('application_status', ['shortlisted', 'interview_completed'])
        .order('created_at', { ascending: false });

      if (!error && data) setApplications(data as Application[]);
    } catch (error) {
      logError(error, 'medium', { component: 'OfferManagementForm', action: 'fetchApplications' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany || !currentUser) return;

    setLoading(true);
    try {
      const selectedApp = applications.find(a => a.id === formData.application_id);
      if (!selectedApp && !offer) {
        showToast('Please select an application', 'error');
        return;
      }

      const offerData = {
        company_id: currentCompany.id,
        application_id: offer?.application_id || formData.application_id,
        candidate_id: offer?.candidate_id || selectedApp?.candidate.id,
        job_posting_id: offer?.job_posting_id || selectedApp?.job_posting.id,
        offered_salary: parseFloat(formData.offered_salary),
        offered_benefits: formData.offered_benefits,
        start_date: formData.start_date,
        contract_type: formData.contract_type,
        probation_period: parseInt(formData.probation_period),
        response_deadline: formData.response_deadline,
        notes: formData.notes,
        status: offer ? offer.status : 'draft',
        created_by: currentUser.id
      };

      if (offer) {
        const { error } = await supabase
          .from('job_offers')
          .update(offerData)
          .eq('id', offer.id);

        if (error) throw error;
        showToast('Offer updated successfully', 'success');
      } else {
        const { error } = await supabase
          .from('job_offers')
          .insert([offerData]);

        if (error) throw error;
        showToast('Offer created successfully', 'success');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      logError(error, 'medium', { component: 'OfferManagementForm', action: 'saveOffer' });
      showToast(error.message || 'Failed to save offer', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {offer ? 'Edit Job Offer' : 'Create Job Offer'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {!offer && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Application *
              </label>
              <select
                value={formData.application_id}
                onChange={(e) => setFormData({ ...formData, application_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Choose an application</option>
                {applications.map(app => (
                  <option key={app.id} value={app.id}>
                    {app.candidate.full_name} - {app.job_posting.job_title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Offered Salary (SAR) *
              </label>
              <input
                type="number"
                value={formData.offered_salary}
                onChange={(e) => setFormData({ ...formData, offered_salary: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contract Type *
              </label>
              <select
                value={formData.contract_type}
                onChange={(e) => setFormData({ ...formData, contract_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="temporary">Temporary</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date *
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Response Deadline *
              </label>
              <input
                type="date"
                value={formData.response_deadline}
                onChange={(e) => setFormData({ ...formData, response_deadline: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Probation Period (Days)
            </label>
            <input
              type="number"
              value={formData.probation_period}
              onChange={(e) => setFormData({ ...formData, probation_period: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              min="0"
              max="180"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Benefits Package
            </label>
            <textarea
              value={formData.offered_benefits}
              onChange={(e) => setFormData({ ...formData, offered_benefits: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={4}
              placeholder="e.g., Health insurance, Annual leave, Housing allowance, Transportation"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Internal Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Internal notes about this offer"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : (offer ? 'Update Offer' : 'Create Offer')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
