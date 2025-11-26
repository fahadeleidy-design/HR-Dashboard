import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { History, TrendingUp, TrendingDown, Calendar, User } from 'lucide-react';
import { formatNumber, formatDate } from '@/lib/formatters';

interface SalaryHistory {
  id: string;
  old_basic_salary: number;
  new_basic_salary: number;
  old_allowances: {
    housing: number;
    transport: number;
    food: number;
    mobile: number;
    other: number;
  };
  new_allowances: {
    housing: number;
    transport: number;
    food: number;
    mobile: number;
    other: number;
  };
  effective_date: string;
  change_reason: string;
  changed_by: string;
  created_at: string;
}

interface SalaryHistoryViewerProps {
  employeeId: string;
  employeeName: string;
}

export function SalaryHistoryViewer({ employeeId, employeeName }: SalaryHistoryViewerProps) {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<SalaryHistory[]>([]);

  useEffect(() => {
    fetchSalaryHistory();
  }, [employeeId]);

  const fetchSalaryHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('salary_history')
        .select('*')
        .eq('employee_id', employeeId)
        .order('effective_date', { ascending: false });

      if (!error && data) {
        setHistory(data);
      }
    } catch (error) {
      console.error('Error fetching salary history:', error);
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

  const calculateOldTotal = (record: SalaryHistory) => {
    const allowances = record.old_allowances || {};
    return record.old_basic_salary + (allowances.housing || 0) + (allowances.transport || 0) +
           (allowances.food || 0) + (allowances.mobile || 0) + (allowances.other || 0);
  };

  const calculateNewTotal = (record: SalaryHistory) => {
    const allowances = record.new_allowances || {};
    return record.new_basic_salary + (allowances.housing || 0) + (allowances.transport || 0) +
           (allowances.food || 0) + (allowances.mobile || 0) + (allowances.other || 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <History className="h-6 w-6 text-blue-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Salary History</h2>
          <p className="text-gray-600">{employeeName}</p>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-200">
          <History className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Salary History</h3>
          <p className="text-gray-600">No salary adjustments have been recorded for this employee</p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((record, index) => {
            const oldTotal = calculateOldTotal(record);
            const newTotal = calculateNewTotal(record);
            const totalIncrease = newTotal - oldTotal;
            const increasePercentage = ((totalIncrease / oldTotal) * 100).toFixed(2);
            const isIncrease = totalIncrease > 0;

            return (
              <div key={record.id} className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                <div className={`p-4 ${isIncrease ? 'bg-gradient-to-r from-green-50 to-green-100' : 'bg-gradient-to-r from-red-50 to-red-100'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isIncrease ? 'bg-green-500' : 'bg-red-500'}`}>
                        {isIncrease ? (
                          <TrendingUp className="h-5 w-5 text-white" />
                        ) : (
                          <TrendingDown className="h-5 w-5 text-white" />
                        )}
                      </div>
                      <div>
                        <p className={`font-bold text-lg ${isIncrease ? 'text-green-700' : 'text-red-700'}`}>
                          {isIncrease ? '+' : ''}{formatNumber(totalIncrease, 'en')} SAR ({isIncrease ? '+' : ''}{increasePercentage}%)
                        </p>
                        <p className="text-sm text-gray-600">
                          Effective: {formatDate(record.effective_date, 'en')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${isIncrease ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                        {index === 0 ? 'Latest' : `${index + 1} changes ago`}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                        Previous Compensation
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Basic Salary</span>
                          <span className="font-semibold">{formatNumber(record.old_basic_salary, 'en')}</span>
                        </div>
                        {record.old_allowances?.housing > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Housing</span>
                            <span>{formatNumber(record.old_allowances.housing, 'en')}</span>
                          </div>
                        )}
                        {record.old_allowances?.transport > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Transport</span>
                            <span>{formatNumber(record.old_allowances.transport, 'en')}</span>
                          </div>
                        )}
                        {record.old_allowances?.food > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Food</span>
                            <span>{formatNumber(record.old_allowances.food, 'en')}</span>
                          </div>
                        )}
                        <div className="flex justify-between pt-2 border-t border-gray-200">
                          <span className="font-bold text-gray-900">Total</span>
                          <span className="font-bold">{formatNumber(oldTotal, 'en')}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                        New Compensation
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Basic Salary</span>
                          <span className="font-semibold text-blue-700">{formatNumber(record.new_basic_salary, 'en')}</span>
                        </div>
                        {record.new_allowances?.housing > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Housing</span>
                            <span className="text-blue-700">{formatNumber(record.new_allowances.housing, 'en')}</span>
                          </div>
                        )}
                        {record.new_allowances?.transport > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Transport</span>
                            <span className="text-blue-700">{formatNumber(record.new_allowances.transport, 'en')}</span>
                          </div>
                        )}
                        {record.new_allowances?.food > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Food</span>
                            <span className="text-blue-700">{formatNumber(record.new_allowances.food, 'en')}</span>
                          </div>
                        )}
                        <div className="flex justify-between pt-2 border-t border-gray-200">
                          <span className="font-bold text-gray-900">Total</span>
                          <span className="font-bold text-blue-700">{formatNumber(newTotal, 'en')}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Effective Date
                        </p>
                        <p className="font-semibold text-gray-900">{formatDate(record.effective_date, 'en')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Recorded On
                        </p>
                        <p className="font-semibold text-gray-900">{formatDate(record.created_at, 'en')}</p>
                      </div>
                    </div>
                    {record.change_reason && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-600 mb-1">Reason</p>
                        <p className="text-sm text-gray-900">{record.change_reason}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
        <h3 className="font-bold text-gray-900 mb-4">Salary Growth Summary</h3>
        {history.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Total Adjustments</p>
              <p className="text-2xl font-bold text-blue-700">{history.length}</p>
              <p className="text-xs text-gray-500 mt-1">Recorded changes</p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">First Salary</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(history[history.length - 1]?.old_basic_salary || 0, 'en')}
              </p>
              <p className="text-xs text-gray-500 mt-1">SAR basic</p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Current Salary</p>
              <p className="text-2xl font-bold text-green-700">
                {formatNumber(history[0]?.new_basic_salary || 0, 'en')}
              </p>
              <p className="text-xs text-gray-500 mt-1">SAR basic</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
