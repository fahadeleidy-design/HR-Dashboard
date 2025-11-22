import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/lib/supabase';
import { Employee } from '@/types/database';
import { Plus, Upload, Download, Pencil, Trash2, Search, Eye } from 'lucide-react';
import { EmployeeForm } from '@/components/EmployeeForm';
import { BulkUpload } from '@/components/BulkUpload';
import { EmployeeDetail } from '@/components/EmployeeDetail';
import * as XLSX from 'xlsx';

export function Employees() {
  const { currentCompany } = useCompany();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    if (currentCompany) {
      fetchEmployees();
      subscribeToChanges();
    }
  }, [currentCompany]);

  useEffect(() => {
    filterEmployees();
  }, [searchTerm, employees]);

  const fetchEmployees = async () => {
    if (!currentCompany) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToChanges = () => {
    if (!currentCompany) return;

    const channel = supabase
      .channel('employees_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'employees',
          filter: `company_id=eq.${currentCompany.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setEmployees((prev) => [payload.new as Employee, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setEmployees((prev) =>
              prev.map((emp) =>
                emp.id === payload.new.id ? (payload.new as Employee) : emp
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setEmployees((prev) => prev.filter((emp) => emp.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const filterEmployees = () => {
    if (!searchTerm) {
      setFilteredEmployees(employees);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = employees.filter(
      (emp) =>
        emp.first_name_en.toLowerCase().includes(term) ||
        emp.last_name_en.toLowerCase().includes(term) ||
        emp.employee_number.toLowerCase().includes(term) ||
        emp.email?.toLowerCase().includes(term) ||
        emp.nationality.toLowerCase().includes(term) ||
        emp.job_title_en.toLowerCase().includes(term)
    );
    setFilteredEmployees(filtered);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this employee?')) return;

    try {
      const { error } = await supabase.from('employees').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting employee:', error);
      alert('Failed to delete employee');
    }
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setShowForm(true);
  };

  const handleView = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    setShowDetail(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingEmployee(null);
  };

  const handleExport = () => {
    const exportData = employees.map((emp) => ({
      'Employee Number': emp.employee_number,
      'First Name (EN)': emp.first_name_en,
      'Last Name (EN)': emp.last_name_en,
      'First Name (AR)': emp.first_name_ar || '',
      'Last Name (AR)': emp.last_name_ar || '',
      Email: emp.email || '',
      Phone: emp.phone || '',
      Nationality: emp.nationality,
      'Is Saudi': emp.is_saudi ? 'Yes' : 'No',
      Gender: emp.gender,
      'Date of Birth': emp.date_of_birth || '',
      'Hire Date': emp.hire_date,
      'Job Title (EN)': emp.job_title_en,
      'Job Title (AR)': emp.job_title_ar || '',
      'Employment Type': emp.employment_type,
      Status: emp.status,
      'Iqama Number': emp.iqama_number || '',
      'Iqama Expiry': emp.iqama_expiry || '',
      'Passport Number': emp.passport_number || '',
      'Passport Expiry': emp.passport_expiry || '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Employees');
    XLSX.writeFile(wb, `employees_${currentCompany?.name_en}_${new Date().toISOString().split('T')[0]}.xlsx`);
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Employees</h1>
          <p className="text-gray-600 mt-1">Manage your employee records</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleExport}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
          <button
            onClick={() => setShowBulkUpload(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            <Upload className="h-4 w-4" />
            <span>Bulk Upload</span>
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Job Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IQAMA/ID Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Iqama Expiry
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nationality
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hire Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    No employees found. Click "Add Employee" or "Bulk Upload" to get started.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {employee.employee_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {employee.first_name_en} {employee.last_name_en}
                      </div>
                      <div className="text-sm text-gray-500">{employee.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.job_title_en}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.iqama_number || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.iqama_expiry ? (
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          new Date(employee.iqama_expiry) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {new Date(employee.iqama_expiry).toLocaleDateString()}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        employee.is_saudi
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {employee.nationality}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        employee.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : employee.status === 'on_leave'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {employee.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(employee.hire_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleView(employee.id)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(employee)}
                        className="text-primary-600 hover:text-primary-900 mr-3"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(employee.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-700">
            Showing {filteredEmployees.length} of {employees.length} employees
          </div>
        </div>
      </div>

      {showForm && (
        <EmployeeForm
          employee={editingEmployee}
          onClose={handleFormClose}
          onSuccess={fetchEmployees}
        />
      )}

      {showBulkUpload && (
        <BulkUpload
          onClose={() => setShowBulkUpload(false)}
          onSuccess={fetchEmployees}
        />
      )}

      {showDetail && selectedEmployeeId && (
        <EmployeeDetail
          employeeId={selectedEmployeeId}
          onClose={() => {
            setShowDetail(false);
            setSelectedEmployeeId(null);
          }}
        />
      )}
    </div>
  );
}
