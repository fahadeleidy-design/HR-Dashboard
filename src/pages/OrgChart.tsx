import { useState, useEffect } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/lib/supabase';
import {
  Network,
  Search,
  Filter,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Users,
  Building2,
  User,
  Mail,
  Phone,
  Calendar,
  Briefcase,
  X,
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';
import { OrgChartNode } from '@/components/OrgChartNode';

interface Employee {
  id: string;
  company_id: string;
  department_id: string | null;
  employee_number: string;
  first_name_en: string;
  last_name_en: string;
  job_title_en: string;
  email: string | null;
  phone: string | null;
  manager_id: string | null;
  department_name: string | null;
  manager_name: string | null;
  direct_reports_count: number;
  total_reports_count: number;
  direct_reports: any[];
  hire_date: string;
  level: number;
}

interface Department {
  id: string;
  name_en: string;
}

export function OrgChart() {
  const { currentCompany } = useCompany();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [reportingChain, setReportingChain] = useState<any[]>([]);
  const [subordinates, setSubordinates] = useState<any[]>([]);
  const [zoom, setZoom] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [viewMode, setViewMode] = useState<'hierarchy' | 'department'>('hierarchy');

  useEffect(() => {
    if (currentCompany) {
      loadOrgData();
      loadDepartments();
    }
  }, [currentCompany]);

  useEffect(() => {
    applyFilters();
  }, [employees, searchTerm, selectedDepartment]);

  const loadOrgData = async () => {
    if (!currentCompany) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('org_chart_with_reports')
      .select('*')
      .eq('company_id', currentCompany.id)
      .order('level')
      .order('first_name_en');

    if (!error && data) {
      setEmployees(data);
    }
    setLoading(false);
  };

  const loadDepartments = async () => {
    if (!currentCompany) return;

    const { data } = await supabase
      .from('departments')
      .select('id, name_en')
      .eq('company_id', currentCompany.id)
      .order('name_en');

    if (data) {
      setDepartments(data);
    }
  };

  const applyFilters = () => {
    let filtered = [...employees];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(emp =>
        emp.first_name_en?.toLowerCase().includes(term) ||
        emp.last_name_en?.toLowerCase().includes(term) ||
        emp.job_title_en?.toLowerCase().includes(term) ||
        emp.employee_number?.toLowerCase().includes(term) ||
        emp.department_name?.toLowerCase().includes(term)
      );
    }

    if (selectedDepartment) {
      filtered = filtered.filter(emp => emp.department_id === selectedDepartment);
    }

    setFilteredEmployees(filtered);
  };

  const loadEmployeeDetails = async (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowDetails(true);

    const { data: chainData } = await supabase.rpc('get_reporting_chain', {
      employee_uuid: employee.id
    });

    if (chainData) {
      setReportingChain(chainData);
    }

    const { data: subsData } = await supabase.rpc('get_all_subordinates', {
      employee_uuid: employee.id
    });

    if (subsData) {
      setSubordinates(subsData);
    }
  };

  const getTopLevelEmployees = () => {
    return filteredEmployees.filter(emp =>
      !emp.manager_id ||
      !filteredEmployees.find(e => e.id === emp.manager_id)
    );
  };

  const getDepartmentGroups = () => {
    const groups = new Map<string, Employee[]>();

    filteredEmployees.forEach(emp => {
      const deptKey = emp.department_name || 'No Department';
      if (!groups.has(deptKey)) {
        groups.set(deptKey, []);
      }
      groups.get(deptKey)!.push(emp);
    });

    return Array.from(groups.entries()).map(([name, emps]) => ({
      name,
      employees: emps.sort((a, b) => (b.direct_reports_count || 0) - (a.direct_reports_count || 0))
    }));
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.1, 2));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.1, 0.5));
  };

  const handleResetZoom = () => {
    setZoom(1);
  };

  const exportOrgChart = () => {
    const csvContent = [
      ['Employee Number', 'Name', 'Job Title', 'Department', 'Manager', 'Direct Reports', 'Email'].join(','),
      ...filteredEmployees.map(emp => [
        emp.employee_number,
        `${emp.first_name_en} ${emp.last_name_en}`,
        emp.job_title_en,
        emp.department_name || '',
        emp.manager_name || '',
        emp.direct_reports_count,
        emp.email || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `org-chart-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const topLevelEmployees = getTopLevelEmployees();
  const departmentGroups = getDepartmentGroups();

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Network className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Organization Chart</h1>
            <p className="text-sm text-gray-600">Interactive company structure and reporting relationships</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-4 items-center flex-1">
              <div className="relative flex-1 min-w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search employees..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>{dept.name_en}</option>
                ))}
              </select>

              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('hierarchy')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    viewMode === 'hierarchy'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Hierarchy
                </button>
                <button
                  onClick={() => setViewMode('department')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    viewMode === 'department'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  By Department
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleZoomOut}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="h-5 w-5 text-gray-600" />
              </button>
              <button
                onClick={handleResetZoom}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                title="Reset Zoom"
              >
                <Maximize2 className="h-5 w-5 text-gray-600" />
              </button>
              <button
                onClick={handleZoomIn}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="h-5 w-5 text-gray-600" />
              </button>
              <button
                onClick={exportOrgChart}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Download className="h-5 w-5" />
                Export
              </button>
            </div>
          </div>

          <div className="mt-4 flex gap-4 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Users className="h-4 w-4" />
              <span>{filteredEmployees.length} Employees</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Building2 className="h-4 w-4" />
              <span>{departmentGroups.length} Departments</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8 overflow-auto">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading organization chart...</div>
        ) : filteredEmployees.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Network className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <p>No employees found</p>
          </div>
        ) : (
          <div
            className="inline-block min-w-full"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              transition: 'transform 0.2s'
            }}
          >
            {viewMode === 'hierarchy' ? (
              <div className="space-y-16">
                {topLevelEmployees.map((topEmp) => (
                  <OrgChartNode
                    key={topEmp.id}
                    employee={topEmp}
                    subordinates={filteredEmployees}
                    level={0}
                    onEmployeeClick={loadEmployeeDetails}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-8">
                {departmentGroups.map((group) => (
                  <div key={group.name} className="border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary-600" />
                      {group.name} ({group.employees.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {group.employees.map((emp) => (
                        <div
                          key={emp.id}
                          onClick={() => loadEmployeeDetails(emp)}
                          className="bg-gray-50 rounded-lg p-4 cursor-pointer hover:bg-gray-100 hover:shadow-md transition-all"
                        >
                          <div className="flex items-start gap-3">
                            <div className="bg-primary-600 rounded-full p-2 text-white">
                              <User className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900 truncate">
                                {emp.first_name_en} {emp.last_name_en}
                              </h4>
                              <p className="text-sm text-gray-600 truncate">{emp.job_title_en}</p>
                              <p className="text-xs text-gray-500 mt-1">{emp.employee_number}</p>
                              {emp.direct_reports_count > 0 && (
                                <p className="text-xs text-primary-600 font-medium mt-2">
                                  {emp.direct_reports_count} report{emp.direct_reports_count !== 1 ? 's' : ''}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showDetails && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-primary-600 to-primary-700 text-white">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="bg-white bg-opacity-20 rounded-full p-4">
                    <User className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">
                      {selectedEmployee.first_name_en} {selectedEmployee.last_name_en}
                    </h3>
                    <p className="text-primary-100 mt-1">{selectedEmployee.job_title_en}</p>
                    <p className="text-sm text-primary-200 mt-1">{selectedEmployee.employee_number}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-white hover:text-primary-100 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <User className="h-5 w-5 text-primary-600" />
                    Contact Information
                  </h4>
                  <div className="space-y-2">
                    {selectedEmployee.email && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="h-4 w-4" />
                        <a href={`mailto:${selectedEmployee.email}`} className="hover:text-primary-600">
                          {selectedEmployee.email}
                        </a>
                      </div>
                    )}
                    {selectedEmployee.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="h-4 w-4" />
                        <a href={`tel:${selectedEmployee.phone}`} className="hover:text-primary-600">
                          {selectedEmployee.phone}
                        </a>
                      </div>
                    )}
                    {selectedEmployee.department_name && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Building2 className="h-4 w-4" />
                        <span>{selectedEmployee.department_name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>Joined {format(new Date(selectedEmployee.hire_date), 'MMM dd, yyyy')}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary-600" />
                    Team Overview
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Direct Reports</span>
                      <span className="font-semibold text-gray-900">{selectedEmployee.direct_reports_count}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Total Team Size</span>
                      <span className="font-semibold text-gray-900">{selectedEmployee.total_reports_count}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Organization Level</span>
                      <span className="font-semibold text-gray-900">Level {selectedEmployee.level}</span>
                    </div>
                  </div>
                </div>
              </div>

              {reportingChain.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Reporting Chain</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      {reportingChain.map((person, index) => (
                        <div key={person.id} className="flex items-center gap-2">
                          <div className="bg-white rounded-lg px-3 py-2 shadow-sm border border-gray-200">
                            <div className="text-sm font-medium text-gray-900">{person.full_name}</div>
                            <div className="text-xs text-gray-500">{person.job_title}</div>
                          </div>
                          {index < reportingChain.length - 1 && (
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {subordinates.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">
                    All Subordinates ({subordinates.length})
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                    <div className="space-y-2">
                      {subordinates.map((sub) => (
                        <div key={sub.id} className="flex items-center gap-3 bg-white rounded-lg p-3">
                          <div className="bg-primary-100 rounded-full p-2">
                            <User className="h-4 w-4 text-primary-600" />
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">{sub.full_name}</div>
                            <div className="text-xs text-gray-500">{sub.job_title}</div>
                          </div>
                          <div className="text-xs text-gray-500">Level {sub.level}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}