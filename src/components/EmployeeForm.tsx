import { useState, useEffect } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { Employee, Department } from '@/types/database';
import { X } from 'lucide-react';
import { SearchableSelect } from '@/components/SearchableSelect';

interface EmployeeFormProps {
  employee: Employee | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function EmployeeForm({ employee, onClose, onSuccess }: EmployeeFormProps) {
  const { currentCompany } = useCompany();
  const { t, isRTL } = useLanguage();
  const [companies, setCompanies] = useState<any[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [payroll, setPayroll] = useState<any>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState(employee?.company_id || currentCompany?.id || '');
  const [formData, setFormData] = useState({
    employee_number: employee?.employee_number || '',
    first_name_en: employee?.first_name_en || '',
    last_name_en: employee?.last_name_en || '',
    first_name_ar: employee?.first_name_ar || '',
    last_name_ar: employee?.last_name_ar || '',
    email: employee?.email || '',
    phone: employee?.phone || '',
    nationality: employee?.nationality || '',
    is_saudi: employee?.is_saudi || false,
    has_disability: employee?.has_disability || false,
    gender: employee?.gender || 'male',
    date_of_birth: employee?.date_of_birth || '',
    hire_date: employee?.hire_date || new Date().toISOString().split('T')[0],
    probation_end_date: employee?.probation_end_date || '',
    contract_start_date: employee?.contract_start_date || '',
    contract_end_date: employee?.contract_end_date || '',
    job_title_en: employee?.job_title_en || '',
    job_title_ar: employee?.job_title_ar || '',
    employment_type: employee?.employment_type || 'indefinite',
    status: employee?.status || 'active',
    iqama_number: employee?.iqama_number || '',
    iqama_expiry: employee?.iqama_expiry || '',
    passport_number: employee?.passport_number || '',
    passport_expiry: employee?.passport_expiry || '',
    department_id: employee?.department_id || '',
    manager_id: employee?.manager_id || '',
  });
  const [payrollData, setPayrollData] = useState({
    basic_salary: '0',
    housing_allowance: '0',
    transportation_allowance: '0',
    other_allowances: '0',
    iban: '',
    bank_name: '',
  });

  useEffect(() => {
    fetchCompanies();
    if (employee) {
      fetchPayroll();
    }
  }, [employee]);

  useEffect(() => {
    if (selectedCompanyId) {
      fetchDepartments();
      fetchManagers();
    }
  }, [selectedCompanyId]);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name_en, name_ar')
        .order('name_en');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const fetchDepartments = async () => {
    if (!selectedCompanyId) return;

    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('company_id', selectedCompanyId)
        .order('name_en');

      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchManagers = async () => {
    if (!selectedCompanyId) return;

    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, employee_number, first_name_en, last_name_en, job_title_en')
        .eq('company_id', selectedCompanyId)
        .eq('status', 'active')
        .order('first_name_en');

      if (error) throw error;
      setManagers(data || []);
    } catch (error) {
      console.error('Error fetching managers:', error);
    }
  };

  const fetchPayroll = async () => {
    if (!employee) return;

    try {
      const { data, error } = await supabase
        .from('payroll')
        .select('*')
        .eq('employee_id', employee.id)
        .order('effective_from', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setPayroll(data);
        setPayrollData({
          basic_salary: data.basic_salary?.toString() || '0',
          housing_allowance: data.housing_allowance?.toString() || '0',
          transportation_allowance: data.transportation_allowance?.toString() || '0',
          other_allowances: data.other_allowances?.toString() || '0',
          iban: data.iban || '',
          bank_name: data.bank_name || '',
        });
      }
    } catch (error) {
      console.error('Error fetching payroll:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompanyId) return;

    setLoading(true);

    try {
      const employeeData = {
        ...formData,
        company_id: selectedCompanyId,
        department_id: formData.department_id || null,
        first_name_ar: formData.first_name_ar || null,
        last_name_ar: formData.last_name_ar || null,
        email: formData.email || null,
        phone: formData.phone || null,
        date_of_birth: formData.date_of_birth || null,
        probation_end_date: formData.probation_end_date || null,
        contract_start_date: formData.contract_start_date || null,
        contract_end_date: formData.contract_end_date || null,
        job_title_ar: formData.job_title_ar || null,
        iqama_number: formData.iqama_number || null,
        iqama_expiry: formData.iqama_expiry || null,
        passport_number: formData.passport_number || null,
        passport_expiry: formData.passport_expiry || null,
      };

      let employeeId = employee?.id;

      if (employee) {
        const { error } = await supabase
          .from('employees')
          .update(employeeData)
          .eq('id', employee.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('employees')
          .insert([employeeData])
          .select();

        if (error) throw error;
        if (data && data[0]) {
          employeeId = data[0].id;
        }
      }

      if (employeeId && parseFloat(payrollData.basic_salary) > 0) {
        const basicSalary = parseFloat(payrollData.basic_salary) || 0;
        const housingAllowance = parseFloat(payrollData.housing_allowance) || 0;
        const transportationAllowance = parseFloat(payrollData.transportation_allowance) || 0;
        const otherAllowances = parseFloat(payrollData.other_allowances) || 0;
        const grossSalary = basicSalary + housingAllowance + transportationAllowance + otherAllowances;

        const gosiWageCeiling = 45000;
        const gosiBase = basicSalary + housingAllowance;
        const gosiWage = Math.min(gosiBase, gosiWageCeiling);

        let gosiEmployee = 0;
        let gosiEmployer = 0;

        if (formData.is_saudi) {
          gosiEmployee = gosiWage * 0.0975;
          gosiEmployer = gosiWage * 0.1175;
        } else {
          gosiEmployee = 0;
          gosiEmployer = gosiWage * 0.02;
        }

        const payrollRecord = {
          employee_id: employeeId,
          company_id: selectedCompanyId,
          basic_salary: basicSalary,
          housing_allowance: housingAllowance,
          transportation_allowance: transportationAllowance,
          other_allowances: otherAllowances,
          gross_salary: grossSalary,
          gosi_employee: gosiEmployee,
          gosi_employer: gosiEmployer,
          net_salary: grossSalary - gosiEmployee,
          iban: payrollData.iban || null,
          bank_name: payrollData.bank_name || null,
          effective_from: formData.hire_date,
        };

        if (payroll) {
          const { data: allPayrollRecords } = await supabase
            .from('payroll')
            .select('id')
            .eq('employee_id', employeeId);

          if (allPayrollRecords && allPayrollRecords.length > 0) {
            const payrollIds = allPayrollRecords.map(p => p.id);
            await supabase
              .from('payroll')
              .update(payrollRecord)
              .in('id', payrollIds);
          }
        } else {
          await supabase
            .from('payroll')
            .insert(payrollRecord);
        }
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving employee:', error);
      alert(error.message || 'Failed to save employee');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handlePayrollChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPayrollData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-2xl font-bold text-gray-900">
            {employee ? t.employees.editEmployee : t.employees.addEmployee}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form id="employee-form" onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.common.company} *
              </label>
              <SearchableSelect
                options={[
                  { value: '', label: t.employees.selectCompany },
                  ...companies.map(company => ({
                    value: company.id,
                    label: company.name_en,
                    searchText: `${company.name_en} ${company.name_ar || ''}`
                  }))
                ]}
                value={selectedCompanyId}
                onChange={(value) => {
                  setSelectedCompanyId(value);
                  setFormData(prev => ({ ...prev, department_id: '' }));
                }}
                placeholder={t.employees.selectCompany}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.common.department}
              </label>
              <SearchableSelect
                options={[
                  { value: '', label: t.employees.selectDepartment },
                  ...departments.map(dept => ({
                    value: dept.id,
                    label: dept.name_en,
                    searchText: `${dept.name_en} ${dept.name_ar || ''}`
                  }))
                ]}
                value={formData.department_id}
                onChange={(value) => setFormData(prev => ({ ...prev, department_id: value }))}
                placeholder={t.employees.selectDepartment}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.employees.directManager}
              </label>
              <SearchableSelect
                options={[
                  { value: '', label: t.employees.noManager },
                  ...managers
                    .filter(m => m.id !== employee?.id)
                    .map(manager => ({
                      value: manager.id,
                      label: `${manager.first_name_en} ${manager.last_name_en}`,
                      searchText: `${manager.first_name_en} ${manager.last_name_en} ${manager.employee_number} ${manager.job_title_en || ''}`
                    }))
                ]}
                value={formData.manager_id}
                onChange={(value) => setFormData(prev => ({ ...prev, manager_id: value }))}
                placeholder={t.employees.selectManager}
              />
              <p className={`mt-1 text-xs text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.employees.selectManagerHelp}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employee Number *
              </label>
              <input
                type="text"
                name="employee_number"
                required
                value={formData.employee_number}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employee Name (English) *
              </label>
              <input
                type="text"
                value={`${formData.first_name_en} ${formData.last_name_en}`.trim()}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 cursor-not-allowed"
                placeholder="Auto-generated from first and last name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employee Name (Arabic)
              </label>
              <input
                type="text"
                value={`${formData.first_name_ar} ${formData.last_name_ar}`.trim()}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 cursor-not-allowed"
                placeholder="Auto-generated from first and last name"
                dir="rtl"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name (English) *
              </label>
              <input
                type="text"
                name="first_name_en"
                required
                value={formData.first_name_en}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name (English) *
              </label>
              <input
                type="text"
                name="last_name_en"
                required
                value={formData.last_name_en}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name (Arabic)
              </label>
              <input
                type="text"
                name="first_name_ar"
                value={formData.first_name_ar}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                dir="rtl"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name (Arabic)
              </label>
              <input
                type="text"
                name="last_name_ar"
                value={formData.last_name_ar}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                dir="rtl"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nationality *
              </label>
              <input
                type="text"
                name="nationality"
                required
                value={formData.nationality}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gender *
              </label>
              <select
                name="gender"
                required
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            <div className="md:col-span-2 border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="is_saudi"
                      checked={formData.is_saudi}
                      onChange={handleChange}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Is Saudi National</span>
                  </label>
                </div>
                {formData.is_saudi && (
                  <div>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="has_disability"
                        checked={formData.has_disability}
                        onChange={handleChange}
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Has Disability</span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1 ml-6">
                      Counts as 4.0 employees for Nitaqat (if salary ≥ SAR 4,000)
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                name="date_of_birth"
                value={formData.date_of_birth}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hire Date *
              </label>
              <input
                type="date"
                name="hire_date"
                required
                value={formData.hire_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Probation End Date
              </label>
              <input
                type="date"
                name="probation_end_date"
                value={formData.probation_end_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contract Start Date
              </label>
              <input
                type="date"
                name="contract_start_date"
                value={formData.contract_start_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contract End Date
              </label>
              <input
                type="date"
                name="contract_end_date"
                value={formData.contract_end_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <p className="text-xs text-gray-500 mt-1">Leave empty for indefinite contracts</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job Title (English) *
              </label>
              <input
                type="text"
                name="job_title_en"
                required
                value={formData.job_title_en}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job Title (Arabic)
              </label>
              <input
                type="text"
                name="job_title_ar"
                value={formData.job_title_ar}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                dir="rtl"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employment Type *
              </label>
              <select
                name="employment_type"
                required
                value={formData.employment_type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="indefinite">Indefinite Contract (عقد غير محدد المدة)</option>
                <option value="fixed_term">Fixed-Term Contract (عقد محدد المدة)</option>
                <option value="temporary">Temporary Contract (عقد مؤقت)</option>
                <option value="part_time">Part-Time Contract (عقد دوام جزئي)</option>
                <option value="seasonal">Seasonal Contract (عقد موسمي)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status *
              </label>
              <select
                name="status"
                required
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="active">Active</option>
                <option value="on_leave">On Leave</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Iqama Number
              </label>
              <input
                type="text"
                name="iqama_number"
                value={formData.iqama_number}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Iqama Expiry
              </label>
              <input
                type="date"
                name="iqama_expiry"
                value={formData.iqama_expiry}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Passport Number
              </label>
              <input
                type="text"
                name="passport_number"
                value={formData.passport_number}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Passport Expiry
              </label>
              <input
                type="date"
                name="passport_expiry"
                value={formData.passport_expiry}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payroll Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Basic Salary (SAR)
                </label>
                <input
                  type="number"
                  name="basic_salary"
                  min="0"
                  step="0.01"
                  value={payrollData.basic_salary}
                  onChange={handlePayrollChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Housing Allowance (SAR)
                </label>
                <input
                  type="number"
                  name="housing_allowance"
                  min="0"
                  step="0.01"
                  value={payrollData.housing_allowance}
                  onChange={handlePayrollChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Transportation Allowance (SAR)
                </label>
                <input
                  type="number"
                  name="transportation_allowance"
                  min="0"
                  step="0.01"
                  value={payrollData.transportation_allowance}
                  onChange={handlePayrollChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Other Allowances (SAR)
                </label>
                <input
                  type="number"
                  name="other_allowances"
                  min="0"
                  step="0.01"
                  value={payrollData.other_allowances}
                  onChange={handlePayrollChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IBAN
                </label>
                <input
                  type="text"
                  name="iban"
                  value={payrollData.iban}
                  onChange={handlePayrollChange}
                  placeholder="SA1234567891234567891234"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  name="bank_name"
                  value={payrollData.bank_name}
                  onChange={handlePayrollChange}
                  placeholder="e.g., Al Rajhi Bank"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">GOSI Calculation Summary</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Gross Salary:</span>
                    <span className="font-medium">
                      {(
                        (parseFloat(payrollData.basic_salary) || 0) +
                        (parseFloat(payrollData.housing_allowance) || 0) +
                        (parseFloat(payrollData.transportation_allowance) || 0) +
                        (parseFloat(payrollData.other_allowances) || 0)
                      ).toLocaleString('en-SA', { minimumFractionDigits: 2 })} SAR
                    </span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">GOSI Wage Base (Basic + Housing):</span>
                    <span className="font-medium">
                      {(
                        (parseFloat(payrollData.basic_salary) || 0) +
                        (parseFloat(payrollData.housing_allowance) || 0)
                      ).toLocaleString('en-SA', { minimumFractionDigits: 2 })} SAR
                    </span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">GOSI Wage (Capped at 45K):</span>
                    <span className="font-medium">
                      {Math.min(
                        (parseFloat(payrollData.basic_salary) || 0) +
                        (parseFloat(payrollData.housing_allowance) || 0),
                        45000
                      ).toLocaleString('en-SA', { minimumFractionDigits: 2 })} SAR
                    </span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Employee GOSI ({formData.is_saudi ? '9.75%' : '0%'}):</span>
                    <span className="font-medium text-red-600">
                      {(() => {
                        const gosiBase = (parseFloat(payrollData.basic_salary) || 0) + (parseFloat(payrollData.housing_allowance) || 0);
                        const gosiWage = Math.min(gosiBase, 45000);
                        const rate = formData.is_saudi ? 0.0975 : 0;
                        return (gosiWage * rate).toLocaleString('en-SA', { minimumFractionDigits: 2 });
                      })()} SAR
                    </span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Employer GOSI ({formData.is_saudi ? '11.75%' : '2%'}):</span>
                    <span className="font-medium text-orange-600">
                      {(() => {
                        const gosiBase = (parseFloat(payrollData.basic_salary) || 0) + (parseFloat(payrollData.housing_allowance) || 0);
                        const gosiWage = Math.min(gosiBase, 45000);
                        const rate = formData.is_saudi ? 0.1175 : 0.02;
                        return (gosiWage * rate).toLocaleString('en-SA', { minimumFractionDigits: 2 });
                      })()} SAR
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-blue-300">
                    <span className="text-gray-900 font-semibold">Net Salary:</span>
                    <span className="font-bold text-green-600">
                      {(() => {
                        const grossSalary = (parseFloat(payrollData.basic_salary) || 0) +
                          (parseFloat(payrollData.housing_allowance) || 0) +
                          (parseFloat(payrollData.transportation_allowance) || 0) +
                          (parseFloat(payrollData.other_allowances) || 0);
                        const gosiBase = (parseFloat(payrollData.basic_salary) || 0) + (parseFloat(payrollData.housing_allowance) || 0);
                        const gosiWage = Math.min(gosiBase, 45000);
                        const rate = formData.is_saudi ? 0.0975 : 0;
                        const netSalary = grossSalary - (gosiWage * rate);
                        return netSalary.toLocaleString('en-SA', { minimumFractionDigits: 2 });
                      })()} SAR
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-3 space-y-1">
                {formData.is_saudi ? (
                  <>
                    <p className="font-medium">Saudi employees - Total: 9.75% employee + 11.75% employer = 21.5%</p>
                    <p className="ml-2">• Annuity (Pension): 9% employee + 9% employer</p>
                    <p className="ml-2">• Unemployment: 0.75% employee + 0.75% employer</p>
                    <p className="ml-2">• Occupational Hazards: 0% employee + 2% employer</p>
                  </>
                ) : (
                  <>
                    <p className="font-medium">Non-Saudi employees - Total: 0% employee + 2% employer = 2%</p>
                    <p className="ml-2">• Occupational Hazards only: 0% employee + 2% employer</p>
                  </>
                )}
                <p className="font-medium mt-2">GOSI calculated on: Basic Salary + Housing Allowance only (max 45,000 SAR/month)</p>
              </div>
            </div>
          </div>

        </form>

        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 flex-shrink-0 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="employee-form"
            disabled={loading}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Saving...' : employee ? 'Update Employee' : 'Add Employee'}
          </button>
        </div>
      </div>
    </div>
  );
}
