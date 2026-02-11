import { useEffect, useState, useCallback } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import {
  FileText, DollarSign, Plus, Eye, Send, CheckCircle, XCircle, Clock, TrendingUp, Edit2, Trash2, X
} from 'lucide-react';
import { formatDate, formatNumber } from '@/lib/formatters';
import { OfferManagementForm } from './OfferManagementForm';
import { useErrorHandler } from '@/hooks/useErrorHandler';

interface JobOffer {
  id: string;
  application_id: string;
  candidate_id: string;
  job_posting_id: string;
  offered_salary: number;
  offered_benefits: string;
  start_date: string;
  contract_type: string;
  probation_period: number;
  status: string;
  sent_date?: string;
  response_deadline: string;
  accepted_date?: string;
  rejected_date?: string;
  rejection_reason?: string;
  counter_offer_amount?: number;
  notes?: string;
  created_at?: string;
  candidate?: {
    full_name: string;
    email: string;
  };
  job_posting?: {
    job_title: string;
  };
}

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

interface OfferNegotiation {
  id: string;
  job_offer_id: string;
  negotiation_round: number;
  candidate_counter_salary: number;
  company_revised_salary: number;
  status: string;
  created_at: string;
}

export function EnhancedOfferManagement() {
  const { currentCompany } = useCompany();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState<JobOffer[]>([]);
  const [negotiations, setNegotiations] = useState<OfferNegotiation[]>([]);
  const [filter, setFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'offers' | 'negotiations'>('offers');
  const [selectedOffer, setSelectedOffer] = useState<JobOffer | null>(null);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState<JobOffer | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [showNegotiationModal, setShowNegotiationModal] = useState(false);
  const [negotiatingOffer, setNegotiatingOffer] = useState<JobOffer | null>(null);
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
    if (currentCompany) {
      if (activeTab === 'offers') fetchOffers();
      else fetchNegotiations();
    }
  }, [currentCompany, activeTab, filter]);

  const fetchOffers = async () => {
    if (!currentCompany) return;
    setLoading(true);
    try {
      let query = supabase
        .from('job_offers')
        .select(`
          *,
          candidate:candidates(first_name, last_name, email),
          job_posting:job_postings(job_title)
        `)
        .eq('company_id', currentCompany.id)
        .order('offer_date', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (!error && data) setOffers(data);
    } catch (error) {
      logError(error, 'medium', { component: 'EnhancedOfferManagement', action: 'fetchOffers' });
    } finally {
      setLoading(false);
    }
  };

  const fetchNegotiations = async () => {
    if (!currentCompany) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('offer_negotiations')
        .select(`
          *,
          job_offer:job_offers(
            candidate:candidates(full_name),
            job_posting:job_postings(job_title)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) setNegotiations(data);
    } catch (error) {
      logError(error, 'medium', { component: 'EnhancedOfferManagement', action: 'fetchNegotiations' });
    } finally {
      setLoading(false);
    }
  };

  const handleSendOffer = async (offerId: string) => {
    if (!confirm('Are you sure you want to send this offer to the candidate?')) return;

    try {
      const { error } = await supabase
        .from('job_offers')
        .update({
          status: 'sent',
          sent_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', offerId);

      if (error) throw error;
      showToast('Offer sent successfully', 'success');
      fetchOffers();
    } catch (error: any) {
      logError(error, 'medium', { component: 'EnhancedOfferManagement', action: 'sendOffer' });
      showToast(error.message || 'Failed to send offer', 'error');
    }
  };

  const handleDeleteOffer = async (offerId: string) => {
    if (!confirm('Are you sure you want to delete this offer? This action cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('job_offers')
        .delete()
        .eq('id', offerId);

      if (error) throw error;
      showToast('Offer deleted successfully', 'success');
      fetchOffers();
    } catch (error: any) {
      logError(error, 'medium', { component: 'EnhancedOfferManagement', action: 'deleteOffer' });
      showToast(error.message || 'Failed to delete offer', 'error');
    }
  };

  const handleWithdrawOffer = async (offerId: string) => {
    if (!confirm('Are you sure you want to withdraw this offer?')) return;

    try {
      const { error } = await supabase
        .from('job_offers')
        .update({ status: 'withdrawn' })
        .eq('id', offerId);

      if (error) throw error;
      showToast('Offer withdrawn successfully', 'success');
      fetchOffers();
    } catch (error: any) {
      logError(error, 'medium', { component: 'EnhancedOfferManagement', action: 'withdrawOffer' });
      showToast(error.message || 'Failed to withdraw offer', 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; icon: any }> = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-700', icon: Clock },
      sent: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Send },
      accepted: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
      declined: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
      expired: { bg: 'bg-gray-100', text: 'text-gray-700', icon: Clock },
      withdrawn: { bg: 'bg-orange-100', text: 'text-orange-700', icon: XCircle }
    };

    const badge = badges[status] || badges.draft;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${badge.bg} ${badge.text}`}>
        <Icon className="h-3 w-3" />
        {status.toUpperCase()}
      </span>
    );
  };

  const renderOffers = () => (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 flex-shrink-0"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="accepted">Accepted</option>
            <option value="declined">Declined</option>
            <option value="expired">Expired</option>
          </select>
        </div>
        <button
          onClick={() => setShowOfferModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex-shrink-0 whitespace-nowrap"
        >
          <Plus className="h-5 w-5" />
          Create Offer
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Candidate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Offered Salary</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Offer Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deadline</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {offers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No offers found
                  </td>
                </tr>
              ) : (
                offers.map((offer) => (
                  <tr key={offer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">
                          {offer.candidate?.full_name}
                        </span>
                        <span className="text-xs text-gray-500">{offer.candidate?.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700">{offer.job_posting?.job_title}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-semibold text-gray-900">
                        {formatNumber(offer.offered_salary, 'en')} SAR
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-700">{formatDate(offer.start_date, 'en')}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-700">{offer.sent_date ? formatDate(offer.sent_date, 'en') : '-'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-700">{formatDate(offer.response_deadline, 'en')}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(offer.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedOffer(offer)}
                          className="p-1 text-blue-600 hover:text-blue-900"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {(offer.status === 'draft' || offer.status === 'sent') && (
                          <button
                            onClick={() => {
                              setEditingOffer(offer);
                              setShowOfferModal(true);
                            }}
                            className="p-1 text-green-600 hover:text-green-900"
                            title="Edit Offer"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        )}
                        {offer.status === 'draft' && (
                          <button
                            onClick={() => handleSendOffer(offer.id)}
                            className="p-1 text-purple-600 hover:text-purple-900"
                            title="Send Offer"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        )}
                        {offer.status === 'sent' && (
                          <button
                            onClick={() => handleWithdrawOffer(offer.id)}
                            className="p-1 text-orange-600 hover:text-orange-900"
                            title="Withdraw Offer"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}
                        {offer.status === 'draft' && (
                          <button
                            onClick={() => handleDeleteOffer(offer.id)}
                            className="p-1 text-red-600 hover:text-red-900"
                            title="Delete Offer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
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

  const renderNegotiations = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Candidate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Round</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Candidate Counter</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company Revised</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {negotiations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No negotiations found
                  </td>
                </tr>
              ) : (
                negotiations.map((neg: any) => (
                  <tr key={neg.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-900">
                        {neg.job_offer?.candidate?.full_name}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700">{neg.job_offer?.job_posting?.job_title}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                        Round {neg.negotiation_round}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-semibold text-gray-900">
                        {formatNumber(neg.candidate_counter_salary, 'en')} SAR
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-semibold text-green-600">
                        {formatNumber(neg.company_revised_salary, 'en')} SAR
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        neg.status === 'accepted' ? 'bg-green-100 text-green-700' :
                        neg.status === 'countered' ? 'bg-yellow-100 text-yellow-700' :
                        neg.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {neg.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-700">{formatDate(neg.created_at, 'en')}</span>
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Offers</p>
              <p className="text-3xl font-bold mt-2">{offers.length}</p>
            </div>
            <FileText className="h-10 w-10 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Accepted</p>
              <p className="text-3xl font-bold mt-2">{offers.filter(o => o.status === 'accepted').length}</p>
            </div>
            <CheckCircle className="h-10 w-10 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm font-medium">Pending</p>
              <p className="text-3xl font-bold mt-2">{offers.filter(o => o.status === 'sent').length}</p>
            </div>
            <Clock className="h-10 w-10 text-yellow-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm font-medium">Declined</p>
              <p className="text-3xl font-bold mt-2">{offers.filter(o => o.status === 'declined').length}</p>
            </div>
            <XCircle className="h-10 w-10 text-red-200" />
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('offers')}
            className={`px-6 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'offers'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Offers
            </div>
          </button>
          <button
            onClick={() => setActiveTab('negotiations')}
            className={`px-6 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'negotiations'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Negotiations
            </div>
          </button>
        </div>
      </div>

      {activeTab === 'offers' && renderOffers()}
      {activeTab === 'negotiations' && renderNegotiations()}

      {showOfferModal && (
        <OfferManagementForm
          offer={editingOffer}
          onClose={() => {
            setShowOfferModal(false);
            setEditingOffer(null);
          }}
          onSuccess={() => {
            fetchOffers();
            setEditingOffer(null);
          }}
        />
      )}

      {selectedOffer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Offer Details</h2>
              <button
                onClick={() => setSelectedOffer(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600">Candidate</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedOffer.candidate?.full_name}</p>
                  <p className="text-sm text-gray-600">{selectedOffer.candidate?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Position</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedOffer.job_posting?.job_title}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600">Offered Salary</p>
                  <p className="text-lg font-semibold text-green-600">{formatNumber(selectedOffer.offered_salary, 'en')} SAR</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Contract Type</p>
                  <p className="text-lg font-semibold text-gray-900 capitalize">{selectedOffer.contract_type?.replace('_', ' ')}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600">Start Date</p>
                  <p className="text-lg font-semibold text-gray-900">{formatDate(selectedOffer.start_date, 'en')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Response Deadline</p>
                  <p className="text-lg font-semibold text-gray-900">{formatDate(selectedOffer.response_deadline, 'en')}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600">Probation Period</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedOffer.probation_period || 0} days</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedOffer.status)}</div>
                </div>
              </div>

              {selectedOffer.offered_benefits && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Benefits Package</p>
                  <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">{selectedOffer.offered_benefits}</p>
                </div>
              )}

              {selectedOffer.notes && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Internal Notes</p>
                  <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">{selectedOffer.notes}</p>
                </div>
              )}

              {selectedOffer.sent_date && (
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm text-gray-600">Sent Date: {formatDate(selectedOffer.sent_date, 'en')}</p>
                  {selectedOffer.accepted_date && (
                    <p className="text-sm text-green-600 mt-1">Accepted Date: {formatDate(selectedOffer.accepted_date, 'en')}</p>
                  )}
                  {selectedOffer.rejected_date && (
                    <>
                      <p className="text-sm text-red-600 mt-1">Rejected Date: {formatDate(selectedOffer.rejected_date, 'en')}</p>
                      {selectedOffer.rejection_reason && (
                        <p className="text-sm text-gray-600 mt-1">Reason: {selectedOffer.rejection_reason}</p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 px-6 py-4 flex justify-end">
              <button
                onClick={() => setSelectedOffer(null)}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
