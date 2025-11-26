import { useState, useEffect, useRef } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { PageSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
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
  Pencil,
  X,
  ChevronRight,
  TrendingUp,
  Grid3x3,
  GitBranch,
  Printer,
  Share2,
  RefreshCw,
  Minimize2,
  Maximize,
  Layers,
  Eye,
  EyeOff,
  Camera,
  FileImage
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
  const { t, language, isRTL } = useLanguage();
  const { showToast } = useToast();
  const chartRef = useRef<HTMLDivElement>(null);
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
  const [compactMode, setCompactMode] = useState(false);
  const [highlightedEmployee, setHighlightedEmployee] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showEditManager, setShowEditManager] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [newManagerId, setNewManagerId] = useState<string>('');
  const [potentialManagers, setPotentialManagers] = useState<Employee[]>([]);

  useEffect(() => {
    if (currentCompany) {
      loadOrgData();
      loadDepartments();
    }
  }, [currentCompany]);

  useEffect(() => {
    applyFilters();
  }, [employees, searchTerm, selectedDepartment]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (searchTerm && filteredEmployees.length > 0) {
      const firstMatch = filteredEmployees[0];
      setHighlightedEmployee(firstMatch.id);
      setTimeout(() => setHighlightedEmployee(null), 3000);
    } else {
      setHighlightedEmployee(null);
    }
  }, [searchTerm, filteredEmployees]);

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

  const openEditManager = (employee: Employee) => {
    setEditingEmployee(employee);
    setNewManagerId(employee.manager_id || '');
    const managers = employees.filter(emp =>
      emp.id !== employee.id &&
      !isSubordinate(employee.id, emp.id)
    );
    setPotentialManagers(managers);
    setShowEditManager(true);
  };

  const isSubordinate = (managerId: string, potentialSubId: string): boolean => {
    const subs = employees.filter(emp => emp.manager_id === managerId);
    if (subs.some(s => s.id === potentialSubId)) return true;
    return subs.some(s => isSubordinate(s.id, potentialSubId));
  };

  const handleUpdateManager = async () => {
    if (!editingEmployee) return;

    const { error } = await supabase
      .from('employees')
      .update({ manager_id: newManagerId || null })
      .eq('id', editingEmployee.id);

    if (error) {
      showToast({
        type: 'error',
        title: 'Update Failed',
        message: error.message
      });
      return;
    }

    showToast({
      type: 'success',
      title: 'Manager Updated',
      message: 'Reporting relationship has been updated successfully'
    });

    setShowEditManager(false);
    setEditingEmployee(null);
    await loadOrgData();
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

    showToast({
      type: 'success',
      title: 'Export Successful',
      message: `Organization chart exported with ${filteredEmployees.length} employees`
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleRefresh = async () => {
    showToast({
      type: 'info',
      title: 'Refreshing',
      message: 'Loading latest organization data...'
    });
    await loadOrgData();
    showToast({
      type: 'success',
      title: 'Refreshed',
      message: 'Organization chart updated'
    });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      chartRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const captureChart = async () => {
    showToast({
      type: 'info',
      title: 'Capturing Chart',
      message: 'Preparing organization chart image...'
    });

    setTimeout(() => {
      showToast({
        type: 'success',
        title: 'Chart Captured',
        message: 'Use browser print to save as PDF or take a screenshot'
      });
      handlePrint();
    }, 500);
  };

  const topLevelEmployees = getTopLevelEmployees();
  const departmentGroups = getDepartmentGroups();

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-primary-600 to-primary-400 rounded-xl blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
              <div className="relative h-14 w-14 rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center text-white shadow-lg">
                <Network className="h-7 w-7" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Organization Chart</h1>
              <p className="text-gray-600 mt-1">Interactive company structure and reporting relationships</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-gray-200 rounded-lg font-medium transition-all duration-200 hover:border-primary-400 hover:bg-primary-50 hover:text-primary-700 hover:scale-105 hover:shadow-sm group"
              title="Refresh Data"
            >
              <RefreshCw className="h-4 w-4 group-hover:rotate-180 transition-transform duration-500" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={captureChart}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-gray-200 rounded-lg font-medium transition-all duration-200 hover:border-primary-400 hover:bg-primary-50 hover:text-primary-700 hover:scale-105 hover:shadow-sm"
              title="Capture as Image"
            >
              <Camera className="h-4 w-4" />
              <span className="hidden sm:inline">Capture</span>
            </button>
            <button
              onClick={toggleFullscreen}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-gray-200 rounded-lg font-medium transition-all duration-200 hover:border-primary-400 hover:bg-primary-50 hover:text-primary-700 hover:scale-105 hover:shadow-sm"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              <span className="hidden sm:inline">{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-300">
          <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center flex-1">
              <div className="relative flex-1 min-w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t.employees.searchEmployees}
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 transition-all duration-200 hover:border-gray-300 bg-white"
                />
              </div>

              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="pl-10 pr-8 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 transition-all duration-200 hover:border-gray-300 bg-white appearance-none cursor-pointer min-w-48"
                >
                  <option value="">All Departments</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>{dept.name_en}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                  <button
                    onClick={() => setViewMode('hierarchy')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      viewMode === 'hierarchy'
                        ? 'bg-white text-primary-700 shadow-sm scale-105'
                        : 'text-gray-700 hover:text-gray-900'
                    }`}
                  >
                    <GitBranch className="h-4 w-4" />
                    <span>Hierarchy</span>
                  </button>
                  <button
                    onClick={() => setViewMode('department')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      viewMode === 'department'
                        ? 'bg-white text-primary-700 shadow-sm scale-105'
                        : 'text-gray-700 hover:text-gray-900'
                    }`}
                  >
                    <Grid3x3 className="h-4 w-4" />
                    <span>By Department</span>
                  </button>
                </div>

                {viewMode === 'hierarchy' && (
                  <button
                    onClick={() => setCompactMode(!compactMode)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      compactMode
                        ? 'bg-primary-100 text-primary-700 border-2 border-primary-300'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    title="Toggle Compact View"
                  >
                    {compactMode ? <Layers className="h-4 w-4" /> : <Layers className="h-4 w-4" />}
                    <span className="hidden lg:inline">{compactMode ? 'Expanded' : 'Compact'}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={handleZoomOut}
                  className="p-2 rounded-lg hover:bg-white transition-all duration-200 hover:shadow-sm"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-5 w-5 text-gray-600 hover:text-primary-600" />
                </button>
                <button
                  onClick={handleResetZoom}
                  className="p-2 rounded-lg hover:bg-white transition-all duration-200 hover:shadow-sm"
                  title="Reset Zoom"
                >
                  <Maximize2 className="h-5 w-5 text-gray-600 hover:text-primary-600" />
                </button>
                <button
                  onClick={handleZoomIn}
                  className="p-2 rounded-lg hover:bg-white transition-all duration-200 hover:shadow-sm"
                  title="Zoom In"
                >
                  <ZoomIn className="h-5 w-5 text-gray-600 hover:text-primary-600" />
                </button>
              </div>
              <button
                onClick={exportOrgChart}
                disabled={filteredEmployees.length === 0}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg font-medium hover:from-primary-700 hover:to-primary-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-200 hover:shadow-xl hover:scale-105"
              >
                <Download className="h-4 w-4" />
                <span>Export</span>
              </button>
            </div>
          </div>

          <div className="mt-6 flex gap-4">
            <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs font-medium text-blue-600">Employees</p>
                <p className="text-lg font-bold text-blue-900">{filteredEmployees.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs font-medium text-green-600">Departments</p>
                <p className="text-lg font-bold text-green-900">{departmentGroups.length}</p>
              </div>
            </div>
            {viewMode === 'hierarchy' && (
              <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-medium text-purple-600">Zoom Level</p>
                  <p className="text-lg font-bold text-purple-900">{(zoom * 100).toFixed(0)}%</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {filteredEmployees.length === 0 ? (
        <EmptyState
          icon={Network}
          title="No Employees in Organization Chart"
          description="Start building your organization structure by adding employees with reporting relationships"
        />
      ) : (
        <div ref={chartRef} className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 overflow-auto hover:shadow-md transition-all duration-300 print:shadow-none">
          <div
            className="inline-block min-w-full"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top center',
              transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
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
                    compactMode={compactMode}
                    highlightedId={highlightedEmployee}
                    onEditManager={openEditManager}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-8">
                {departmentGroups.map((group) => (
                  <div key={group.name} className="border-2 border-gray-200 rounded-xl p-6 bg-gradient-to-br from-white to-gray-50 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-gray-200">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg">
                        <Building2 className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{group.name}</h3>
                        <p className="text-sm text-gray-600">{group.employees.length} {group.employees.length === 1 ? 'Employee' : 'Employees'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {group.employees.map((emp) => (
                        <div
                          key={emp.id}
                          onClick={() => loadEmployeeDetails(emp)}
                          className="bg-white rounded-xl p-4 cursor-pointer hover:bg-gradient-to-br hover:from-primary-50 hover:to-blue-50 border-2 border-gray-200 hover:border-primary-400 hover:shadow-lg transition-all duration-200 hover:-translate-y-1 group"
                        >
                          <div className="flex items-start gap-3">
                            <div className="relative">
                              <div className="absolute inset-0 bg-primary-600 rounded-full blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
                              <div className="relative bg-gradient-to-br from-primary-600 to-primary-700 rounded-full p-2.5 text-white shadow-lg group-hover:scale-110 transition-transform duration-200">
                                <User className="h-5 w-5" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-900 truncate group-hover:text-primary-700 transition-colors">
                                {emp.first_name_en} {emp.last_name_en}
                              </h4>
                              <p className="text-sm text-gray-600 truncate mt-0.5">{emp.job_title_en}</p>
                              <p className="text-xs text-gray-500 mt-1">{emp.employee_number}</p>
                              {emp.direct_reports_count > 0 && (
                                <div className="inline-flex items-center gap-1 mt-2 px-2 py-1 bg-gradient-to-r from-primary-100 to-primary-200 text-primary-800 rounded-full text-xs font-semibold">
                                  <Users className="h-3 w-3" />
                                  <span>{emp.direct_reports_count} {emp.direct_reports_count === 1 ? 'report' : 'reports'}</span>
                                </div>
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
        </div>
      )}

      {showDetails && selectedEmployee && (
        <div className="fixed inset-0 bg-gradient-to-br from-black/60 to-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            <div className="p-8 border-b border-gray-200 bg-gradient-to-r from-primary-600 via-primary-700 to-primary-800 text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-white/5 backdrop-blur-3xl"></div>
              <div className="relative flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-white rounded-2xl blur opacity-30"></div>
                    <div className="relative bg-white/20 backdrop-blur-sm rounded-2xl p-4 shadow-2xl">
                      <User className="h-10 w-10" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold drop-shadow-lg">
                      {selectedEmployee.first_name_en} {selectedEmployee.last_name_en}
                    </h3>
                    <p className="text-primary-100 mt-2 text-lg">{selectedEmployee.job_title_en}</p>
                    <p className="text-sm text-primary-200 mt-1 font-medium">{selectedEmployee.employee_number}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all duration-200 hover:scale-110"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="mb-4">
                <button
                  onClick={() => {
                    setShowDetails(false);
                    openEditManager(selectedEmployee);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Pencil className="h-4 w-4" />
                  Edit Reporting Relationship
                </button>
              </div>
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

      {showEditManager && editingEmployee && (
        <div className="fixed inset-0 bg-gradient-to-br from-black/60 to-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-t-2xl">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-bold">Edit Reporting Relationship</h3>
                  <p className="text-primary-100 mt-1">
                    {editingEmployee.first_name_en} {editingEmployee.last_name_en}
                  </p>
                </div>
                <button
                  onClick={() => setShowEditManager(false)}
                  className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all duration-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Manager
                </label>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-gray-900 font-medium">
                    {editingEmployee.manager_name || 'No Manager (Top Level)'}
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Manager <span className="text-gray-500">(Leave empty for top level)</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                  <select
                    value={newManagerId}
                    onChange={(e) => setNewManagerId(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 transition-all duration-200 bg-white appearance-none cursor-pointer"
                  >
                    <option value="">No Manager (Top Level)</option>
                    {potentialManagers.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name_en} {emp.last_name_en} - {emp.job_title_en}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Note: You cannot select subordinates or create circular reporting relationships
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowEditManager(false)}
                  className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateManager}
                  className="px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all duration-200 font-medium shadow-lg shadow-primary-200"
                >
                  Update Manager
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}