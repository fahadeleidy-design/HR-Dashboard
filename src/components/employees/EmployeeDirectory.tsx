import { useState, useEffect } from 'react';
import { Search, Mail, Phone, Building2, MapPin, Calendar, Award, Users, Filter, Grid, List } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface EmployeeDirectoryProps {
  companyId: string;
  onEmployeeSelect?: (employeeId: string) => void;
}

interface DirectoryEmployee {
  id: string;
  employee_number: string;
  first_name_en: string;
  last_name_en: string;
  email: string;
  mobile: string;
  position: string;
  department?: {
    name_en: string;
  };
  status: string;
  hire_date: string;
  photo_url?: string;
}

export function EmployeeDirectory({ companyId, onEmployeeSelect }: EmployeeDirectoryProps) {
  const [employees, setEmployees] = useState<DirectoryEmployee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<DirectoryEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [departments, setDepartments] = useState<any[]>([]);

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
  }, [companyId]);

  useEffect(() => {
    filterEmployees();
  }, [searchTerm, departmentFilter, statusFilter, employees]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          id,
          employee_number,
          first_name_en,
          last_name_en,
          email,
          mobile,
          position,
          status,
          hire_date,
          photo_url,
          department:departments(name_en)
        `)
        .eq('company_id', companyId)
        .order('first_name_en');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name_en')
        .eq('company_id', companyId)
        .order('name_en');

      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const filterEmployees = () => {
    let filtered = employees;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(emp =>
        emp.first_name_en.toLowerCase().includes(term) ||
        emp.last_name_en.toLowerCase().includes(term) ||
        emp.employee_number.toLowerCase().includes(term) ||
        emp.email?.toLowerCase().includes(term) ||
        emp.position?.toLowerCase().includes(term)
      );
    }

    if (departmentFilter) {
      filtered = filtered.filter(emp => emp.department?.name_en === departmentFilter);
    }

    if (statusFilter) {
      filtered = filtered.filter(emp => emp.status === statusFilter);
    }

    setFilteredEmployees(filtered);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'probation': return 'bg-yellow-100 text-yellow-800';
      case 'notice_period': return 'bg-orange-100 text-orange-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Employee Directory</h2>
          <p className="text-gray-600 mt-1">{filteredEmployees.length} employees</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-2 rounded-lg transition-colors ${
              viewMode === 'grid'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Grid className="h-5 w-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-2 rounded-lg transition-colors ${
              viewMode === 'list'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <List className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search employees..."
            />
          </div>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Departments</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.name_en}>{dept.name_en}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="probation">Probation</option>
            <option value="notice_period">Notice Period</option>
            <option value="inactive">Inactive</option>
          </select>

          <button
            onClick={() => {
              setSearchTerm('');
              setDepartmentFilter('');
              setStatusFilter('active');
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredEmployees.map((employee) => (
            <div
              key={employee.id}
              onClick={() => onEmployeeSelect?.(employee.id)}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-24"></div>
              <div className="px-6 pb-6">
                <div className="flex justify-center -mt-12 mb-4">
                  {employee.photo_url ? (
                    <img
                      src={employee.photo_url}
                      alt={`${employee.first_name_en} ${employee.last_name_en}`}
                      className="h-24 w-24 rounded-full border-4 border-white object-cover"
                    />
                  ) : (
                    <div className="h-24 w-24 rounded-full border-4 border-white bg-gray-200 flex items-center justify-center">
                      <span className="text-2xl font-bold text-gray-600">
                        {getInitials(employee.first_name_en, employee.last_name_en)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="text-center mb-4">
                  <h3 className="text-lg font-bold text-gray-900">
                    {employee.first_name_en} {employee.last_name_en}
                  </h3>
                  <p className="text-sm text-gray-600">{employee.position}</p>
                  <p className="text-xs text-gray-500 mt-1">{employee.employee_number}</p>
                </div>

                <div className="space-y-2">
                  {employee.department && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Building2 className="h-4 w-4 text-gray-400" />
                      <span className="truncate">{employee.department.name_en}</span>
                    </div>
                  )}
                  {employee.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="truncate">{employee.email}</span>
                    </div>
                  )}
                  {employee.mobile && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span>{employee.mobile}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(employee.status)}`}>
                    {employee.status}
                  </span>
                  {employee.hire_date && (
                    <span className="text-xs text-gray-500">
                      {new Date(employee.hire_date).getFullYear()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hire Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredEmployees.map((employee) => (
                <tr
                  key={employee.id}
                  onClick={() => onEmployeeSelect?.(employee.id)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      {employee.photo_url ? (
                        <img
                          src={employee.photo_url}
                          alt={`${employee.first_name_en} ${employee.last_name_en}`}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            {getInitials(employee.first_name_en, employee.last_name_en)}
                          </span>
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {employee.first_name_en} {employee.last_name_en}
                        </div>
                        <div className="text-xs text-gray-500">{employee.employee_number}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {employee.position}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {employee.department?.name_en || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{employee.email}</div>
                    <div className="text-xs text-gray-500">{employee.mobile}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {employee.hire_date ? new Date(employee.hire_date).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(employee.status)}`}>
                      {employee.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filteredEmployees.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900 mb-2">No Employees Found</p>
          <p className="text-sm text-gray-600">
            Try adjusting your search criteria or filters
          </p>
        </div>
      )}
    </div>
  );
}
