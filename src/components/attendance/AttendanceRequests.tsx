import { useState } from 'react';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface AttendanceRequest {
  id: string;
  employee: {
    first_name_en: string;
    last_name_en: string;
    employee_number: string;
  };
  request_type: string;
  date: string;
  requested_check_in: string | null;
  requested_check_out: string | null;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

interface AttendanceRequestsProps {
  requests: AttendanceRequest[];
  onApprove: (id: string) => void;
  onReject: (id: string, notes: string) => void;
}

export function AttendanceRequests({ requests, onApprove, onReject }: AttendanceRequestsProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  const filteredRequests = requests.filter(req => {
    if (filter === 'all') return true;
    return req.status === filter;
  });

  const getRequestTypeLabel = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleReject = (id: string) => {
    if (rejectionNotes.trim()) {
      onReject(id, rejectionNotes);
      setSelectedId(null);
      setRejectionNotes('');
    }
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Attendance Correction Requests</h3>
          <p className="text-sm text-gray-600 mt-1">
            {pendingCount} pending {pendingCount === 1 ? 'request' : 'requests'}
          </p>
        </div>
        <div className="flex gap-2">
          {['all', 'pending', 'approved', 'rejected'].map((filterType) => (
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
        {filteredRequests.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-8 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No {filter !== 'all' && filter} requests found</p>
          </div>
        ) : (
          filteredRequests.map((request) => (
            <div
              key={request.id}
              className="bg-white rounded-xl border-2 border-gray-200 p-6 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h4 className="font-semibold text-gray-900">
                      {request.employee.first_name_en} {request.employee.last_name_en}
                    </h4>
                    <span className="text-sm text-gray-500">
                      #{request.employee.employee_number}
                    </span>
                    <span className={`text-xs px-3 py-1 rounded-full border font-medium ${getStatusColor(request.status)}`}>
                      {request.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>Date: {new Date(request.date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <AlertCircle className="h-4 w-4" />
                      <span>Type: {getRequestTypeLabel(request.request_type)}</span>
                    </div>
                  </div>

                  {request.requested_check_in && (
                    <div className="flex items-center space-x-2 text-sm text-gray-700 mb-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span>Requested Check In: {new Date(request.requested_check_in).toLocaleTimeString()}</span>
                    </div>
                  )}

                  {request.requested_check_out && (
                    <div className="flex items-center space-x-2 text-sm text-gray-700 mb-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span>Requested Check Out: {new Date(request.requested_check_out).toLocaleTimeString()}</span>
                    </div>
                  )}

                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-1">Reason:</p>
                    <p className="text-sm text-gray-600">{request.reason}</p>
                  </div>

                  {selectedId === request.id && request.status === 'pending' && (
                    <div className="space-y-3 mt-4">
                      <textarea
                        value={rejectionNotes}
                        onChange={(e) => setRejectionNotes(e.target.value)}
                        placeholder="Enter rejection reason..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReject(request.id)}
                          disabled={!rejectionNotes.trim()}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          <XCircle className="h-4 w-4" />
                          Confirm Rejection
                        </button>
                        <button
                          onClick={() => {
                            setSelectedId(null);
                            setRejectionNotes('');
                          }}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {request.status === 'pending' && selectedId !== request.id && (
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => onApprove(request.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => setSelectedId(request.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
