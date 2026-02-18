import { useState } from 'react';
import { DollarSign, FileText, Settings, BarChart3, Download, Shield } from 'lucide-react';
import ComprehensivePayrollDashboard from '../components/payroll/ComprehensivePayrollDashboard';
import WPSFileGenerator from '../components/payroll/WPSFileGenerator';

export default function PayrollV2() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'components' | 'wps' | 'reports' | 'settings'>('dashboard');

  const tabs = [
    { id: 'dashboard' as const, label: 'Payroll Dashboard', icon: DollarSign },
    { id: 'wps' as const, label: 'WPS Files', icon: Shield },
    { id: 'reports' as const, label: 'Reports', icon: BarChart3 },
    { id: 'settings' as const, label: 'Settings', icon: Settings },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-800 rounded-lg p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <DollarSign className="w-8 h-8" />
          <h1 className="text-3xl font-bold">Comprehensive Payroll System</h1>
        </div>
        <p className="text-green-100">
          Complete payroll processing with GOSI, WPS, tax calculations, and Saudi compliance
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
                      ? 'border-green-600 text-green-600'
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
          {activeTab === 'dashboard' && <ComprehensivePayrollDashboard />}
          {activeTab === 'wps' && <WPSFileGenerator />}
          {activeTab === 'reports' && <PayrollReports />}
          {activeTab === 'settings' && <PayrollSettings />}
        </div>
      </div>
    </div>
  );
}

function PayrollReports() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Payroll Reports</h2>
        <p className="text-sm text-gray-600 mt-1">
          Comprehensive payroll analytics and statutory reports
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { name: 'Payroll Register', description: 'Detailed payroll breakdown by employee', icon: FileText },
          { name: 'GOSI Report', description: 'Monthly GOSI contributions report', icon: Shield },
          { name: 'Tax Report', description: 'Income tax withholding summary', icon: FileText },
          { name: 'Cost Center Report', description: 'Payroll costs by cost center', icon: BarChart3 },
          { name: 'Bank Transfer File', description: 'Bank file for salary transfers', icon: Download },
          { name: 'Payroll Summary', description: 'Executive payroll summary', icon: DollarSign },
        ].map((report, index) => {
          const Icon = report.icon;
          return (
            <div
              key={index}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{report.name}</h3>
                  <p className="text-sm text-gray-600">{report.description}</p>
                  <button className="text-sm text-green-600 hover:text-green-700 font-medium mt-2">
                    Generate →
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PayrollSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Payroll Settings</h2>
        <p className="text-sm text-gray-600 mt-1">
          Configure payroll components, calendars, and calculation rules
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">GOSI Configuration</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Saudi Employee Rate
              </label>
              <input
                type="number"
                step="0.01"
                defaultValue="9.75"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                readOnly
              />
              <p className="text-xs text-gray-500 mt-1">9% pension + 0.75% unemployment</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Saudi Employer Rate
              </label>
              <input
                type="number"
                step="0.01"
                defaultValue="12.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Non-Saudi Rate (Both)
              </label>
              <input
                type="number"
                step="0.01"
                defaultValue="2.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                readOnly
              />
              <p className="text-xs text-gray-500 mt-1">Occupational hazards only</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Contribution Base
              </label>
              <input
                type="number"
                defaultValue="45000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                readOnly
              />
              <p className="text-xs text-gray-500 mt-1">SAR per month (2024 limit)</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payroll Calendar</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payroll Frequency
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                <option>Monthly</option>
                <option>Semi-Monthly</option>
                <option>Bi-Weekly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Day
              </label>
              <input
                type="number"
                min="1"
                max="31"
                defaultValue="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">Day of month for salary payment</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Attendance Cutoff Day
              </label>
              <input
                type="number"
                min="1"
                max="31"
                defaultValue="25"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">Last day to include attendance</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Calculation Lead Days
              </label>
              <input
                type="number"
                min="1"
                max="15"
                defaultValue="5"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">Days before payment for processing</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tax & Zakat</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Income Tax Threshold
              </label>
              <input
                type="number"
                defaultValue="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">Monthly income threshold for tax</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Zakat Rate (Saudi Nationals)
              </label>
              <input
                type="number"
                step="0.01"
                defaultValue="2.50"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">Percentage of zakatable income</p>
            </div>
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span className="text-sm text-gray-700">Auto-deduct Zakat</span>
              </label>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ramadan Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span className="text-sm text-gray-700">
                  Adjust working hours during Ramadan
                </span>
              </label>
              <p className="text-xs text-gray-500 mt-1 ml-6">
                Automatically reduce working hours by 2 hours per Saudi labor law
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ramadan Working Hours
              </label>
              <input
                type="number"
                defaultValue="6"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">Hours per day during Ramadan</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
