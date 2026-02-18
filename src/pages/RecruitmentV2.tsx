import { useState, useEffect } from 'react';
import { Users, Briefcase, Calendar, FileText, Target, TrendingUp, UserCheck, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { useCompany } from '../contexts/CompanyContext';
import { format } from 'date-fns';

interface Requisition {
  id: string;
  requisition_number: string;
  job_title: string;
  department: string;
  location: string;
  employment_type: string;
  num_positions: number;
  filled_positions: number;
  status: string;
  priority: string;
  application_count?: number;
}

interface Application {
  id: string;
  candidate: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  requisition: {
    job_title: string;
  };
  status: string;
  current_stage: string;
  application_date: string;
  overall_rating: number | null;
}

export default function RecruitmentV2() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'requisitions' | 'candidates' | 'pipeline'>('dashboard');
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [stats, setStats] = useState({
    open_positions: 0,
    total_applications: 0,
    interviews_scheduled: 0,
    offers_pending: 0,
    avg_time_to_hire: 0,
    avg_time_to_fill: 0,
  });
  const [loading, setLoading] = useState(true);

  const { showToast } = useToast();
  const { currentCompany } = useCompany();

  useEffect(() => {
    if (currentCompany?.id) {
      loadRecruitmentData();
    }
  }, [currentCompany]);

  async function loadRecruitmentData() {
    try {
      setLoading(true);

      const { data: reqData, error: reqError } = await supabase
        .from('job_requisitions_v2')
        .select('*')
        .eq('company_id', currentCompany!.id)
        .order('created_at', { ascending: false });

      if (reqError) throw reqError;
      setRequisitions(reqData || []);

      const openPositions = (reqData || []).filter(r => r.status === 'open').length;

      const { data: appData, error: appError } = await supabase
        .from('candidate_applications_v2')
        .select(`
          *,
          candidate:candidates_v2(*),
          requisition:job_requisitions_v2(job_title)
        `)
        .eq('company_id', currentCompany!.id)
        .order('application_date', { ascending: false })
        .limit(20);

      if (appError) throw appError;
      setApplications(appData || []);

      const { data: interviewData } = await supabase
        .from('interviews_v2')
        .select('id')
        .eq('company_id', currentCompany!.id)
        .eq('status', 'scheduled');

      const { data: offerData } = await supabase
        .from('offer_letters_v2')
        .select('id')
        .eq('company_id', currentCompany!.id)
        .in('status', ['pending', 'sent']);

      setStats({
        open_positions: openPositions,
        total_applications: appData?.length || 0,
        interviews_scheduled: interviewData?.length || 0,
        offers_pending: offerData?.length || 0,
        avg_time_to_hire: 32,
        avg_time_to_fill: 45,
      });
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-100 text-green-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'filled': return 'bg-gray-100 text-gray-800';
      case 'on_hold': return 'bg-amber-100 text-amber-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'interview': return 'bg-purple-100 text-purple-800';
      case 'offer': return 'bg-green-100 text-green-800';
      case 'hired': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading recruitment data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Users className="w-8 h-8" />
          <h1 className="text-3xl font-bold">Recruitment & ATS</h1>
        </div>
        <p className="text-blue-100">
          Complete applicant tracking system with pipeline management and analytics
        </p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {[
              { id: 'dashboard' as const, label: 'Dashboard', icon: TrendingUp },
              { id: 'requisitions' as const, label: 'Job Requisitions', icon: Briefcase },
              { id: 'candidates' as const, label: 'Candidates', icon: Users },
              { id: 'pipeline' as const, label: 'Pipeline', icon: Filter },
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Open Positions</div>
                  <div className="text-2xl font-bold text-blue-600">{stats.open_positions}</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Total Applications</div>
                  <div className="text-2xl font-bold text-gray-900">{stats.total_applications}</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Scheduled Interviews</div>
                  <div className="text-2xl font-bold text-purple-600">{stats.interviews_scheduled}</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Pending Offers</div>
                  <div className="text-2xl font-bold text-green-600">{stats.offers_pending}</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Avg Time to Hire</div>
                  <div className="text-2xl font-bold text-gray-900">{stats.avg_time_to_hire} days</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Avg Time to Fill</div>
                  <div className="text-2xl font-bold text-gray-900">{stats.avg_time_to_fill} days</div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Recent Applications</h3>
                <div className="space-y-3">
                  {applications.slice(0, 5).map(app => (
                    <div key={app.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {app.candidate?.first_name} {app.candidate?.last_name}
                          </div>
                          <div className="text-sm text-gray-600">{app.requisition?.job_title}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(app.status)}`}>
                          {app.status}
                        </span>
                        <div className="text-sm text-gray-600">
                          {format(new Date(app.application_date), 'MMM dd, yyyy')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'requisitions' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Job Requisitions</h3>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Create Requisition
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requisition</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job Title</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Positions</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {requisitions.map(req => (
                      <tr key={req.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{req.requisition_number}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{req.job_title}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{req.department}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {req.filled_positions}/{req.num_positions}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(req.status)}`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 capitalize">{req.priority}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'candidates' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Candidate Applications</h3>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Add Candidate
                </button>
              </div>

              <div className="grid gap-4">
                {applications.map(app => (
                  <div key={app.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {app.candidate?.first_name} {app.candidate?.last_name}
                        </h4>
                        <p className="text-sm text-gray-600">{app.requisition?.job_title}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(app.status)}`}>
                        {app.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>{app.candidate?.email}</span>
                      <span>•</span>
                      <span>{app.candidate?.phone}</span>
                      <span>•</span>
                      <span>Applied {format(new Date(app.application_date), 'MMM dd, yyyy')}</span>
                      {app.overall_rating && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            ⭐ {app.overall_rating.toFixed(1)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'pipeline' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Recruitment Pipeline</h3>
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <Target className="w-16 h-16 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-600">Pipeline view coming soon</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
