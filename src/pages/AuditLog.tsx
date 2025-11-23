import { useState, useEffect } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/lib/supabase';
import { Shield, Search, Filter, Calendar, User, FileText, Eye, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  action_description: string;
  table_name: string;
  record_id: string;
  old_values: any;
  new_values: any;
  user_id: string;
  employee_number: string | null;
  employee_first_name: string | null;
  employee_last_name: string | null;
  user_role: string | null;
  company_name: string | null;
}

export function AuditLog() {
  const { currentCompany } = useCompany();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const [filters, setFilters] = useState({
    searchTerm: '',
    action: '',
    table: '',
    dateFrom: '',
    dateTo: '',
  });

  const [availableTables, setAvailableTables] = useState<string[]>([]);

  useEffect(() => {
    if (currentCompany) {
      loadAuditLogs();
    }
  }, [currentCompany]);

  useEffect(() => {
    applyFilters();
  }, [logs, filters]);

  const loadAuditLogs = async () => {
    if (!currentCompany) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('audit_log_detailed')
      .select('*')
      .eq('company_id', currentCompany.id)
      .order('timestamp', { ascending: false })
      .limit(1000);

    if (!error && data) {
      setLogs(data);
      const tables = [...new Set(data.map(log => log.table_name))].sort();
      setAvailableTables(tables);
    }
    setLoading(false);
  };

  const applyFilters = () => {
    let filtered = [...logs];

    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(log =>
        log.action_description?.toLowerCase().includes(term) ||
        log.table_name?.toLowerCase().includes(term) ||
        log.employee_first_name?.toLowerCase().includes(term) ||
        log.employee_last_name?.toLowerCase().includes(term) ||
        log.employee_number?.toLowerCase().includes(term)
      );
    }

    if (filters.action) {
      filtered = filtered.filter(log => log.action === filters.action);
    }

    if (filters.table) {
      filtered = filtered.filter(log => log.table_name === filters.table);
    }

    if (filters.dateFrom) {
      filtered = filtered.filter(log =>
        new Date(log.timestamp) >= new Date(filters.dateFrom)
      );
    }

    if (filters.dateTo) {
      const dateTo = new Date(filters.dateTo);
      dateTo.setHours(23, 59, 59, 999);
      filtered = filtered.filter(log =>
        new Date(log.timestamp) <= dateTo
      );
    }

    setFilteredLogs(filtered);
  };

  const getActionBadge = (action: string) => {
    const styles = {
      INSERT: 'bg-green-100 text-green-800',
      UPDATE: 'bg-blue-100 text-blue-800',
      DELETE: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${styles[action as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
        {action}
      </span>
    );
  };

  const getTableDisplayName = (tableName: string) => {
    const names: Record<string, string> = {
      employees: 'Employees',
      payroll: 'Payroll',
      user_roles: 'User Roles',
      departments: 'Departments',
      loans: 'Loans',
      advances: 'Advances',
      leave_requests: 'Leave Requests',
      attendance: 'Attendance',
      end_of_service_calculations: 'End of Service',
    };
    return names[tableName] || tableName;
  };

  const viewDetails = (log: AuditLogEntry) => {
    setSelectedLog(log);
    setShowDetails(true);
  };

  const getChangedFields = (oldValues: any, newValues: any) => {
    if (!oldValues || !newValues) return [];

    const changes: Array<{field: string, oldValue: any, newValue: any}> = [];
    const allKeys = new Set([...Object.keys(oldValues), ...Object.keys(newValues)]);

    allKeys.forEach(key => {
      if (oldValues[key] !== newValues[key] &&
          !['updated_at', 'created_at'].includes(key)) {
        changes.push({
          field: key,
          oldValue: oldValues[key],
          newValue: newValues[key]
        });
      }
    });

    return changes;
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      action: '',
      table: '',
      dateFrom: '',
      dateTo: '',
    });
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-8 w-8 text-red-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
            <p className="text-sm text-gray-600">Complete system activity trail - Super Admin access only</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 mb-6 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-gray-500" />
          <h3 className="font-semibold text-gray-900">Filters</h3>
          <button
            onClick={clearFilters}
            className="ml-auto text-sm text-primary-600 hover:text-primary-700"
          >
            Clear All
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Search className="h-4 w-4 inline mr-1" />
              Search
            </label>
            <input
              type="text"
              value={filters.searchTerm}
              onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
              placeholder="Search logs..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Action Type</label>
            <select
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Actions</option>
              <option value="INSERT">Insert</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Table</label>
            <select
              value={filters.table}
              onChange={(e) => setFilters({ ...filters, table: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Tables</option>
              {availableTables.map(table => (
                <option key={table} value={table}>{getTableDisplayName(table)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="h-4 w-4 inline mr-1" />
              From Date
            </label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="h-4 w-4 inline mr-1" />
              To Date
            </label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">
              Audit Trail ({filteredLogs.length} {filteredLogs.length === 1 ? 'entry' : 'entries'})
            </h3>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Table</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Details</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">Loading audit logs...</td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    No audit logs found
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss')}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {getTableDisplayName(log.table_name)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">
                      {log.action_description}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-700">{log.user_role || 'System'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {log.employee_first_name ? (
                        <div>
                          <div className="font-medium">{log.employee_first_name} {log.employee_last_name}</div>
                          <div className="text-xs text-gray-500">{log.employee_number}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => viewDetails(log)}
                        className="text-primary-600 hover:text-primary-800 transition-colors"
                        title="View Details"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showDetails && selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Audit Log Details</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {format(new Date(selectedLog.timestamp), 'dd/MM/yyyy HH:mm:ss')}
                  </p>
                </div>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
                  <div>{getActionBadge(selectedLog.action)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Table</label>
                  <div className="text-sm text-gray-900">{getTableDisplayName(selectedLog.table_name)}</div>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <div className="text-sm text-gray-900">{selectedLog.action_description}</div>
                </div>
              </div>

              {selectedLog.action === 'UPDATE' && selectedLog.old_values && selectedLog.new_values && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Changed Fields</h4>
                  <div className="space-y-3">
                    {getChangedFields(selectedLog.old_values, selectedLog.new_values).map((change, idx) => (
                      <div key={idx} className="border border-gray-200 rounded-lg p-3">
                        <div className="font-medium text-sm text-gray-700 mb-2">{change.field}</div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Old Value</div>
                            <div className="bg-red-50 border border-red-200 rounded p-2 text-sm text-gray-900 break-all">
                              {formatValue(change.oldValue)}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">New Value</div>
                            <div className="bg-green-50 border border-green-200 rounded p-2 text-sm text-gray-900 break-all">
                              {formatValue(change.newValue)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedLog.action === 'INSERT' && selectedLog.new_values && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Inserted Data</h4>
                  <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm overflow-x-auto">
                    {JSON.stringify(selectedLog.new_values, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.action === 'DELETE' && selectedLog.old_values && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Deleted Data</h4>
                  <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm overflow-x-auto">
                    {JSON.stringify(selectedLog.old_values, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => setShowDetails(false)}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Audit Log Information</p>
            <ul className="space-y-1 ml-4 list-disc">
              <li>All system changes are automatically logged and cannot be modified or deleted</li>
              <li>Audit logs are retained for compliance and security purposes</li>
              <li>Only Super Admins have access to view audit logs</li>
              <li>Logs include user actions, timestamps, and before/after values</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}