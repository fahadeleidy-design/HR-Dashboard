import { useState } from 'react';
import { Shield, Settings, Calendar, BarChart3, FileText } from 'lucide-react';
import ReportConfigurationManager from '../components/governance/ReportConfigurationManager';
import ReportSchedulingManager from '../components/governance/ReportSchedulingManager';

export default function GovernanceReporting() {
  const [activeTab, setActiveTab] = useState<'configure' | 'schedules' | 'executions' | 'compliance'>('configure');

  const tabs = [
    { id: 'configure' as const, label: 'Report Configuration', icon: Settings },
    { id: 'schedules' as const, label: 'Schedules', icon: Calendar },
    { id: 'executions' as const, label: 'Execution History', icon: FileText },
    { id: 'compliance' as const, label: 'Compliance Audit', icon: Shield },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8" />
          <h1 className="text-3xl font-bold">Governance Reporting</h1>
        </div>
        <p className="text-blue-100">
          Automated report generation with role-based distribution, secure delivery, and compliance tracking
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
          {activeTab === 'configure' && <ReportConfigurationManager />}
          {activeTab === 'schedules' && <ReportSchedulingManager />}
          {activeTab === 'executions' && <ExecutionHistory />}
          {activeTab === 'compliance' && <ComplianceAudit />}
        </div>
      </div>
    </div>
  );
}

function ExecutionHistory() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Report Execution History</h2>
        <p className="text-sm text-gray-600 mt-1">
          Monitor report generation status and download completed reports
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
        <FileText className="w-12 h-12 text-blue-400 mx-auto mb-3" />
        <p className="text-blue-900 font-medium mb-2">Report Execution Engine</p>
        <p className="text-sm text-blue-700">
          Report execution history and download functionality will be available here. <br />
          Monitor generation status, view details, and download completed reports.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-2">Total Executions</div>
          <div className="text-3xl font-bold text-gray-900">0</div>
          <div className="text-xs text-gray-500 mt-1">All time</div>
        </div>
        <div className="bg-white border border-green-200 rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-2">Completed</div>
          <div className="text-3xl font-bold text-green-600">0</div>
          <div className="text-xs text-gray-500 mt-1">Success rate: -</div>
        </div>
        <div className="bg-white border border-blue-200 rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-2">In Progress</div>
          <div className="text-3xl font-bold text-blue-600">0</div>
          <div className="text-xs text-gray-500 mt-1">Currently running</div>
        </div>
        <div className="bg-white border border-red-200 rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-2">Failed</div>
          <div className="text-3xl font-bold text-red-600">0</div>
          <div className="text-xs text-gray-500 mt-1">Require attention</div>
        </div>
      </div>
    </div>
  );
}

function ComplianceAudit() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Compliance Audit Log</h2>
        <p className="text-sm text-gray-600 mt-1">
          Complete audit trail of all report access and distribution events
        </p>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <Shield className="w-12 h-12 text-green-400 mx-auto mb-3" />
        <p className="text-green-900 font-medium mb-2">Compliance Logging Active</p>
        <p className="text-sm text-green-700">
          All report generation, distribution, and access events are automatically logged. <br />
          Detailed audit trail available for compliance officers and administrators.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-2">Total Events Logged</div>
          <div className="text-3xl font-bold text-gray-900">0</div>
          <div className="text-xs text-gray-500 mt-1">All time</div>
        </div>
        <div className="bg-white border border-amber-200 rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-2">PII Access Events</div>
          <div className="text-3xl font-bold text-amber-600">0</div>
          <div className="text-xs text-gray-500 mt-1">Requires tracking</div>
        </div>
        <div className="bg-white border border-blue-200 rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-2">Encrypted Deliveries</div>
          <div className="text-3xl font-bold text-blue-600">0</div>
          <div className="text-xs text-gray-500 mt-1">Secure transmissions</div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Compliance Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <div className="font-medium text-gray-900">Automatic Event Logging</div>
              <div className="text-sm text-gray-600">
                All report activities automatically logged with full audit trail
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <div className="font-medium text-gray-900">Role-Based Access Control</div>
              <div className="text-sm text-gray-600">
                Data filtered based on user roles and permissions
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <div className="font-medium text-gray-900">Encryption Support</div>
              <div className="text-sm text-gray-600">
                Sensitive reports encrypted before email delivery
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <div className="font-medium text-gray-900">Approval Workflows</div>
              <div className="text-sm text-gray-600">
                Mandatory approvals for sensitive or restricted reports
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
