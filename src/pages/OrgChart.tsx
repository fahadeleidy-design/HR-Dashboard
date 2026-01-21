import { useState, useEffect, useRef } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { PageSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { Tabs } from '@/components/ui/Tabs';
import {
  Network,
  Search,
  Download,
  ZoomIn,
  ZoomOut,
  Building2,
  User,
  Mail,
  Phone,
  Calendar,
  Pencil,
  X,
  ChevronRight,
  GitBranch,
  Printer,
  RefreshCw,
  Minimize2,
  Maximize,
  Hand,
  Maximize2 as ExpandAll,
  Minimize2 as CollapseAll,
  Keyboard,
  History,
  BarChart3,
  Users,
  TrendingUp,
  FileJson,
  FileText,
  Globe
} from 'lucide-react';
import { format } from 'date-fns';
import { OrgChartNode } from '@/components/OrgChartNode';
import { KeyboardShortcutsModal } from '@/components/KeyboardShortcutsModal';
import { OrgChartAnalytics } from '@/components/orgchart/OrgChartAnalytics';
import { TeamComparison } from '@/components/orgchart/TeamComparison';
import { OrgChartVisualization } from '@/components/orgchart/OrgChartVisualization';
import * as OrgChartExport from '@/lib/orgChartExport';

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
  const [viewMode, setViewMode] = useState<'hierarchy' | 'matrix' | 'list' | 'network' | 'compact'>('hierarchy');
  const [compactMode, setCompactMode] = useState(false);
  const [highlightedEmployee, setHighlightedEmployee] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showEditManager, setShowEditManager] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [newManagerId, setNewManagerId] = useState<string>('');
  const [potentialManagers, setPotentialManagers] = useState<Employee[]>([]);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [navigationHistory, setNavigationHistory] = useState<Employee[]>([]);
  const [activeTab, setActiveTab] = useState('chart');
  const [showExportMenu, setShowExportMenu] = useState(false);

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
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
          case '+':
          case '=':
            e.preventDefault();
            handleZoomIn();
            break;
          case '-':
            e.preventDefault();
            handleZoomOut();
            break;
          case '0':
            e.preventDefault();
            handleResetZoom();
            break;
          case 'f':
            e.preventDefault();
            document.querySelector<HTMLInputElement>('input[type="text"]')?.focus();
            break;
          case 'e':
            e.preventDefault();
            expandAll();
            break;
          case 'c':
            e.preventDefault();
            collapseAll();
            break;
        }
      }
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        setShowKeyboardHelp(!showKeyboardHelp);
      }
      if (e.key === 'Escape') {
        setShowDetails(false);
        setShowEditManager(false);
        setShowKeyboardHelp(false);
        setShowExportMenu(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showKeyboardHelp]);

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
    setPanPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX - panPosition.x,
      y: e.clientY - panPosition.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !isPanning) return;
    setPanPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    setZoom(prev => Math.max(0.5, Math.min(2, prev + delta)));
  };

  const expandAll = () => {
    const allIds = new Set(employees.map(e => e.id));
    setExpandedNodes(allIds);
    showToast({
      type: 'success',
      title: 'Expanded All',
      message: 'All organization levels are now visible'
    });
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
    showToast({
      type: 'success',
      title: 'Collapsed All',
      message: 'Organization chart collapsed to top level'
    });
  };

  const handleEmployeeClick = (employee: Employee) => {
    setNavigationHistory(prev => {
      const newHistory = [...prev, employee];
      return newHistory.slice(-5);
    });
    loadEmployeeDetails(employee);
  };

  const handleBreadcrumbClick = (employee: Employee) => {
    const element = document.getElementById(`employee-${employee.id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedEmployee(employee.id);
      setTimeout(() => setHighlightedEmployee(null), 3000);
    }
  };

  const handleExport = (format: 'csv' | 'json' | 'hierarchical' | 'markdown' | 'html') => {
    const companyName = currentCompany?.name_en || 'Company';

    switch (format) {
      case 'csv':
        OrgChartExport.exportToCSV(filteredEmployees);
        break;
      case 'json':
        OrgChartExport.exportToJSON(filteredEmployees);
        break;
      case 'hierarchical':
        OrgChartExport.exportToHierarchicalJSON(filteredEmployees);
        break;
      case 'markdown':
        OrgChartExport.exportToMarkdown(filteredEmployees);
        break;
      case 'html':
        OrgChartExport.exportToHTML(filteredEmployees, companyName);
        break;
    }

    showToast({
      type: 'success',
      title: 'Export Successful',
      message: `Organization chart exported as ${format.toUpperCase()}`
    });

    setShowExportMenu(false);
  };

  const handlePrint = () => {
    OrgChartExport.printOrgChart();
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

  const topLevelEmployees = getTopLevelEmployees();
  const departmentGroups = getDepartmentGroups();

  if (loading) {
    return <PageSkeleton />;
  }

  const tabs = [
    { id: 'chart', label: 'Organization Chart', icon: Network },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'comparison', label: 'Team Comparison', icon: TrendingUp },
    { id: 'visualization', label: 'Visualization', icon: Maximize }
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-400 rounded-xl blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
              <div className="relative h-14 w-14 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white shadow-lg">
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
              className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-gray-200 rounded-lg font-medium transition-all duration-200 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 hover:scale-105 hover:shadow-sm group"
              title="Refresh Data"
            >
              <RefreshCw className="h-4 w-4 group-hover:rotate-180 transition-transform duration-500" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg shadow-blue-200 hover:shadow-xl hover:scale-105"
              >
                <Download className="h-4 w-4" />
                <span>Export</span>
              </button>
              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border-2 border-gray-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <button
                    onClick={() => handleExport('csv')}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors text-left group"
                  >
                    <FileText className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-semibold text-gray-900 group-hover:text-blue-700">Export as CSV</p>
                      <p className="text-xs text-gray-600">Spreadsheet-friendly format</p>
                    </div>
                  </button>
                  <button
                    onClick={() => handleExport('json')}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-green-50 transition-colors text-left group"
                  >
                    <FileJson className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-semibold text-gray-900 group-hover:text-green-700">Export as JSON</p>
                      <p className="text-xs text-gray-600">Developer-friendly format</p>
                    </div>
                  </button>
                  <button
                    onClick={() => handleExport('hierarchical')}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-purple-50 transition-colors text-left group"
                  >
                    <GitBranch className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="font-semibold text-gray-900 group-hover:text-purple-700">Hierarchical JSON</p>
                      <p className="text-xs text-gray-600">Nested structure format</p>
                    </div>
                  </button>
                  <button
                    onClick={() => handleExport('markdown')}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-amber-50 transition-colors text-left group"
                  >
                    <FileText className="h-5 w-5 text-amber-600" />
                    <div>
                      <p className="font-semibold text-gray-900 group-hover:text-amber-700">Export as Markdown</p>
                      <p className="text-xs text-gray-600">Documentation format</p>
                    </div>
                  </button>
                  <button
                    onClick={() => handleExport('html')}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-cyan-50 transition-colors text-left group"
                  >
                    <Globe className="h-5 w-5 text-cyan-600" />
                    <div>
                      <p className="font-semibold text-gray-900 group-hover:text-cyan-700">Export as HTML</p>
                      <p className="text-xs text-gray-600">Interactive web page</p>
                    </div>
                  </button>
                  <div className="border-t-2 border-gray-100 my-2"></div>
                  <button
                    onClick={handlePrint}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left group"
                  >
                    <Printer className="h-5 w-5 text-gray-600" />
                    <div>
                      <p className="font-semibold text-gray-900 group-hover:text-gray-700">Print / Save as PDF</p>
                      <p className="text-xs text-gray-600">Print or save to PDF</p>
                    </div>
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={toggleFullscreen}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-gray-200 rounded-lg font-medium transition-all duration-200 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 hover:scale-105 hover:shadow-sm"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              <span className="hidden sm:inline">{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
            </button>
          </div>
        </div>

        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === 'chart' && (
          <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-300 mt-6">
              <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
                <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center flex-1">
                  <div className="relative flex-1 min-w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search employees..."
                      className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 hover:border-gray-300 bg-white"
                    />
                  </div>

                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <select
                      value={selectedDepartment}
                      onChange={(e) => setSelectedDepartment(e.target.value)}
                      className="pl-10 pr-8 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 hover:border-gray-300 bg-white appearance-none cursor-pointer min-w-48"
                    >
                      <option value="">All Departments</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>{dept.name_en}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-3">
                    {viewMode === 'hierarchy' && (
                      <>
                        <button
                          onClick={() => setCompactMode(!compactMode)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                            compactMode
                              ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                          title="Toggle Compact View"
                        >
                          <span className="hidden lg:inline">{compactMode ? 'Expanded' : 'Compact'}</span>
                        </button>
                        <button
                          onClick={() => setIsPanning(!isPanning)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                            isPanning
                              ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                          title="Toggle Pan Mode"
                        >
                          <Hand className="h-4 w-4" />
                          <span className="hidden lg:inline">Pan</span>
                        </button>
                        <button
                          onClick={expandAll}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 bg-gray-100 text-gray-700 hover:bg-gray-200"
                          title="Expand All (Ctrl+E)"
                        >
                          <ExpandAll className="h-4 w-4" />
                        </button>
                        <button
                          onClick={collapseAll}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 bg-gray-100 text-gray-700 hover:bg-gray-200"
                          title="Collapse All (Ctrl+C)"
                        >
                          <CollapseAll className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setShowKeyboardHelp(!showKeyboardHelp)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 bg-gray-100 text-gray-700 hover:bg-gray-200"
                      title="Keyboard Shortcuts (?)"
                    >
                      <Keyboard className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                    <button
                      onClick={handleZoomOut}
                      className="p-2 rounded-lg hover:bg-white transition-all duration-200 hover:shadow-sm"
                      title="Zoom Out"
                    >
                      <ZoomOut className="h-5 w-5 text-gray-600 hover:text-blue-600" />
                    </button>
                    <button
                      onClick={handleResetZoom}
                      className="p-2 rounded-lg hover:bg-white transition-all duration-200 hover:shadow-sm"
                      title="Reset Zoom"
                    >
                      <span className="text-sm font-semibold text-gray-600 hover:text-blue-600">{(zoom * 100).toFixed(0)}%</span>
                    </button>
                    <button
                      onClick={handleZoomIn}
                      className="p-2 rounded-lg hover:bg-white transition-all duration-200 hover:shadow-sm"
                      title="Zoom In"
                    >
                      <ZoomIn className="h-5 w-5 text-gray-600 hover:text-blue-600" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {navigationHistory.length > 0 && (
              <div className="mt-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 border-2 border-blue-200 animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-2 mb-3">
                  <History className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-semibold text-blue-900">Recently Viewed</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {navigationHistory.map((emp, index) => (
                    <button
                      key={`${emp.id}-${index}`}
                      onClick={() => handleBreadcrumbClick(emp)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-blue-100 rounded-lg border border-blue-200 transition-all duration-200 hover:shadow-md group"
                    >
                      <User className="h-3.5 w-3.5 text-blue-600" />
                      <span className="text-xs font-medium text-gray-700 group-hover:text-blue-700">
                        {emp.first_name_en} {emp.last_name_en}
                      </span>
                      {index < navigationHistory.length - 1 && (
                        <ChevronRight className="h-3 w-3 text-gray-400" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {filteredEmployees.length === 0 ? (
        <EmptyState
          icon={Network}
          title="No Employees in Organization Chart"
          description="Start building your organization structure by adding employees with reporting relationships"
        />
      ) : (
        <>
          {activeTab === 'chart' && (
            <div
              ref={chartRef}
              className={`bg-white rounded-xl shadow-sm border border-gray-100 p-8 overflow-hidden hover:shadow-md transition-all duration-300 print:shadow-none relative ${
                isPanning ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
              }`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
              style={{ height: 'calc(100vh - 400px)', minHeight: '600px' }}
            >
              {isPanning && (
                <div className="absolute top-4 left-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-2xl z-10 flex items-center gap-2 border-2 border-white/20">
                  <Hand className="h-4 w-4 animate-bounce" />
                  <span>Pan Mode Active - Drag to move</span>
                </div>
              )}
              <div
                className="inline-block min-w-full"
                style={{
                  transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoom})`,
                  transformOrigin: 'top center',
                  transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  pointerEvents: isPanning && isDragging ? 'none' : 'auto'
                }}
              >
                {viewMode === 'hierarchy' ? (
                  <div className="space-y-16">
                    {topLevelEmployees.map((topEmp) => (
                      <div key={topEmp.id} id={`employee-${topEmp.id}`}>
                        <OrgChartNode
                          employee={topEmp}
                          subordinates={filteredEmployees}
                          level={0}
                          onEmployeeClick={handleEmployeeClick}
                          compactMode={compactMode}
                          highlightedId={highlightedEmployee}
                          onEditManager={openEditManager}
                          expandedNodes={expandedNodes}
                          setExpandedNodes={setExpandedNodes}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-8">
                    {departmentGroups.map((group) => (
                      <div key={group.name} className="border-2 border-gray-200 rounded-xl p-6 bg-gradient-to-br from-white to-gray-50 hover:shadow-lg transition-all duration-300">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-gray-200">
                          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
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
                              className="bg-white rounded-xl p-4 cursor-pointer hover:bg-gradient-to-br hover:from-blue-50 hover:to-blue-50 border-2 border-gray-200 hover:border-blue-400 hover:shadow-lg transition-all duration-200 hover:-translate-y-1 group"
                            >
                              <div className="flex items-start gap-3">
                                <div className="relative">
                                  <div className="absolute inset-0 bg-blue-600 rounded-full blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
                                  <div className="relative bg-gradient-to-br from-blue-600 to-blue-700 rounded-full p-2.5 text-white shadow-lg group-hover:scale-110 transition-transform duration-200">
                                    <User className="h-5 w-5" />
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-gray-900 truncate group-hover:text-blue-700 transition-colors">
                                    {emp.first_name_en} {emp.last_name_en}
                                  </h4>
                                  <p className="text-sm text-gray-600 truncate mt-0.5">{emp.job_title_en}</p>
                                  <p className="text-xs text-gray-500 mt-1">{emp.employee_number}</p>
                                  {emp.direct_reports_count > 0 && (
                                    <div className="inline-flex items-center gap-1 mt-2 px-2 py-1 bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 rounded-full text-xs font-semibold">
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

          {activeTab === 'analytics' && (
            <OrgChartAnalytics employees={filteredEmployees} />
          )}

          {activeTab === 'comparison' && (
            <TeamComparison employees={filteredEmployees} />
          )}

          {activeTab === 'visualization' && (
            <OrgChartVisualization mode={viewMode} onModeChange={setViewMode} />
          )}
        </>
      )}

      {showDetails && selectedEmployee && (
        <div className="fixed inset-0 bg-gradient-to-br from-black/60 to-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            <div className="p-8 border-b border-gray-200 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 text-white relative overflow-hidden">
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
                    <p className="text-blue-100 mt-2 text-lg">{selectedEmployee.job_title_en}</p>
                    <p className="text-sm text-blue-200 mt-1 font-medium">{selectedEmployee.employee_number}</p>
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
              <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-blue-50 rounded-xl border border-blue-200">
                <button
                  onClick={() => {
                    setShowDetails(false);
                    openEditManager(selectedEmployee);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 font-medium"
                >
                  <Pencil className="h-4 w-4" />
                  Edit Reporting Relationship
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-600" />
                    Contact Information
                  </h4>
                  <div className="space-y-2">
                    {selectedEmployee.email && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="h-4 w-4" />
                        <a href={`mailto:${selectedEmployee.email}`} className="hover:text-blue-600">
                          {selectedEmployee.email}
                        </a>
                      </div>
                    )}
                    {selectedEmployee.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="h-4 w-4" />
                        <a href={`tel:${selectedEmployee.phone}`} className="hover:text-blue-600">
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
                    <TrendingUp className="h-5 w-5 text-blue-600" />
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
                          <div className="bg-blue-100 rounded-full p-2">
                            <User className="h-4 w-4 text-blue-600" />
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
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-2xl">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-bold">Edit Reporting Relationship</h3>
                  <p className="text-blue-100 mt-1">
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
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 bg-white appearance-none cursor-pointer"
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
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium shadow-lg shadow-blue-200"
                >
                  Update Manager
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <KeyboardShortcutsModal isOpen={showKeyboardHelp} onClose={() => setShowKeyboardHelp(false)} />
    </div>
  );
}
