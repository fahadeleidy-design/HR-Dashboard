import React, { useState, useEffect } from 'react';
import { Shield, AlertCircle, CheckCircle, Clock, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';
import { useErrorHandler } from '@/hooks/useErrorHandler';

interface ComplianceAssignment {
  id: string;
  due_date: string;
  completion_status: string;
  completed_at: string;
  certificate_expiry_date: string;
  compliance_requirement: {
    title: string;
    description: string;
    requirement_type: string;
    is_recurring: boolean;
  };
}

export default function ComplianceTracking() {
  const { selectedCompany } = useCompany();
  const { showToast } = useToast();
  const [assignments, setAssignments] = useState<ComplianceAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const { logError } = useErrorHandler();
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (selectedCompany) {
      loadAssignments();
    }
  }, [selectedCompany]);

  const loadAssignments = async () => {
    try {
      setLoading(true);

      const { data } = await supabase
        .from('compliance_assignments')
        .select(`
          *,
          compliance_requirement:compliance_requirements(
            title,
            description,
            requirement_type,
            is_recurring
          )
        `)
        .order('due_date');

      setAssignments(data || []);
    } catch (error) {
      logError(error, 'medium', { component: 'ComplianceTracking', action: 'loadComplianceAssignments' });
      showToast('Failed to load compliance assignments', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed':
        return { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', label: 'Completed' };
      case 'in_progress':
        return { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-100', label: 'In Progress' };
      case 'overdue':
        return { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100', label: 'Overdue' };
      case 'expired':
        return { icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-100', label: 'Expired' };
      default:
        return { icon: Clock, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Not Started' };
    }
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  const isExpiringSoon = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    const daysUntilExpiry = Math.floor((new Date(expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
  };

  const filteredAssignments = assignments.filter(assignment => {
    if (filter === 'all') return true;
    if (filter === 'pending') return assignment.completion_status === 'not_started' || assignment.completion_status === 'in_progress';
    if (filter === 'completed') return assignment.completion_status === 'completed';
    if (filter === 'overdue') return assignment.completion_status === 'overdue' || (assignment.completion_status !== 'completed' && isOverdue(assignment.due_date));
    if (filter === 'expiring') return isExpiringSoon(assignment.certificate_expiry_date);
    return true;
  });

  const stats = {
    total: assignments.length,
    completed: assignments.filter(a => a.completion_status === 'completed').length,
    pending: assignments.filter(a => a.completion_status === 'not_started' || a.completion_status === 'in_progress').length,
    overdue: assignments.filter(a => a.completion_status === 'overdue' || (a.completion_status !== 'completed' && isOverdue(a.due_date))).length,
    expiring: assignments.filter(a => isExpiringSoon(a.certificate_expiry_date)).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Compliance Training</h2>
        <p className="text-gray-600 mt-1">Track mandatory and regulatory training requirements</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Shield className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-blue-600">{stats.pending}</p>
            </div>
            <Clock className="h-8 w-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Overdue</p>
              <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Expiring Soon</p>
              <p className="text-2xl font-bold text-orange-600">{stats.expiring}</p>
            </div>
            <Calendar className="h-8 w-8 text-orange-400" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {[
              { key: 'all', label: 'All' },
              { key: 'pending', label: 'Pending' },
              { key: 'completed', label: 'Completed' },
              { key: 'overdue', label: 'Overdue' },
              { key: 'expiring', label: 'Expiring Soon' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  filter === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {filteredAssignments.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">No compliance assignments found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAssignments.map((assignment) => {
                const statusConfig = getStatusConfig(assignment.completion_status);
                const StatusIcon = statusConfig.icon;

                return (
                  <div key={assignment.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-semibold text-gray-900">{assignment.compliance_requirement.title}</h4>
                          <span className={`px-2 py-1 text-xs rounded-full ${statusConfig.bg} ${statusConfig.color}`}>
                            {statusConfig.label}
                          </span>
                          {assignment.compliance_requirement.is_recurring && (
                            <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                              Recurring
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{assignment.compliance_requirement.description}</p>

                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>Due: {new Date(assignment.due_date).toLocaleDateString()}</span>
                          </div>
                          {assignment.completed_at && (
                            <div className="flex items-center space-x-1">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span>Completed: {new Date(assignment.completed_at).toLocaleDateString()}</span>
                            </div>
                          )}
                          {assignment.certificate_expiry_date && (
                            <div className={`flex items-center space-x-1 ${isExpiringSoon(assignment.certificate_expiry_date) ? 'text-orange-600' : ''}`}>
                              <Calendar className="h-4 w-4" />
                              <span>Expires: {new Date(assignment.certificate_expiry_date).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="ml-4">
                        {assignment.completion_status !== 'completed' && (
                          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                            Start Training
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
