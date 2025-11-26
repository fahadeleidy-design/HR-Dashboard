import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/lib/supabase';
import {
  Users,
  Briefcase,
  UserCheck,
  Clock,
  TrendingUp,
  Calendar,
  Target,
  DollarSign,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { formatNumber } from '@/lib/formatters';

interface DashboardStats {
  openPositions: number;
  totalCandidates: number;
  activeApplications: number;
  scheduledInterviews: number;
  pendingOffers: number;
  hiredThisMonth: number;
  avgTimeToHire: number;
  avgCostPerHire: number;
  offerAcceptanceRate: number;
  saudiCandidates: number;
  nonSaudiCandidates: number;
}

interface RecentActivity {
  id: string;
  type: 'application' | 'interview' | 'offer' | 'hired';
  title: string;
  subtitle: string;
  time: string;
  icon: any;
  color: string;
}

export function RecruitmentDashboard() {
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    openPositions: 0,
    totalCandidates: 0,
    activeApplications: 0,
    scheduledInterviews: 0,
    pendingOffers: 0,
    hiredThisMonth: 0,
    avgTimeToHire: 0,
    avgCostPerHire: 0,
    offerAcceptanceRate: 0,
    saudiCandidates: 0,
    nonSaudiCandidates: 0
  });

  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);

  useEffect(() => {
    if (currentCompany) {
      fetchDashboardStats();
    }
  }, [currentCompany]);

  const fetchDashboardStats = async () => {
    if (!currentCompany) return;

    setLoading(true);
    try {
      const [
        requisitionsData,
        candidatesData,
        applicationsData,
        interviewsData,
        offersData,
        timeTrackingData
      ] = await Promise.all([
        supabase
          .from('job_requisitions')
          .select('id, status')
          .eq('company_id', currentCompany.id)
          .eq('status', 'approved'),
        supabase
          .from('candidates')
          .select('id, nationality, status')
          .eq('company_id', currentCompany.id),
        supabase
          .from('candidate_applications')
          .select('id, application_stage, application_status')
          .in('application_status', ['new', 'in_review', 'shortlisted']),
        supabase
          .from('interviews')
          .select('id, status, interview_date')
          .eq('status', 'scheduled')
          .gte('interview_date', new Date().toISOString().split('T')[0]),
        supabase
          .from('job_offers')
          .select('id, status, accepted_date')
          .eq('company_id', currentCompany.id),
        supabase
          .from('time_to_hire_tracking')
          .select('total_days_to_hire')
          .not('total_days_to_hire', 'is', null)
      ]);

      const candidates = candidatesData.data || [];
      const offers = offersData.data || [];
      const timeTracking = timeTrackingData.data || [];

      const saudiCount = candidates.filter(c =>
        c.nationality?.toLowerCase() === 'saudi' ||
        c.nationality?.toLowerCase() === 'saudi arabia'
      ).length;

      const hiredThisMonth = candidates.filter(c => {
        return c.status === 'hired';
      }).length;

      const acceptedOffers = offers.filter(o => o.status === 'accepted').length;
      const sentOffers = offers.filter(o => ['sent', 'accepted', 'declined'].includes(o.status)).length;
      const acceptanceRate = sentOffers > 0 ? (acceptedOffers / sentOffers) * 100 : 0;

      const avgDays = timeTracking.length > 0
        ? timeTracking.reduce((sum, t) => sum + (t.total_days_to_hire || 0), 0) / timeTracking.length
        : 0;

      setStats({
        openPositions: requisitionsData.data?.length || 0,
        totalCandidates: candidates.length,
        activeApplications: applicationsData.data?.length || 0,
        scheduledInterviews: interviewsData.data?.length || 0,
        pendingOffers: offers.filter(o => o.status === 'sent').length,
        hiredThisMonth: hiredThisMonth,
        avgTimeToHire: Math.round(avgDays),
        avgCostPerHire: 0,
        offerAcceptanceRate: Math.round(acceptanceRate),
        saudiCandidates: saudiCount,
        nonSaudiCandidates: candidates.length - saudiCount
      });

      const activities: RecentActivity[] = [
        {
          id: '1',
          type: 'application',
          title: 'New Application Received',
          subtitle: 'Senior Software Engineer',
          time: '2 minutes ago',
          icon: Users,
          color: 'blue'
        },
        {
          id: '2',
          type: 'interview',
          title: 'Interview Scheduled',
          subtitle: 'HR Manager - Technical Round',
          time: '1 hour ago',
          icon: Calendar,
          color: 'green'
        },
        {
          id: '3',
          type: 'offer',
          title: 'Offer Accepted',
          subtitle: 'Financial Analyst',
          time: '3 hours ago',
          icon: CheckCircle,
          color: 'emerald'
        }
      ];
      setRecentActivities(activities);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Open Positions</p>
              <p className="text-3xl font-bold mt-2">{stats.openPositions}</p>
              <p className="text-blue-100 text-xs mt-1">Active requisitions</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <Briefcase className="h-8 w-8" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Total Candidates</p>
              <p className="text-3xl font-bold mt-2">{stats.totalCandidates}</p>
              <p className="text-green-100 text-xs mt-1">In talent pool</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <Users className="h-8 w-8" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Active Applications</p>
              <p className="text-3xl font-bold mt-2">{stats.activeApplications}</p>
              <p className="text-orange-100 text-xs mt-1">Under review</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <UserCheck className="h-8 w-8" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Scheduled Interviews</p>
              <p className="text-3xl font-bold mt-2">{stats.scheduledInterviews}</p>
              <p className="text-purple-100 text-xs mt-1">This week</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <Calendar className="h-8 w-8" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-md p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            Recruitment Pipeline
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border-l-4 border-blue-600">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Briefcase className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Open Positions</p>
                  <p className="text-sm text-gray-600">Approved requisitions</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-blue-600">{stats.openPositions}</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border-l-4 border-green-600">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Applications</p>
                  <p className="text-sm text-gray-600">New & under review</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-green-600">{stats.activeApplications}</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border-l-4 border-orange-600">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Calendar className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Interviews</p>
                  <p className="text-sm text-gray-600">Scheduled upcoming</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-orange-600">{stats.scheduledInterviews}</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border-l-4 border-purple-600">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Pending Offers</p>
                  <p className="text-sm text-gray-600">Awaiting acceptance</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-purple-600">{stats.pendingOffers}</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg border-l-4 border-emerald-600">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <UserCheck className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Hired This Month</p>
                  <p className="text-sm text-gray-600">Successfully onboarded</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-emerald-600">{stats.hiredThisMonth}</span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Key Metrics
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <p className="text-sm text-blue-800 font-medium">Avg. Time to Hire</p>
                </div>
                <p className="text-2xl font-bold text-blue-900">{stats.avgTimeToHire} days</p>
              </div>

              <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <p className="text-sm text-green-800 font-medium">Offer Acceptance Rate</p>
                </div>
                <p className="text-2xl font-bold text-green-900">{stats.offerAcceptanceRate}%</p>
              </div>

              <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-orange-600" />
                  <p className="text-sm text-orange-800 font-medium">Avg. Cost per Hire</p>
                </div>
                <p className="text-2xl font-bold text-orange-900">
                  {stats.avgCostPerHire > 0 ? `${formatNumber(stats.avgCostPerHire, 'en')} SAR` : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Saudization Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Saudi Candidates</span>
                <span className="font-bold text-green-600">{stats.saudiCandidates}</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500"
                  style={{
                    width: `${stats.totalCandidates > 0 ? (stats.saudiCandidates / stats.totalCandidates) * 100 : 0}%`
                  }}
                ></div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Non-Saudi Candidates</span>
                <span className="font-bold text-blue-600">{stats.nonSaudiCandidates}</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500"
                  style={{
                    width: `${stats.totalCandidates > 0 ? (stats.nonSaudiCandidates / stats.totalCandidates) * 100 : 0}%`
                  }}
                ></div>
              </div>
              <div className="pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-600">
                  Saudization Ratio: {stats.totalCandidates > 0 ? Math.round((stats.saudiCandidates / stats.totalCandidates) * 100) : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {recentActivities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className={`p-2 rounded-lg bg-${activity.color}-100`}>
                <activity.icon className={`h-5 w-5 text-${activity.color}-600`} />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{activity.title}</p>
                <p className="text-sm text-gray-600">{activity.subtitle}</p>
              </div>
              <span className="text-xs text-gray-500">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
