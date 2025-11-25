import { DollarSign, Users, TrendingUp, Calculator, AlertCircle, CheckCircle, Clock, FileText } from 'lucide-react';

interface PayrollDashboardProps {
  batches: any[];
  currentMonth: string;
  onCreateBatch: () => void;
  onViewBatch: (batch: any) => void;
}

export function PayrollDashboard({ batches, currentMonth, onCreateBatch, onViewBatch }: PayrollDashboardProps) {
  const currentMonthBatch = batches.find(b => b.month === currentMonth);
  const previousMonthBatch = batches[1];

  const totalPayroll = batches.reduce((sum, b) => sum + (Number(b.total_net) || 0), 0);
  const averagePayroll = batches.length > 0 ? totalPayroll / batches.length : 0;

  const statusCounts = {
    draft: batches.filter(b => b.status === 'draft').length,
    pending: batches.filter(b => b.status === 'pending_approval').length,
    approved: batches.filter(b => b.status === 'approved').length,
    processed: batches.filter(b => b.status === 'processed').length,
    paid: batches.filter(b => b.status === 'paid').length,
  };

  const growthRate = previousMonthBatch && currentMonthBatch
    ? ((Number(currentMonthBatch.total_net) - Number(previousMonthBatch.total_net)) / Number(previousMonthBatch.total_net)) * 100
    : 0;

  return (
    <div className="space-y-6">
      {currentMonthBatch && (
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold opacity-90">Current Pay Period</h3>
              <p className="text-3xl font-bold mt-2">{currentMonthBatch.month}</p>
              <p className="text-sm opacity-90 mt-2">
                {currentMonthBatch.total_employees} employees • SAR {Number(currentMonthBatch.total_net || 0).toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white bg-opacity-20 rounded-lg">
                <span className="text-sm font-medium">Status:</span>
                <span className="text-sm font-bold uppercase">{currentMonthBatch.status.replace('_', ' ')}</span>
              </div>
              <button
                onClick={() => onViewBatch(currentMonthBatch)}
                className="mt-3 px-6 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-opacity-90 transition-all"
              >
                View Details
              </button>
            </div>
          </div>
        </div>
      )}

      {!currentMonthBatch && (
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">No Payroll for {currentMonth}</h3>
              <p className="text-sm opacity-90 mt-1">Create a new payroll batch to get started</p>
            </div>
            <button
              onClick={onCreateBatch}
              className="px-6 py-3 bg-white text-purple-600 rounded-lg font-medium hover:bg-opacity-90 transition-all shadow-md"
            >
              Create Batch
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Payroll</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                SAR {totalPayroll.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-gray-500 mt-1">All time</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Monthly</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                SAR {averagePayroll.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-gray-500 mt-1">{batches.length} periods</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Calculator className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Growth Rate</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {growthRate > 0 ? '+' : ''}{growthRate.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">vs last month</p>
            </div>
            <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
              growthRate > 0 ? 'bg-green-100' : growthRate < 0 ? 'bg-red-100' : 'bg-gray-100'
            }`}>
              <TrendingUp className={`h-6 w-6 ${
                growthRate > 0 ? 'text-green-600' : growthRate < 0 ? 'text-red-600' : 'text-gray-600'
              }`} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Batches</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{batches.length}</p>
              <p className="text-xs text-gray-500 mt-1">All periods</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
              <FileText className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{statusCounts.draft}</p>
              <p className="text-xs text-gray-600">Draft</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{statusCounts.pending}</p>
              <p className="text-xs text-gray-600">Pending</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{statusCounts.approved}</p>
              <p className="text-xs text-gray-600">Approved</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{statusCounts.processed}</p>
              <p className="text-xs text-gray-600">Processed</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{statusCounts.paid}</p>
              <p className="text-xs text-gray-600">Paid</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
