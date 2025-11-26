import { useState, useEffect } from 'react';
import { Shield, CheckCircle, AlertTriangle, AlertCircle, Activity, TrendingUp, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useCompany } from '@/contexts/CompanyContext';

interface HealthMetric {
  category: string;
  status: string;
  message: string;
  metric_value: number;
}

export function SystemHealthDashboard() {
  const { currentCompany } = useCompany();
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    if (currentCompany) {
      checkSystemHealth();
    }
  }, [currentCompany]);

  const checkSystemHealth = async () => {
    if (!currentCompany) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('check_system_health', {
        p_company_id: currentCompany.id
      });

      if (error) throw error;
      setMetrics(data || []);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error checking system health:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ok':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok':
        return <CheckCircle className="h-6 w-6 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-6 w-6 text-yellow-600" />;
      case 'critical':
        return <AlertCircle className="h-6 w-6 text-red-600" />;
      default:
        return <Activity className="h-6 w-6 text-gray-600" />;
    }
  };

  const getOverallStatus = () => {
    if (metrics.some(m => m.status === 'critical')) return 'critical';
    if (metrics.some(m => m.status === 'warning')) return 'warning';
    return 'ok';
  };

  const overallStatus = getOverallStatus();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">System Health Monitor</h2>
            <p className="text-sm text-gray-600">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          </div>
        </div>
        <button
          onClick={checkSystemHealth}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="text-sm font-medium">Refresh</span>
        </button>
      </div>

      {loading && metrics.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          <div className={`p-6 rounded-xl border-2 ${getStatusColor(overallStatus)}`}>
            <div className="flex items-center gap-4">
              {getStatusIcon(overallStatus)}
              <div>
                <h3 className="text-lg font-bold">
                  {overallStatus === 'ok' && 'System Operating Normally'}
                  {overallStatus === 'warning' && 'Attention Required'}
                  {overallStatus === 'critical' && 'Critical Issues Detected'}
                </h3>
                <p className="text-sm mt-1">
                  {overallStatus === 'ok' && 'All systems are functioning within normal parameters'}
                  {overallStatus === 'warning' && 'Some items require your attention'}
                  {overallStatus === 'critical' && 'Immediate action required for compliance'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.map((metric, index) => (
              <div
                key={index}
                className={`p-5 rounded-xl border-2 ${getStatusColor(metric.status)} hover:shadow-lg transition-shadow`}
              >
                <div className="flex items-start justify-between mb-3">
                  {getStatusIcon(metric.status)}
                  <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                    metric.status === 'ok' ? 'bg-green-100 text-green-800' :
                    metric.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {metric.status}
                  </div>
                </div>

                <h3 className="font-bold text-lg mb-1">{metric.category}</h3>
                <p className="text-sm mb-3">{metric.message}</p>

                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-3xl font-bold">{metric.metric_value}</div>
                    {metric.category === 'Nitaqat Status' && (
                      <div className="text-xs font-medium mt-1">
                        Target: ≥30% (Green)
                      </div>
                    )}
                  </div>
                  {metric.status !== 'ok' && (
                    <TrendingUp className="h-5 w-5 opacity-50" />
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
            <h3 className="font-bold text-lg text-gray-900 mb-2">Saudi Labor Law Compliance</h3>
            <p className="text-sm text-gray-700 mb-4">
              This dashboard monitors critical compliance metrics according to Saudi Labor Law regulations.
              Immediate action is required for any critical status items.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <div className="font-semibold text-gray-900 mb-1">Document Monitoring</div>
                <div className="text-gray-600">Tracks Iqama, passport, and contract expiry dates with 30/60/90 day alerts</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <div className="font-semibold text-gray-900 mb-1">Nitaqat Compliance</div>
                <div className="text-gray-600">Real-time saudization percentage tracking and band classification</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <div className="font-semibold text-gray-900 mb-1">Workflow Monitoring</div>
                <div className="text-gray-600">Pending approvals for leave requests and expense claims</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
