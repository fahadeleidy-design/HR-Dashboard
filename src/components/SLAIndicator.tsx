import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Clock, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';

interface SLAData {
  id: string;
  approval_level: string;
  level_started_at: string;
  sla_deadline: string;
  sla_status: 'on_time' | 'at_risk' | 'overdue';
  hours_taken: number | null;
  level_completed_at: string | null;
}

interface SLAIndicatorProps {
  requestType: 'advance' | 'loan' | 'leave';
  requestId: string;
  compact?: boolean;
}

export function SLAIndicator({ requestType, requestId, compact = false }: SLAIndicatorProps) {
  const [slaData, setSlaData] = useState<SLAData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSLAData();
    const interval = setInterval(fetchSLAData, 60000);
    return () => clearInterval(interval);
  }, [requestType, requestId]);

  const fetchSLAData = async () => {
    try {
      const { data, error } = await supabase
        .from('request_sla_tracking')
        .select('*')
        .eq('request_type', requestType)
        .eq('request_id', requestId)
        .order('level_started_at', { ascending: true });

      if (error) throw error;
      setSlaData(data || []);
    } catch (error) {
      console.error('Error fetching SLA data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeRemaining = (deadline: string, completed: string | null): string => {
    if (completed) return 'Completed';

    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diff = deadlineDate.getTime() - now.getTime();

    if (diff < 0) {
      const overdue = Math.abs(diff);
      const hours = Math.floor(overdue / (1000 * 60 * 60));
      const minutes = Math.floor((overdue % (1000 * 60 * 60)) / (1000 * 60));
      return `Overdue by ${hours}h ${minutes}m`;
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m remaining`;
  };

  const getProgressPercentage = (startedAt: string, deadline: string): number => {
    const now = new Date();
    const start = new Date(startedAt);
    const end = new Date(deadline);

    const total = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();

    const percentage = Math.min(100, Math.max(0, (elapsed / total) * 100));
    return percentage;
  };

  const getSLAIcon = (status: string) => {
    switch (status) {
      case 'on_time':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'at_risk':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'overdue':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSLAColor = (status: string) => {
    switch (status) {
      case 'on_time':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'at_risk':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'overdue':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getProgressBarColor = (status: string) => {
    switch (status) {
      case 'on_time':
        return 'bg-green-500';
      case 'at_risk':
        return 'bg-yellow-500';
      case 'overdue':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Clock className="h-4 w-4 animate-spin" />
        <span>Loading SLA...</span>
      </div>
    );
  }

  const currentSLA = slaData.find(s => !s.level_completed_at);

  if (!currentSLA && compact) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <CheckCircle className="h-4 w-4 text-green-500" />
        <span>All levels completed</span>
      </div>
    );
  }

  if (compact && currentSLA) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm font-medium ${getSLAColor(currentSLA.sla_status)}`}>
        {getSLAIcon(currentSLA.sla_status)}
        <span className="capitalize">{currentSLA.approval_level}</span>
        <span className="text-xs">
          {getTimeRemaining(currentSLA.sla_deadline, currentSLA.level_completed_at)}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">SLA Tracking</h3>

      <div className="space-y-3">
        {slaData.map((sla) => {
          const progress = sla.level_completed_at
            ? 100
            : getProgressPercentage(sla.level_started_at, sla.sla_deadline);

          return (
            <div
              key={sla.id}
              className={`p-4 rounded-lg border ${sla.level_completed_at ? 'bg-gray-50 border-gray-200' : getSLAColor(sla.sla_status)}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {sla.level_completed_at ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    getSLAIcon(sla.sla_status)
                  )}
                  <span className="font-medium capitalize">
                    {sla.approval_level} Approval
                  </span>
                </div>
                <div className="text-sm">
                  {sla.level_completed_at ? (
                    <span className="text-green-600 font-medium">
                      Completed in {sla.hours_taken?.toFixed(1)}h
                    </span>
                  ) : (
                    <span className={`font-medium ${sla.sla_status === 'overdue' ? 'text-red-600' : ''}`}>
                      {getTimeRemaining(sla.sla_deadline, sla.level_completed_at)}
                    </span>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${sla.level_completed_at ? 'bg-green-500' : getProgressBarColor(sla.sla_status)}`}
                  style={{ width: `${progress}%` }}
                ></div>
              </div>

              {/* Timestamps */}
              <div className="flex justify-between text-xs text-gray-600 mt-2">
                <span>
                  Started: {new Date(sla.level_started_at).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
                <span>
                  {sla.level_completed_at ? (
                    `Completed: ${new Date(sla.level_completed_at).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}`
                  ) : (
                    `Deadline: ${new Date(sla.sla_deadline).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}`
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Overall status summary */}
      {currentSLA && (
        <div className={`p-3 rounded-lg border ${getSLAColor(currentSLA.sla_status)}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getSLAIcon(currentSLA.sla_status)}
              <span className="font-medium">Current Status:</span>
            </div>
            <span className="font-semibold capitalize">{currentSLA.sla_status.replace('_', ' ')}</span>
          </div>
        </div>
      )}
    </div>
  );
}
