import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/lib/supabase';
import {
  Users, UserCheck, UserX, TrendingUp, Calendar, AlertCircle,
  DollarSign, Clock, FileText, Car, Home, Shield, Plane,
  CreditCard, Briefcase, Award, UserCog, TrendingDown
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line } from 'recharts';

interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  onLeaveEmployees: number;
  terminatedEmployees: number;
  saudiEmployees: number;
  nonSaudiEmployees: number;
  saudizationPercentage: number;
  nitaqatColor: string;
  maleEmployees: number;
  femaleEmployees: number;
  pendingLeaveRequests: number;
  approvedLeaveToday: number;
  expiringDocuments: number;
  expiringIqamas: number;
  expiringPassports: number;
  totalPayroll: number;
  averageSalary: number;
  totalVehicles: number;
  totalProperties: number;
  activeContracts: number;
  expiringContracts: number;
  activeInsurancePolicies: number;
  pendingTravelRequests: number;
  totalDepartments: number;
  avgEmployeesPerDept: number;
}

export function Dashboard() {
  const { currentCompany } = useCompany();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    activeEmployees: 0,
    onLeaveEmployees: 0,
    terminatedEmployees: 0,
    saudiEmployees: 0,
    nonSaudiEmployees: 0,
    saudizationPercentage: 0,
    nitaqatColor: 'green',
    maleEmployees: 0,
    femaleEmployees: 0,
    pendingLeaveRequests: 0,
    approvedLeaveToday: 0,
    expiringDocuments: 0,
    expiringIqamas: 0,
    expiringPassports: 0,
    totalPayroll: 0,
    averageSalary: 0,
    totalVehicles: 0,
    totalProperties: 0,
    activeContracts: 0,
    expiringContracts: 0,
    activeInsurancePolicies: 0,
    pendingTravelRequests: 0,
    totalDepartments: 0,
    avgEmployeesPerDept: 0,
  });
  const [departmentData, setDepartmentData] = useState<any[]>([]);
  const [genderData, setGenderData] = useState<any[]>([]);
  const [employmentTypeData, setEmploymentTypeData] = useState<any[]>([]);
  const [monthlyHiresData, setMonthlyHiresData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white px-4 py-3 rounded-lg shadow-xl border border-gray-200">
          {label && <p className="font-semibold text-gray-900 mb-1">{label}</p>}
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              <span className="font-medium">{entry.name}:</span> {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name, value }: any) => {
    if (percent < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="font-semibold text-sm"
      >
        {`${value} (${(percent * 100).toFixed(0)}%)`}
      </text>
    );
  };

  useEffect(() => {
    if (currentCompany) {
      fetchDashboardStats();
    }
  }, [currentCompany]);

  const fetchDashboardStats = async () => {
    if (!currentCompany) return;

    setLoading(true);

    try {
      const [
        employeesResult,
        leaveRequestsResult,
        documentsResult,
        payrollResult,
        vehiclesResult,
        propertiesResult,
        contractsResult,
        insuranceResult,
        travelResult,
        departmentsResult
      ] = await Promise.all([
        supabase
          .from('employees')
          .select('status, is_saudi, gender, employment_type, iqama_expiry, passport_expiry')
          .eq('company_id', currentCompany.id),
        supabase
          .from('leave_requests')
          .select('status, start_date, end_date')
          .eq('company_id', currentCompany.id),
        supabase
          .from('documents')
          .select('expiry_date')
          .eq('company_id', currentCompany.id)
          .eq('status', 'active')
          .gte('expiry_date', new Date().toISOString()),
        supabase
          .from('payroll')
          .select('gross_salary, employee_id, effective_from')
          .eq('company_id', currentCompany.id)
          .gte('effective_from', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])
          .lt('effective_from', new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().split('T')[0]),
        supabase
          .from('vehicles')
          .select('id, status')
          .eq('company_id', currentCompany.id),
        supabase
          .from('real_estate_properties')
          .select('id')
          .eq('company_id', currentCompany.id),
        supabase
          .from('contracts')
          .select('status, end_date')
          .eq('company_id', currentCompany.id),
        supabase
          .from('insurance_policies')
          .select('status')
          .eq('company_id', currentCompany.id),
        supabase
          .from('business_travel')
          .select('approval_status')
          .eq('company_id', currentCompany.id),
        supabase
          .from('departments')
          .select('id')
          .eq('company_id', currentCompany.id),
      ]);

      const employees = employeesResult.data || [];
      const leaveRequests = leaveRequestsResult.data || [];
      const documents = documentsResult.data || [];
      const payrollRecords = payrollResult.data || [];
      const vehicles = vehiclesResult.data || [];
      const properties = propertiesResult.data || [];
      const contracts = contractsResult.data || [];
      const insurance = insuranceResult.data || [];
      const travel = travelResult.data || [];
      const departments = departmentsResult.data || [];

      const totalEmployees = employees.length;
      const activeEmployees = employees.filter(e => e.status === 'active').length;
      const onLeaveEmployees = employees.filter(e => e.status === 'on_leave').length;
      const terminatedEmployees = employees.filter(e => e.status === 'terminated').length;

      const saudiEmployees = employees.filter(e => e.is_saudi === true && e.status === 'active').length;
      const nonSaudiEmployees = employees.filter(e => e.is_saudi === false && e.status === 'active').length;

      const maleEmployees = employees.filter(e => e.gender === 'male' && e.status === 'active').length;
      const femaleEmployees = employees.filter(e => e.gender === 'female' && e.status === 'active').length;

      const totalActiveForSaudization = saudiEmployees + nonSaudiEmployees;
      const saudizationPercentage = totalActiveForSaudization > 0
        ? Math.round((saudiEmployees / totalActiveForSaudization) * 100)
        : 0;

      let nitaqatColor = 'red';
      if (saudizationPercentage >= 40) nitaqatColor = 'platinum';
      else if (saudizationPercentage >= 30) nitaqatColor = 'green';
      else if (saudizationPercentage >= 20) nitaqatColor = 'yellow';

      const pendingLeaveRequests = leaveRequests.filter(lr => lr.status === 'pending').length;
      const today = new Date().toISOString().split('T')[0];
      const approvedLeaveToday = leaveRequests.filter(lr =>
        lr.status === 'approved' &&
        lr.start_date <= today &&
        lr.end_date >= today
      ).length;

      const in90Days = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const expiringDocuments = documents.filter(d => d.expiry_date && d.expiry_date <= in90Days).length;

      const expiringIqamas = employees.filter(e =>
        e.iqama_expiry && e.iqama_expiry <= in90Days && e.status === 'active'
      ).length;

      const expiringPassports = employees.filter(e =>
        e.passport_expiry && e.passport_expiry <= in90Days && e.status === 'active'
      ).length;

      const uniqueEmployeeIds = new Set(payrollRecords.map(p => p.employee_id));
      const totalPayroll = payrollRecords.reduce((sum, p) => sum + (parseFloat(p.gross_salary) || 0), 0);
      const averageSalary = uniqueEmployeeIds.size > 0 ? Math.round(totalPayroll / uniqueEmployeeIds.size) : 0;

      const totalVehicles = vehicles.length;
      const totalProperties = properties.length;
      const activeContracts = contracts.filter(c => c.status === 'active').length;
      const expiringContracts = contracts.filter(c =>
        c.status === 'active' && c.end_date && c.end_date <= in90Days
      ).length;
      const activeInsurancePolicies = insurance.filter(i => i.status === 'active').length;
      const pendingTravelRequests = travel.filter(t => t.approval_status === 'pending').length;

      const totalDepartments = departments.length;
      const avgEmployeesPerDept = totalDepartments > 0 ? Math.round(activeEmployees / totalDepartments) : 0;

      setStats({
        totalEmployees,
        activeEmployees,
        onLeaveEmployees,
        terminatedEmployees,
        saudiEmployees,
        nonSaudiEmployees,
        saudizationPercentage,
        nitaqatColor,
        maleEmployees,
        femaleEmployees,
        pendingLeaveRequests,
        approvedLeaveToday,
        expiringDocuments,
        expiringIqamas,
        expiringPassports,
        totalPayroll,
        averageSalary,
        totalVehicles,
        totalProperties,
        activeContracts,
        expiringContracts,
        activeInsurancePolicies,
        pendingTravelRequests,
        totalDepartments,
        avgEmployeesPerDept,
      });

      setGenderData([
        { name: 'Male', value: maleEmployees },
        { name: 'Female', value: femaleEmployees },
      ]);

      const employmentTypeCounts = employees.reduce((acc: any, emp: any) => {
        if (emp.status === 'active') {
          const type = emp.employment_type || 'indefinite';
          acc[type] = (acc[type] || 0) + 1;
        }
        return acc;
      }, {});

      setEmploymentTypeData(
        Object.entries(employmentTypeCounts).map(([name, value]) => ({
          name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          value
        }))
      );

      const { data: deptData } = await supabase
        .from('employees')
        .select('department_id, departments!employees_department_id_fkey(name_en)')
        .eq('company_id', currentCompany.id)
        .eq('status', 'active');

      const deptCounts = (deptData || []).reduce((acc: any, emp: any) => {
        const deptName = emp.departments?.name_en || 'Unassigned';
        acc[deptName] = (acc[deptName] || 0) + 1;
        return acc;
      }, {});

      setDepartmentData(
        Object.entries(deptCounts).map(([name, value]) => ({ name, value }))
      );

      const { data: hireData } = await supabase
        .from('employees')
        .select('hire_date')
        .eq('company_id', currentCompany.id);

      const last6Months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (5 - i));
        return d.toISOString().slice(0, 7);
      });

      const hireCounts = last6Months.map(month => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        hires: (hireData || []).filter((emp: any) => emp.hire_date?.startsWith(month)).length,
      }));

      setMonthlyHiresData(hireCounts);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNitaqatColorClass = (color: string) => {
    switch (color) {
      case 'platinum':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'green':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'yellow':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'red':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome to {currentCompany?.name_en || 'Saudi HR Management System'}</p>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Employee Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            onClick={() => navigate('/employees')}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Employees</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalEmployees}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-full">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div
            onClick={() => navigate('/employees?status=active')}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Employees</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats.activeEmployees}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-full">
                <UserCheck className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </div>

          <div
            onClick={() => navigate('/employees?status=on_leave')}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">On Leave</p>
                <p className="text-3xl font-bold text-yellow-600 mt-1">{stats.onLeaveEmployees}</p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-full">
                <Calendar className="h-8 w-8 text-yellow-600" />
              </div>
            </div>
          </div>

          <div
            onClick={() => navigate('/employees?status=terminated')}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Terminated</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{stats.terminatedEmployees}</p>
              </div>
              <div className="p-3 bg-red-50 rounded-full">
                <TrendingDown className="h-8 w-8 text-red-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Workforce Composition</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            onClick={() => navigate('/employees?nationality=saudi')}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Saudi Employees</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{stats.saudiEmployees}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-full">
                <UserCheck className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div
            onClick={() => navigate('/employees?nationality=non-saudi')}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Non-Saudi</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">{stats.nonSaudiEmployees}</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-full">
                <UserX className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </div>

          <div
            onClick={() => navigate('/employees?gender=male')}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Male</p>
                <p className="text-3xl font-bold text-indigo-600 mt-1">{stats.maleEmployees}</p>
              </div>
              <div className="p-3 bg-indigo-50 rounded-full">
                <Users className="h-8 w-8 text-indigo-600" />
              </div>
            </div>
          </div>

          <div
            onClick={() => navigate('/employees?gender=female')}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Female</p>
                <p className="text-3xl font-bold text-pink-600 mt-1">{stats.femaleEmployees}</p>
              </div>
              <div className="p-3 bg-pink-50 rounded-full">
                <Users className="h-8 w-8 text-pink-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Payroll & Finance</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            onClick={() => navigate('/payroll')}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Monthly Payroll</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(stats.totalPayroll)}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-full">
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </div>

          <div
            onClick={() => navigate('/payroll')}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Salary</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(stats.averageSalary)}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-full">
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div
            onClick={() => navigate('/employees')}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Departments</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">{stats.totalDepartments}</p>
                <p className="text-xs text-gray-500 mt-1">Avg: {stats.avgEmployeesPerDept} emp/dept</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-full">
                <UserCog className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Leave & Attendance</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            onClick={() => navigate('/leave')}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Leave Requests</p>
                <p className="text-3xl font-bold text-yellow-600 mt-1">{stats.pendingLeaveRequests}</p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-full">
                <Calendar className="h-8 w-8 text-yellow-600" />
              </div>
            </div>
          </div>

          <div
            onClick={() => navigate('/attendance')}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">On Leave Today</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{stats.approvedLeaveToday}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-full">
                <Clock className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div
            onClick={() => navigate('/travel')}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Travel</p>
                <p className="text-3xl font-bold text-indigo-600 mt-1">{stats.pendingTravelRequests}</p>
              </div>
              <div className="p-3 bg-indigo-50 rounded-full">
                <Plane className="h-8 w-8 text-indigo-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Document Compliance</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            onClick={() => navigate('/documents')}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Expiring Documents</p>
                <p className="text-xs text-gray-500">Next 90 days</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{stats.expiringDocuments}</p>
              </div>
              <div className="p-3 bg-red-50 rounded-full">
                <FileText className="h-8 w-8 text-red-600" />
              </div>
            </div>
          </div>

          <div
            onClick={() => navigate('/employees')}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Expiring Iqamas</p>
                <p className="text-xs text-gray-500">Next 90 days</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">{stats.expiringIqamas}</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-full">
                <CreditCard className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </div>

          <div
            onClick={() => navigate('/employees')}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Expiring Passports</p>
                <p className="text-xs text-gray-500">Next 90 days</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">{stats.expiringPassports}</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-full">
                <FileText className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>

          <div
            onClick={() => navigate('/contracts')}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Expiring Contracts</p>
                <p className="text-xs text-gray-500">Next 90 days</p>
                <p className="text-3xl font-bold text-yellow-600 mt-1">{stats.expiringContracts}</p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-full">
                <Briefcase className="h-8 w-8 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Assets & Resources</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            onClick={() => navigate('/vehicles')}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Vehicles</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{stats.totalVehicles}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-full">
                <Car className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div
            onClick={() => navigate('/real-estate')}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Properties</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats.totalProperties}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-full">
                <Home className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </div>

          <div
            onClick={() => navigate('/contracts')}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Contracts</p>
                <p className="text-3xl font-bold text-indigo-600 mt-1">{stats.activeContracts}</p>
              </div>
              <div className="p-3 bg-indigo-50 rounded-full">
                <Briefcase className="h-8 w-8 text-indigo-600" />
              </div>
            </div>
          </div>

          <div
            onClick={() => navigate('/insurance')}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Insurance Policies</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">{stats.activeInsurancePolicies}</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-full">
                <Shield className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          onClick={() => navigate('/nitaqat')}
          className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center space-x-3 mb-4">
            <TrendingUp className="h-6 w-6 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900">Nitaqat Compliance</h2>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Saudization Rate</span>
                <span className="text-2xl font-bold text-gray-900">{stats.saudizationPercentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-primary-600 h-3 rounded-full transition-all"
                  style={{ width: `${stats.saudizationPercentage}%` }}
                ></div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Nitaqat Status</span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium border ${getNitaqatColorClass(
                  stats.nitaqatColor
                )}`}
              >
                {stats.nitaqatColor.toUpperCase()}
              </span>
            </div>
            <div className="pt-4 border-t border-gray-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Saudi: {stats.saudiEmployees}</span>
                <span className="text-gray-600">Non-Saudi: {stats.nonSaudiEmployees}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-3 mb-4">
            <AlertCircle className="h-6 w-6 text-orange-600" />
            <h2 className="text-lg font-semibold text-gray-900">Quick Alerts</h2>
          </div>
          <div className="space-y-3">
            {stats.expiringIqamas > 0 && (
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center space-x-3">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="text-sm font-medium text-red-900">Iqamas Expiring Soon</span>
                </div>
                <span className="text-lg font-bold text-red-700">{stats.expiringIqamas}</span>
              </div>
            )}
            {stats.pendingLeaveRequests > 0 && (
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-900">Pending Leave Requests</span>
                </div>
                <span className="text-lg font-bold text-yellow-700">{stats.pendingLeaveRequests}</span>
              </div>
            )}
            {stats.expiringContracts > 0 && (
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-center space-x-3">
                  <Briefcase className="h-5 w-5 text-orange-600" />
                  <span className="text-sm font-medium text-orange-900">Contracts Expiring</span>
                </div>
                <span className="text-lg font-bold text-orange-700">{stats.expiringContracts}</span>
              </div>
            )}
            {stats.pendingTravelRequests > 0 && (
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center space-x-3">
                  <Plane className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Travel Approvals Needed</span>
                </div>
                <span className="text-lg font-bold text-blue-700">{stats.pendingTravelRequests}</span>
              </div>
            )}
            {stats.expiringIqamas === 0 && stats.pendingLeaveRequests === 0 && stats.expiringContracts === 0 && stats.pendingTravelRequests === 0 && (
              <div className="flex items-center justify-center p-6 bg-green-50 rounded-lg">
                <div className="text-center">
                  <Award className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-green-900">All Clear!</p>
                  <p className="text-xs text-green-700 mt-1">No urgent items requiring attention</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary-600" />
            Gender Distribution
          </h2>
          {genderData.some(d => d.value > 0) ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={genderData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={CustomPieLabel}
                    outerRadius={85}
                    fill="#8884d8"
                    dataKey="value"
                    strokeWidth={2}
                    stroke="#fff"
                  >
                    <Cell fill="#3B82F6" />
                    <Cell fill="#EC4899" />
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-sm text-gray-600">Male: {genderData[0]?.value || 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-pink-500"></div>
                  <span className="text-sm text-gray-600">Female: {genderData[1]?.value || 0}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[220px]">
              <p className="text-center text-gray-400">No data available</p>
            </div>
          )}
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary-600" />
            Employment Types
          </h2>
          {employmentTypeData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={employmentTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={CustomPieLabel}
                    outerRadius={85}
                    fill="#8884d8"
                    dataKey="value"
                    strokeWidth={2}
                    stroke="#fff"
                  >
                    {employmentTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {employmentTypeData.map((entry, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                    <span className="text-xs text-gray-600 truncate">{entry.name}: {entry.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[220px]">
              <p className="text-center text-gray-400">No data available</p>
            </div>
          )}
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary-600" />
            Departments
          </h2>
          {departmentData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={departmentData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={CustomPieLabel}
                    outerRadius={85}
                    fill="#8884d8"
                    dataKey="value"
                    strokeWidth={2}
                    stroke="#fff"
                  >
                    {departmentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-4 max-h-24 overflow-y-auto">
                {departmentData.map((entry, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                    <span className="text-xs text-gray-600 truncate">{entry.name}: {entry.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[220px]">
              <p className="text-center text-gray-400">No department data</p>
            </div>
          )}
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary-600" />
          Hiring Trend (Last 6 Months)
        </h2>
        {monthlyHiresData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyHiresData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="colorHires" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis
                dataKey="month"
                tick={{ fill: '#6B7280', fontSize: 12 }}
                axisLine={{ stroke: '#E5E7EB' }}
                tickLine={{ stroke: '#E5E7EB' }}
              />
              <YAxis
                tick={{ fill: '#6B7280', fontSize: 12 }}
                axisLine={{ stroke: '#E5E7EB' }}
                tickLine={{ stroke: '#E5E7EB' }}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="circle"
              />
              <Line
                type="monotone"
                dataKey="hires"
                stroke="#10B981"
                strokeWidth={3}
                name="New Hires"
                dot={{ fill: '#10B981', r: 5 }}
                activeDot={{ r: 7, fill: '#059669' }}
                fill="url(#colorHires)"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[300px]">
            <p className="text-center text-gray-400">No hiring data available</p>
          </div>
        )}
      </div>
    </div>
  );
}
