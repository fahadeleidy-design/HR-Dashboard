import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import {
  FileText, DollarSign, Plus, Eye, Send, CheckCircle, XCircle, Clock, TrendingUp
} from 'lucide-react';
import { formatDate, formatNumber } from '@/lib/formatters';

interface JobOffer {
  id: string;
  candidate_id: string;
  offered_salary: number;
  offered_benefits: string;
  start_date: string;
  status: string;
  offer_date: string;
  response_deadline: string;
  accepted_date?: string;
  declined_date?: string;
  candidate?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  job_posting?: {
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
      console.error('Error fetching offers:', error);
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
            candidate:candidates(first_name, last_name),
            job_posting:job_postings(job_title)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) setNegotiations(data);
    } catch (error) {
      console.error('Error fetching negotiations:', error);
    } finally {
      setLoading(false);
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
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
          onClick={() => {}}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
                          {offer.candidate?.first_name} {offer.candidate?.last_name}
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
                      <span className="text-sm text-gray-700">{formatDate(offer.offer_date, 'en')}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-700">{formatDate(offer.response_deadline, 'en')}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(offer.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => setSelectedOffer(offer)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
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
                        {neg.job_offer?.candidate?.first_name} {neg.job_offer?.candidate?.last_name}
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
    </div>
  );
}
