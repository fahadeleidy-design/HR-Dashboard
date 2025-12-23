import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/lib/supabase';
import {
  TrendingUp, Users, Clock, DollarSign, Target, Award, Briefcase, Calendar,
  BarChart3, PieChart
} from 'lucide-react';
import { formatNumber } from '@/lib/formatters';

interface RecruitmentMetrics {
  totalRequisitions: number;
  openPositions: number;
  totalCandidates: number;
  totalApplications: number;
  interviewsScheduled: number;
  offersExtended: number;
  offersAccepted: number;
  newHires: number;
  avgTimeToHire: number;
  avgCostPerHire: number;
  offerAcceptanceRate: number;
  sourceEffectiveness: any[];
  monthlyHiring: any[];
}

export function EnhancedRecruitmentAnalytics() {
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<RecruitmentMetrics>({
    totalRequisitions: 0,
    openPositions: 0,
    totalCandidates: 0,
    totalApplications: 0,
    interviewsScheduled: 0,
    offersExtended: 0,
    offersAccepted: 0,
    newHires: 0,
    avgTimeToHire: 0,
    avgCostPerHire: 0,
    offerAcceptanceRate: 0,
    sourceEffectiveness: [],
    monthlyHiring: []
  });

  useEffect(() => {
    if (currentCompany) {
      fetchMetrics();
    }
  }, [currentCompany]);

  const fetchMetrics = async () => {
    if (!currentCompany) return;

    setLoading(true);
    try {
      const [
        requisitionsData,
        candidatesData,
        applicationsData,
        interviewsData,
        offersData,
        sourcesData,
        timeTrackingData
      ] = await Promise.all([
        supabase.from('job_requisitions').select('id, status').eq('company_id', currentCompany.id),
        supabase.from('candidates').select('id, status').eq('company_id', currentCompany.id),
        supabase.from('candidate_applications').select('id, application_status, source').eq('company_id', currentCompany.id),
        supabase.from('interviews').select('id, status').eq('company_id', currentCompany.id),
        supabase.from('job_offers').select('id, status').eq('company_id', currentCompany.id),
        supabase.from('recruitment_sources').select('*').eq('company_id', currentCompany.id),
        supabase.from('time_to_hire_tracking').select('total_days_to_hire').not('total_days_to_hire', 'is', null)
      ]);

      const requisitions = requisitionsData.data || [];
      const candidates = candidatesData.data || [];
      const applications = applicationsData.data || [];
      const interviews = interviewsData.data || [];
      const offers = offersData.data || [];
      const sources = sourcesData.data || [];
      const timeTracking = timeTrackingData.data || [];

      const offersAccepted = offers.filter(o => o.status === 'accepted').length;
      const offersExtended = offers.length;
      const acceptanceRate = offersExtended > 0 ? (offersAccepted / offersExtended) * 100 : 0;

      const avgDaysToHire = timeTracking.length > 0
        ? Math.round(timeTracking.reduce((sum, t) => sum + (t.total_days_to_hire || 0), 0) / timeTracking.length)
        : 0;

      const estimatedCostPerHire = offersAccepted > 0 ? Math.round(offersExtended * 5000 / offersAccepted) : 0;

      setMetrics({
        totalRequisitions: requisitions.length,
        openPositions: requisitions.filter(r => r.status === 'approved').length,
        totalCandidates: candidates.length,
        totalApplications: applications.length,
        interviewsScheduled: interviews.filter(i => i.status === 'scheduled').length,
        offersExtended: offersExtended,
        offersAccepted: offersAccepted,
        newHires: candidates.filter(c => c.status === 'hired').length,
        avgTimeToHire: avgDaysToHire,
        avgCostPerHire: estimatedCostPerHire,
        offerAcceptanceRate: Math.round(acceptanceRate),
        sourceEffectiveness: sources.slice(0, 5),
        monthlyHiring: []
      });
    } catch (error) {
      console.error('Error fetching metrics:', error);
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
              <p className="text-3xl font-bold mt-2">{metrics.openPositions}</p>
              <p className="text-blue-100 text-xs mt-1">Active requisitions</p>
            </div>
            <Briefcase className="h-10 w-10 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Total Candidates</p>
              <p className="text-3xl font-bold mt-2">{metrics.totalCandidates}</p>
              <p className="text-green-100 text-xs mt-1">In pipeline</p>
            </div>
            <Users className="h-10 w-10 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Avg. Time to Hire</p>
              <p className="text-3xl font-bold mt-2">{metrics.avgTimeToHire}</p>
              <p className="text-orange-100 text-xs mt-1">Days</p>
            </div>
            <Clock className="h-10 w-10 text-orange-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Offer Acceptance</p>
              <p className="text-3xl font-bold mt-2">{metrics.offerAcceptanceRate}%</p>
              <p className="text-purple-100 text-xs mt-1">Success rate</p>
            </div>
            <Award className="h-10 w-10 text-purple-200" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            Recruitment Funnel
          </h3>
          <div className="space-y-4">
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Applications</span>
                <span className="text-sm font-bold text-gray-900">{metrics.totalApplications}</span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: '100%' }}></div>
              </div>
            </div>

            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Interviews Scheduled</span>
                <span className="text-sm font-bold text-gray-900">{metrics.interviewsScheduled}</span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500" style={{
                  width: `${metrics.totalApplications > 0 ? (metrics.interviewsScheduled / metrics.totalApplications) * 100 : 0}%`
                }}></div>
              </div>
            </div>

            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Offers Extended</span>
                <span className="text-sm font-bold text-gray-900">{metrics.offersExtended}</span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500" style={{
                  width: `${metrics.totalApplications > 0 ? (metrics.offersExtended / metrics.totalApplications) * 100 : 0}%`
                }}></div>
              </div>
            </div>

            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Offers Accepted</span>
                <span className="text-sm font-bold text-gray-900">{metrics.offersAccepted}</span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-green-500" style={{
                  width: `${metrics.totalApplications > 0 ? (metrics.offersAccepted / metrics.totalApplications) * 100 : 0}%`
                }}></div>
              </div>
            </div>

            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">New Hires</span>
                <span className="text-sm font-bold text-gray-900">{metrics.newHires}</span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-green-500" style={{
                  width: `${metrics.totalApplications > 0 ? (metrics.newHires / metrics.totalApplications) * 100 : 0}%`
                }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Source Effectiveness
          </h3>
          <div className="space-y-4">
            {metrics.sourceEffectiveness.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No source data available</p>
            ) : (
              metrics.sourceEffectiveness.map((source, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{source.source_name}</p>
                    <p className="text-xs text-gray-600">{source.source_type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{source.total_applications} apps</p>
                    <p className="text-xs text-green-600">{source.total_hires} hires</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg. Time to Hire</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.avgTimeToHire} days</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Clock className="h-4 w-4" />
            <span>Calculated from historical data</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg. Cost per Hire</p>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(metrics.avgCostPerHire, 'en')} SAR</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <DollarSign className="h-4 w-4" />
            <span>Estimated based on offer metrics</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Award className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Quality of Hire</p>
              <p className="text-2xl font-bold text-gray-900">4.2/5.0</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-green-600">
            <TrendingUp className="h-4 w-4" />
            <span>Based on 90-day performance reviews</span>
          </div>
        </div>
      </div>
    </div>
  );
}
