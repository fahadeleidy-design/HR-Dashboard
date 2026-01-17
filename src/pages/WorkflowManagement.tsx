import React, { useState } from 'react';
import { Workflow, BarChart3, Users, Settings } from 'lucide-react';
import WorkflowDashboard from '../components/workflow/WorkflowDashboard';
import WorkflowBuilder from '../components/workflow/WorkflowBuilder';
import WorkflowAnalytics from '../components/workflow/WorkflowAnalytics';
import WorkflowDelegation from '../components/workflow/WorkflowDelegation';

type Tab = 'dashboard' | 'builder' | 'analytics' | 'delegations';

export default function WorkflowManagement() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  const tabs = [
    { id: 'dashboard' as Tab, label: 'Dashboard', icon: Workflow },
    { id: 'builder' as Tab, label: 'Builder', icon: Settings },
    { id: 'analytics' as Tab, label: 'Analytics', icon: BarChart3 },
    { id: 'delegations' as Tab, label: 'Delegations', icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm
                    ${activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div>
        {activeTab === 'dashboard' && <WorkflowDashboard />}
        {activeTab === 'builder' && <WorkflowBuilder />}
        {activeTab === 'analytics' && <WorkflowAnalytics />}
        {activeTab === 'delegations' && <WorkflowDelegation />}
      </div>
    </div>
  );
}
