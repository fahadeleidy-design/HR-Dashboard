import { useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Clock, MapPin } from 'lucide-react';

interface AttendanceException {
  id: string;
  employee: {
    first_name_en: string;
    last_name_en: string;
    employee_number: string;
  };
  exception_type: string;
  severity: 'low' | 'medium' | 'high';
  date: string;
  description: string;
  is_resolved: boolean;
}

interface AttendanceExceptionsProps {
  exceptions: AttendanceException[];
  onResolve: (id: string, notes: string) => void;
}

export function AttendanceExceptions({ exceptions, onResolve }: AttendanceExceptionsProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('unresolved');

  const filteredExceptions = exceptions.filter(ex => {
    if (filter === 'all') return true;
    if (filter === 'unresolved') return !ex.is_resolved;
    return ex.is_resolved;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'late_arrival': return <Clock className="h-5 w-5" />;
      case 'early_departure': return <Clock className="h-5 w-5" />;
      case 'missing_checkout': return <XCircle className="h-5 w-5" />;
      case 'location_violation': return <MapPin className="h-5 w-5" />;
      default: return <AlertTriangle className="h-5 w-5" />;
    }
  };

  const getTypeLabel = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const handleResolve = (id: string) => {
    if (resolutionNotes.trim()) {
      onResolve(id, resolutionNotes);
      setSelectedId(null);
      setResolutionNotes('');
    }
  };

  const unresolvedCount = exceptions.filter(ex => !ex.is_resolved).length;
  const highSeverityCount = exceptions.filter(ex => ex.severity === 'high' && !ex.is_resolved).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Attendance Exceptions</h3>
          <p className="text-sm text-gray-600 mt-1">
            {unresolvedCount} unresolved {unresolvedCount === 1 ? 'exception' : 'exceptions'}
            {highSeverityCount > 0 && (
              <span className="ml-2 text-red-600 font-medium">
                ({highSeverityCount} high priority)
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {['all', 'unresolved', 'resolved'].map((filterType) => (
            <button
              key={filterType}
              onClick={() => setFilter(filterType as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === filterType
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filteredExceptions.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="text-gray-600">No {filter !== 'all' && filter} exceptions found</p>
          </div>
        ) : (
          filteredExceptions.map((exception) => (
            <div
              key={exception.id}
              className={`bg-white rounded-xl border-2 p-4 hover:shadow-md transition-all ${
                exception.is_resolved ? 'border-gray-200' : 'border-orange-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className={`p-2 rounded-lg ${
                    exception.is_resolved ? 'bg-gray-100 text-gray-600' : 'bg-orange-100 text-orange-600'
                  }`}>
                    {getTypeIcon(exception.exception_type)}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-gray-900">
                        {exception.employee.first_name_en} {exception.employee.last_name_en}
                      </h4>
                      <span className="text-sm text-gray-500">
                        #{exception.employee.employee_number}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full border ${getSeverityColor(exception.severity)}`}>
                        {exception.severity.toUpperCase()}
                      </span>
                      {exception.is_resolved && (
                        <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 border border-green-200">
                          RESOLVED
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">{getTypeLabel(exception.exception_type)}</span>
                      {' '} on {new Date(exception.date).toLocaleDateString()}
                    </p>

                    {exception.description && (
                      <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                        {exception.description}
                      </p>
                    )}

                    {selectedId === exception.id && !exception.is_resolved && (
                      <div className="mt-3 space-y-3">
                        <textarea
                          value={resolutionNotes}
                          onChange={(e) => setResolutionNotes(e.target.value)}
                          placeholder="Enter resolution notes..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleResolve(exception.id)}
                            disabled={!resolutionNotes.trim()}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Resolve
                          </button>
                          <button
                            onClick={() => {
                              setSelectedId(null);
                              setResolutionNotes('');
                            }}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {!exception.is_resolved && selectedId !== exception.id && (
                  <button
                    onClick={() => setSelectedId(exception.id)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Resolve
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
