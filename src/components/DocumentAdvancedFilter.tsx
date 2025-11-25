import { useState } from 'react';
import { Search, Filter, X, Calendar, User, FileText, Tag } from 'lucide-react';

interface FilterCriteria {
  search: string;
  documentType: string[];
  status: string[];
  dateRange: {
    from: string;
    to: string;
  };
  expiryRange: {
    from: string;
    to: string;
  };
  workflowStatus: string[];
  hasApproval: string;
  isConfidential: string;
  tags: string[];
}

interface DocumentAdvancedFilterProps {
  onFilterChange: (filters: FilterCriteria) => void;
  availableTags?: Array<{ id: string; name: string; color: string }>;
}

export function DocumentAdvancedFilter({ onFilterChange, availableTags = [] }: DocumentAdvancedFilterProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterCriteria>({
    search: '',
    documentType: [],
    status: [],
    dateRange: { from: '', to: '' },
    expiryRange: { from: '', to: '' },
    workflowStatus: [],
    hasApproval: 'all',
    isConfidential: 'all',
    tags: []
  });

  const documentTypes = [
    'iqama', 'passport', 'contract', 'certificate',
    'visa', 'medical', 'insurance', 'license', 'other'
  ];

  const statuses = ['active', 'expired', 'expiring_soon', 'archived'];
  const workflowStatuses = ['draft', 'pending_approval', 'approved', 'rejected'];

  const handleFilterChange = (key: keyof FilterCriteria, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const toggleArrayFilter = (key: keyof FilterCriteria, value: string) => {
    const currentArray = filters[key] as string[];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(v => v !== value)
      : [...currentArray, value];
    handleFilterChange(key, newArray);
  };

  const clearFilters = () => {
    const clearedFilters: FilterCriteria = {
      search: '',
      documentType: [],
      status: [],
      dateRange: { from: '', to: '' },
      expiryRange: { from: '', to: '' },
      workflowStatus: [],
      hasApproval: 'all',
      isConfidential: 'all',
      tags: []
    };
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  const activeFilterCount =
    filters.documentType.length +
    filters.status.length +
    filters.workflowStatus.length +
    filters.tags.length +
    (filters.dateRange.from || filters.dateRange.to ? 1 : 0) +
    (filters.expiryRange.from || filters.expiryRange.to ? 1 : 0) +
    (filters.hasApproval !== 'all' ? 1 : 0) +
    (filters.isConfidential !== 'all' ? 1 : 0);

  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            placeholder="Search documents by name, number, employee..."
            className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
            showFilters
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Filter className="h-5 w-5" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 bg-white text-blue-600 rounded-full text-xs font-bold">
              {activeFilterCount}
            </span>
          )}
        </button>
        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="px-4 py-2.5 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition-all"
          >
            Clear All
          </button>
        )}
      </div>

      {showFilters && (
        <div className="p-4 bg-gray-50 rounded-lg space-y-4 border-2 border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <FileText className="inline h-4 w-4 mr-1" />
                Document Type
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {documentTypes.map(type => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.documentType.includes(type)}
                      onChange={() => toggleArrayFilter('documentType', type)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 capitalize">{type}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Document Status
              </label>
              <div className="space-y-2">
                {statuses.map(status => (
                  <label key={status} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.status.includes(status)}
                      onChange={() => toggleArrayFilter('status', status)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 capitalize">{status.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Workflow Status
              </label>
              <div className="space-y-2">
                {workflowStatuses.map(status => (
                  <label key={status} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.workflowStatus.includes(status)}
                      onChange={() => toggleArrayFilter('workflowStatus', status)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 capitalize">{status.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                Upload Date Range
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={filters.dateRange.from}
                  onChange={(e) => handleFilterChange('dateRange', { ...filters.dateRange, from: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="From"
                />
                <input
                  type="date"
                  value={filters.dateRange.to}
                  onChange={(e) => handleFilterChange('dateRange', { ...filters.dateRange, to: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="To"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                Expiry Date Range
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={filters.expiryRange.from}
                  onChange={(e) => handleFilterChange('expiryRange', { ...filters.expiryRange, from: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="From"
                />
                <input
                  type="date"
                  value={filters.expiryRange.to}
                  onChange={(e) => handleFilterChange('expiryRange', { ...filters.expiryRange, to: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="To"
                />
              </div>
            </div>
          </div>

          {availableTags.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Tag className="inline h-4 w-4 mr-1" />
                Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {availableTags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => toggleArrayFilter('tags', tag.id)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      filters.tags.includes(tag.id)
                        ? 'ring-2 ring-offset-2'
                        : 'opacity-60 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: tag.color + '20',
                      color: tag.color,
                      ringColor: tag.color
                    }}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Requires Approval
              </label>
              <select
                value={filters.hasApproval}
                onChange={(e) => handleFilterChange('hasApproval', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Documents</option>
                <option value="yes">Requires Approval</option>
                <option value="no">No Approval Required</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Confidentiality
              </label>
              <select
                value={filters.isConfidential}
                onChange={(e) => handleFilterChange('isConfidential', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Documents</option>
                <option value="yes">Confidential Only</option>
                <option value="no">Non-Confidential Only</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.documentType.map(type => (
            <span key={type} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
              {type}
              <button onClick={() => toggleArrayFilter('documentType', type)}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {filters.status.map(status => (
            <span key={status} className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
              {status.replace('_', ' ')}
              <button onClick={() => toggleArrayFilter('status', status)}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {filters.workflowStatus.map(status => (
            <span key={status} className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
              {status.replace('_', ' ')}
              <button onClick={() => toggleArrayFilter('workflowStatus', status)}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
