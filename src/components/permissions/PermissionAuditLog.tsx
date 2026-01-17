import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';
import { FileSearch, Filter, Download, Calendar, User, Shield, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface AuditLog {
  id: string;
  audit_type: string;
  user_id: string | null;
  target_user_id: string | null;
  module_name: string | null;
  action: string | null;
  access_granted: boolean | null;
  denial_reason: string | null;
  resource_type: string | null;
  resource_id: string | null;
  permission_before: any;
  permission_after: any;
  changes: any;
  reason: string | null;
  ip_address: string | null;
  created_at: string;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  user_id: string;
}

export default function PermissionAuditLog() {
  const { currentCompany } = useCompany();
  const { showToast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [employees, setEmployees] = useState<Record<string, Employee>>({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const [filters, setFilters] = useState({
    audit_type: '',
    user_id: '',
    module_name: '',
    action: '',
    date_from: '',
    date_to: '',
    access_granted: '',
  });

  const pageSize = 50;

  useEffect(() => {
    loadEmployees();
  }, [currentCompany]);

  useEffect(() => {
    loadLogs();
  }, [currentCompany, page, filters]);

  const loadEmployees = async () => {
    if (!currentCompany) return;

    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name, user_id')
        .eq('company_id', currentCompany.id)
        .not('user_id', 'is', null);

      if (error) throw error;

      const empMap: Record<string, Employee> = {};
      data?.forEach(emp => {
        if (emp.user_id) {
          empMap[emp.user_id] = emp;
        }
      });
      setEmployees(empMap);
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const loadLogs = async () => {
    if (!currentCompany) return;

    try {
      setLoading(true);

      let query = supabase
        .from('permission_audit_log')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (filters.audit_type) {
        query = query.eq('audit_type', filters.audit_type);
      }
      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id);
      }
      if (filters.module_name) {
        query = query.eq('module_name', filters.module_name);
      }
      if (filters.action) {
        query = query.eq('action', filters.action);
      }
      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to);
      }
      if (filters.access_granted) {
        query = query.eq('access_granted', filters.access_granted === 'true');
      }

      const { data, error } = await query;

      if (error) throw error;

      if (page === 0) {
        setLogs(data || []);
      } else {
        setLogs([...logs, ...(data || [])]);
      }

      setHasMore((data || []).length === pageSize);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const exportLogs = async () => {
    try {
      showToast('Exporting audit logs...', 'info');

      let query = supabase
        .from('permission_audit_log')
        .select('*')
        .eq('company_id', currentCompany?.id || '')
        .order('created_at', { ascending: false });

      if (filters.audit_type) query = query.eq('audit_type', filters.audit_type);
      if (filters.user_id) query = query.eq('user_id', filters.user_id);
      if (filters.module_name) query = query.eq('module_name', filters.module_name);
      if (filters.action) query = query.eq('action', filters.action);
      if (filters.date_from) query = query.gte('created_at', filters.date_from);
      if (filters.date_to) query = query.lte('created_at', filters.date_to);

      const { data, error } = await query;
      if (error) throw error;

      const csv = [
        ['Date', 'Type', 'User', 'Module', 'Action', 'Access Granted', 'Reason', 'IP Address'].join(','),
        ...(data || []).map(log => [
          format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
          log.audit_type,
          employees[log.user_id || '']
            ? `${employees[log.user_id || ''].first_name} ${employees[log.user_id || ''].last_name}`
            : 'Unknown',
          log.module_name || '',
          log.action || '',
          log.access_granted === null ? '' : log.access_granted ? 'Yes' : 'No',
          log.denial_reason || log.reason || '',
          log.ip_address || '',
        ].map(field => `"${field}"`).join(',')),
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `permission-audit-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      showToast('Audit logs exported successfully', 'success');
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const resetFilters = () => {
    setFilters({
      audit_type: '',
      user_id: '',
      module_name: '',
      action: '',
      date_from: '',
      date_to: '',
      access_granted: '',
    });
    setPage(0);
  };

  const applyFilters = () => {
    setPage(0);
    setLogs([]);
  };

  const getAuditTypeIcon = (type: string) => {
    switch (type) {
      case 'access_granted':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'access_denied':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'permission_change':
        return <Shield className="w-5 h-5 text-blue-600" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getAuditTypeBadge = (type: string) => {
    const styles = {
      access_granted: 'bg-green-100 text-green-700',
      access_denied: 'bg-red-100 text-red-700',
      permission_change: 'bg-blue-100 text-blue-700',
      access_attempt: 'bg-yellow-100 text-yellow-700',
      permission_check: 'bg-gray-100 text-gray-700',
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[type as keyof typeof styles] || 'bg-gray-100 text-gray-700'}`}>
        {type.replace(/_/g, ' ').toUpperCase()}
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Permission Audit Log</h2>
          <p className="text-sm text-gray-500 mt-1">
            Track all permission changes and access attempts
          </p>
        </div>

        <button
          onClick={exportLogs}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Filter className="w-4 h-4" />
          Filters
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Audit Type</label>
            <select
              value={filters.audit_type}
              onChange={(e) => setFilters({ ...filters, audit_type: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="">All Types</option>
              <option value="permission_change">Permission Change</option>
              <option value="access_attempt">Access Attempt</option>
              <option value="access_granted">Access Granted</option>
              <option value="access_denied">Access Denied</option>
              <option value="permission_check">Permission Check</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">User</label>
            <select
              value={filters.user_id}
              onChange={(e) => setFilters({ ...filters, user_id: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="">All Users</option>
              {Object.values(employees).map(emp => (
                <option key={emp.id} value={emp.user_id}>
                  {emp.first_name} {emp.last_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Action</label>
            <select
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="">All Actions</option>
              <option value="read">Read</option>
              <option value="write">Write</option>
              <option value="delete">Delete</option>
              <option value="approve">Approve</option>
              <option value="export">Export</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Access Result</label>
            <select
              value={filters.access_granted}
              onChange={(e) => setFilters({ ...filters, access_granted: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="">All Results</option>
              <option value="true">Granted</option>
              <option value="false">Denied</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Date From</label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Date To</label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={applyFilters}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
          >
            Apply Filters
          </button>
          <button
            onClick={resetFilters}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-300"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {loading && page === 0 ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading audit logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <FileSearch className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No audit logs found</p>
            <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <>
            {logs.map((log) => {
              const user = employees[log.user_id || ''];
              const targetUser = employees[log.target_user_id || ''];

              return (
                <div
                  key={log.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-1">
                        {getAuditTypeIcon(log.audit_type)}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getAuditTypeBadge(log.audit_type)}
                          {log.action && (
                            <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                              {log.action.toUpperCase()}
                            </span>
                          )}
                          {log.access_granted !== null && (
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              log.access_granted
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {log.access_granted ? 'GRANTED' : 'DENIED'}
                            </span>
                          )}
                        </div>

                        <div className="space-y-1 text-sm">
                          {user && (
                            <p className="text-gray-700">
                              <User className="w-4 h-4 inline mr-1" />
                              <span className="font-medium">User:</span> {user.first_name} {user.last_name}
                            </p>
                          )}

                          {log.module_name && (
                            <p className="text-gray-700">
                              <Shield className="w-4 h-4 inline mr-1" />
                              <span className="font-medium">Module:</span> {log.module_name}
                            </p>
                          )}

                          {targetUser && (
                            <p className="text-gray-700">
                              <User className="w-4 h-4 inline mr-1" />
                              <span className="font-medium">Target:</span> {targetUser.first_name} {targetUser.last_name}
                            </p>
                          )}

                          {(log.denial_reason || log.reason) && (
                            <p className="text-gray-600">
                              <span className="font-medium">Reason:</span> {log.denial_reason || log.reason}
                            </p>
                          )}

                          {log.resource_type && (
                            <p className="text-gray-600">
                              <span className="font-medium">Resource:</span> {log.resource_type}
                              {log.resource_id && ` (${log.resource_id.substring(0, 8)}...)`}
                            </p>
                          )}

                          {log.ip_address && (
                            <p className="text-gray-500 text-xs">
                              IP: {log.ip_address}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(log.created_at), 'MMM dd, yyyy')}
                      </div>
                      <div className="text-xs mt-1">
                        {format(new Date(log.created_at), 'HH:mm:ss')}
                      </div>
                    </div>
                  </div>

                  {(log.permission_before || log.permission_after || log.changes) && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <details className="text-xs">
                        <summary className="cursor-pointer text-gray-600 hover:text-gray-900">
                          View Details
                        </summary>
                        <div className="mt-2 space-y-2 bg-gray-50 rounded p-3">
                          {log.permission_before && (
                            <div>
                              <span className="font-medium">Before:</span>
                              <pre className="mt-1 text-xs overflow-x-auto">
                                {JSON.stringify(log.permission_before, null, 2)}
                              </pre>
                            </div>
                          )}
                          {log.permission_after && (
                            <div>
                              <span className="font-medium">After:</span>
                              <pre className="mt-1 text-xs overflow-x-auto">
                                {JSON.stringify(log.permission_after, null, 2)}
                              </pre>
                            </div>
                          )}
                          {log.changes && (
                            <div>
                              <span className="font-medium">Changes:</span>
                              <pre className="mt-1 text-xs overflow-x-auto">
                                {JSON.stringify(log.changes, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              );
            })}

            {hasMore && (
              <div className="text-center py-4">
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={loading}
                  className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
