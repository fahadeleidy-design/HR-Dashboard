import { useState } from 'react';
import {
  Network, Briefcase, DollarSign, TrendingUp, GitBranch
} from 'lucide-react';
import { OrgChartDrillDown } from '../components/orgmgmt/OrgChartDrillDown';
import { PositionManagement } from '../components/orgmgmt/PositionManagement';
import { WorkforcePlanning } from '../components/orgmgmt/WorkforcePlanning';
import { PositionBudgeting } from '../components/orgmgmt/PositionBudgeting';
import { OrgChangeManagement } from '../components/orgmgmt/OrgChangeManagement';

type OrgTab = 'org-chart' | 'positions' | 'budgeting' | 'planning' | 'change-mgmt';

const TABS: { id: OrgTab; label: string; icon: any }[] = [
  { id: 'org-chart', label: 'Org Chart', icon: Network },
  { id: 'positions', label: 'Position Management', icon: Briefcase },
  { id: 'budgeting', label: 'Position Budgeting', icon: DollarSign },
  { id: 'planning', label: 'Workforce Planning', icon: TrendingUp },
  { id: 'change-mgmt', label: 'Change & Matrix', icon: GitBranch },
];

export default function OrganizationalManagement() {
  const [activeTab, setActiveTab] = useState<OrgTab>('org-chart');

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-700 to-slate-900 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-1">
          <Network className="w-7 h-7" />
          <h1 className="text-2xl font-bold">Organizational Management</h1>
        </div>
        <p className="text-slate-300 text-sm">
          Visual org chart, position management, workforce planning, and organizational change
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="border-b border-gray-200 overflow-x-auto">
          <nav className="flex -mb-px min-w-max">
            {TABS.map(tab => {
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
          {activeTab === 'org-chart' && <OrgChartDrillDown />}
          {activeTab === 'positions' && <PositionManagement />}
          {activeTab === 'budgeting' && <PositionBudgeting />}
          {activeTab === 'planning' && <WorkforcePlanning />}
          {activeTab === 'change-mgmt' && <OrgChangeManagement />}
        </div>
      </div>
    </div>
  );
}
