import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { X, User, Briefcase, Calendar, FileText, DollarSign, Clock } from 'lucide-react';

interface EmployeeDetailProps {
  employeeId: string;
  onClose: () => void;
}

interface EmployeeData {
  id: string;
  employee_number: string;
  first_name_en: string;
  last_name_en: string;
  first_name_ar: string | null;
  last_name_ar: string | null;
  email: string | null;
  phone: string | null;
  nationality: string;
  is_saudi: boolean;
  has_disability: boolean | null;
  gender: string;
  date_of_birth: string | null;
  hire_date: string;
  job_title_en: string;
  job_title_ar: string | null;
  employment_type: string;
  status: string;
  iqama_number: string | null;
  iqama_expiry: string | null;
  passport_number: string | null;
  passport_expiry: string | null;
  department: { name_en: string } | null;
}

export function EmployeeDetail({ employeeId, onClose }: EmployeeDetailProps) {
  const [employee, setEmployee] = useState<EmployeeData | null>(null);
  const [payroll, setPayroll] = useState<any>(null);
  const [leaveBalance, setLeaveBalance] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployeeData();
  }, [employeeId]);

  const fetchEmployeeData = async () => {
    setLoading(true);
    try {
      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select('*, department:departments!employees_department_id_fkey(name_en)')
        .eq('id', employeeId)
        .single();

      if (empError) throw empError;
      setEmployee(empData);

      const { data: payrollData } = await supabase
        .from('payroll')
        .select('*')
        .eq('employee_id', employeeId)
        .order('effective_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      setPayroll(payrollData);

      const { data: docsData } = await supabase
        .from('documents')
        .select('*')
        .eq('employee_id', employeeId)
        .order('expiry_date', { ascending: true });

      setDocuments(docsData || []);

      const { data: leaveData } = await supabase
        .from('leave_requests')
        .select('leave_type_id, days_requested, status')
        .eq('employee_id', employeeId)
        .eq('status', 'approved');

      const leaveGroups = (leaveData || []).reduce((acc: any, req: any) => {
        if (!acc[req.leave_type_id]) {
          acc[req.leave_type_id] = 0;
        }
        acc[req.leave_type_id] += req.days_requested;
        return acc;
      }, {});

      const { data: leaveTypes } = await supabase
        .from('leave_types')
        .select('*')
        .in('id', Object.keys(leaveGroups));

      const balances = (leaveTypes || []).map((type: any) => ({
        type: type.name_en,
        used: leaveGroups[type.id] || 0,
        total: type.days_allowed,
        remaining: type.days_allowed - (leaveGroups[type.id] || 0),
      }));

      setLeaveBalance(balances);
    } catch (error) {
      console.error('Error fetching employee data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (!employee) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full my-8">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="h-16 w-16 bg-primary-100 rounded-full flex items-center justify-center">
              <User className="h-8 w-8 text-primary-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {employee.first_name_en} {employee.last_name_en}
              </h2>
              <p className="text-gray-600">{employee.employee_number} • {employee.job_title_en}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center space-x-2 mb-4">
                <User className="h-5 w-5 text-primary-600" />
                <h3 className="text-lg font-bold text-gray-900">Personal Information</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Full Name (Arabic)</p>
                  <p className="text-sm font-medium text-gray-900" dir="rtl">
                    {employee.first_name_ar} {employee.last_name_ar}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="text-sm font-medium text-gray-900">{employee.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="text-sm font-medium text-gray-900">{employee.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Nationality</p>
                  <p className="text-sm font-medium text-gray-900">
                    {employee.nationality} {employee.is_saudi && '(Saudi)'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Gender</p>
                  <p className="text-sm font-medium text-gray-900 capitalize">{employee.gender}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Date of Birth</p>
                  <p className="text-sm font-medium text-gray-900">
                    {employee.date_of_birth ? new Date(employee.date_of_birth).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Briefcase className="h-5 w-5 text-primary-600" />
                <h3 className="text-lg font-bold text-gray-900">Employment Details</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Department</p>
                  <p className="text-sm font-medium text-gray-900">{employee.department?.name_en || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Job Title (Arabic)</p>
                  <p className="text-sm font-medium text-gray-900" dir="rtl">{employee.job_title_ar || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Employment Type</p>
                  <p className="text-sm font-medium text-gray-900 capitalize">
                    {employee.employment_type.replace('_', ' ')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    employee.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : employee.status === 'on_leave'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {employee.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Hire Date</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(employee.hire_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Years of Service</p>
                  <p className="text-sm font-medium text-gray-900">
                    {Math.floor((new Date().getTime() - new Date(employee.hire_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} years
                  </p>
                </div>
              </div>
            </div>
          </div>

          {payroll && (
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center space-x-2 mb-4">
                <DollarSign className="h-5 w-5 text-primary-600" />
                <h3 className="text-lg font-bold text-gray-900">Current Salary</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Basic Salary</p>
                  <p className="text-lg font-bold text-gray-900">SAR {payroll.basic_salary.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Housing</p>
                  <p className="text-lg font-bold text-gray-900">SAR {payroll.housing_allowance.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Transportation</p>
                  <p className="text-lg font-bold text-gray-900">SAR {payroll.transportation_allowance.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Net Salary</p>
                  <p className="text-lg font-bold text-green-600">SAR {payroll.net_salary.toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}

          {leaveBalance.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Calendar className="h-5 w-5 text-primary-600" />
                <h3 className="text-lg font-bold text-gray-900">Leave Balance</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {leaveBalance.map((balance, idx) => (
                  <div key={idx} className="bg-white rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-2">{balance.type}</p>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs text-gray-500">Used / Total</p>
                        <p className="text-sm font-medium text-gray-900">
                          {balance.used} / {balance.total} days
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Remaining</p>
                        <p className="text-lg font-bold text-green-600">{balance.remaining}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center space-x-2 mb-4">
                <FileText className="h-5 w-5 text-primary-600" />
                <h3 className="text-lg font-bold text-gray-900">Documents</h3>
              </div>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-sm text-gray-600">Iqama Number</p>
                    <p className="text-sm font-medium text-gray-900">{employee.iqama_number || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Iqama Expiry</p>
                    <p className="text-sm font-medium text-gray-900">
                      {employee.iqama_expiry ? new Date(employee.iqama_expiry).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Passport Number</p>
                    <p className="text-sm font-medium text-gray-900">{employee.passport_number || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Passport Expiry</p>
                    <p className="text-sm font-medium text-gray-900">
                      {employee.passport_expiry ? new Date(employee.passport_expiry).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
                {documents.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Additional Documents</p>
                    <div className="space-y-2">
                      {documents.map((doc) => (
                        <div key={doc.id} className="flex justify-between items-center bg-white rounded p-2">
                          <span className="text-sm text-gray-900">{doc.document_type}</span>
                          <span className={`text-xs px-2 py-1 rounded ${
                            doc.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : doc.status === 'expiring_soon'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {doc.status.replace('_', ' ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Clock className="h-5 w-5 text-primary-600" />
                <h3 className="text-lg font-bold text-gray-900">Quick Stats</h3>
              </div>
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-4">
                  <p className="text-sm text-gray-600">Employee Since</p>
                  <p className="text-lg font-bold text-gray-900">
                    {new Date(employee.hire_date).toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <p className="text-sm text-gray-600">Employment Status</p>
                  <p className="text-lg font-bold text-gray-900 capitalize">{employee.status.replace('_', ' ')}</p>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <p className="text-sm text-gray-600">Nationality Status</p>
                  <p className="text-lg font-bold text-gray-900">{employee.is_saudi ? 'Saudi National' : 'Expat'}</p>
                  {employee.is_saudi && employee.has_disability && (
                    <div className="mt-2 flex items-center space-x-1 text-xs text-blue-600">
                      <span className="font-semibold">Has Disability</span>
                      <span className="text-gray-500">(Counts as 4.0 for Nitaqat)</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
