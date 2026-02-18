import { useState } from 'react';
import {
  BarChart3, TrendingUp, Users, Target, Brain, Shield, Briefcase
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ExecutiveDashboard } from '../components/analytics/ExecutiveDashboard';
import { ManagerDashboard } from '../components/analytics/ManagerDashboard';
import { EmployeePersonalDashboard } from '../components/analytics/EmployeePersonalDashboard';
import { HeadcountAnalysis } from '../components/analytics/HeadcountAnalysis';
import { TurnoverAnalysis } from '../components/analytics/TurnoverAnalysis';
import { PredictiveAnalytics } from '../components/analytics/PredictiveAnalytics';
import { DiversityMetrics } from '../components/analytics/DiversityMetrics';
import { BenchmarkingReport } from '../components/analytics/BenchmarkingReport';

type AnalyticsTab = 'executive' | 'manager' | 'employee' | 'headcount' | 'turnover' | 'predictive' | 'diversity' | 'benchmarking';

const TABS: { id: AnalyticsTab; label: string; icon: any; roles: string[] }[] = [
  { id: 'executive', label: 'Executive Dashboard', icon: BarChart3, roles: ['super_admin', 'admin', 'hr', 'finance'] },
  { id: 'manager', label: 'Manager Dashboard', icon: Briefcase, roles: ['super_admin', 'admin', 'hr', 'manager'] },
  { id: 'employee', label: 'My Dashboard', icon: Users, roles: ['super_admin', 'admin', 'hr', 'manager', 'finance', 'employee'] },
  { id: 'headcount', label: 'Headcount Analysis', icon: Users, roles: ['super_admin', 'admin', 'hr', 'finance'] },
  { id: 'turnover', label: 'Turnover & Retention', icon: TrendingUp, roles: ['super_admin', 'admin', 'hr'] },
  { id: 'predictive', label: 'Predictive Analytics', icon: Brain, roles: ['super_admin', 'admin', 'hr'] },
  { id: 'diversity', label: 'Diversity & Inclusion', icon: Shield, roles: ['super_admin', 'admin', 'hr'] },
  { id: 'benchmarking', label: 'Benchmarking', icon: Target, roles: ['super_admin', 'admin', 'hr', 'finance'] },
];

export default function WorkforceAnalytics() {
  const { userRole } = useAuth();
  const role = userRole?.role || 'employee';

  const visibleTabs = TABS.filter(t => t.roles.includes(role));
  const defaultTab = role === 'employee' ? 'employee' : role === 'manager' ? 'manager' : 'executive';
  const [activeTab, setActiveTab] = useState<AnalyticsTab>(defaultTab);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-700 to-slate-900 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-1">
          <BarChart3 className="w-7 h-7" />
          <h1 className="text-2xl font-bold">Workforce Analytics</h1>
        </div>
        <p className="text-slate-300 text-sm">
          Real-time HR dashboards, predictive analytics, and benchmarking insights
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="border-b border-gray-200 overflow-x-auto">
          <nav className="flex -mb-px min-w-max">
            {visibleTabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-3.5 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'border-slate-700 text-slate-700'
                      : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300'
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
          {activeTab === 'executive' && <ExecutiveDashboard />}
          {activeTab === 'manager' && <ManagerDashboard />}
          {activeTab === 'employee' && <EmployeePersonalDashboard />}
          {activeTab === 'headcount' && <HeadcountAnalysis />}
          {activeTab === 'turnover' && <TurnoverAnalysis />}
          {activeTab === 'predictive' && <PredictiveAnalytics />}
          {activeTab === 'diversity' && <DiversityMetrics />}
          {activeTab === 'benchmarking' && <BenchmarkingReport />}
        </div>
      </div>
    </div>
  );
}
