import { useState, useRef } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/lib/supabase';
import { X, Upload, Download, AlertCircle, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface BulkUploadProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface EmployeeRow {
  'Employee ID': string;
  'Employee Name (English)': string;
  'Employee Name (Arabic)'?: string;
  Nationality: string;
  Department?: string;
  'Position/Job Title': string;
  Status?: string;
  'Date of Joining': string;
  'IQAMA/ID Number'?: string;
  'IQAMA Issue Date'?: string;
  'IQAMA Expiry Date'?: string;
  'Passport Number'?: string;
  'Passport Issue Date'?: string;
  'Passport Expiry Date'?: string;
  'Contract Type'?: string;
  'Contract Number'?: string;
  'Contract Start Date'?: string;
  'Contract End Date'?: string;
  'Work Days/Week'?: string;
  'Work Hours/Day'?: string;
  'Annual Leave Days'?: string;
  'Probation Period'?: string;
  'Email Address'?: string;
  'Mobile Number'?: string;
  'Company Name'?: string;
  'Basic Salary'?: string;
  'Housing Allowance'?: string;
  'Transportation Allowance'?: string;
  'Other Allowance'?: string;
  IBAN?: string;
  'Bank Name'?: string;
  Gender?: string;
  'Birth Date'?: string;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export function BulkUpload({ onClose, onSuccess }: BulkUploadProps) {
  const { currentCompany } = useCompany();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [successCount, setSuccessCount] = useState(0);
  const [updateMode, setUpdateMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const template = [
      {
        'Employee ID': 'EMP001',
        'Employee Name (English)': 'Ahmed Al-Rashid',
        'Employee Name (Arabic)': 'أحمد الراشد',
        Nationality: 'Saudi Arabia',
        Department: 'IT',
        'Position/Job Title': 'Software Engineer',
        Status: 'active',
        'Date of Joining': '2024-01-01',
        'IQAMA/ID Number': '1234567890',
        'IQAMA Issue Date': '2020-01-01',
        'IQAMA Expiry Date': '2025-12-31',
        'Passport Number': 'A12345678',
        'Passport Issue Date': '2018-06-01',
        'Passport Expiry Date': '2028-05-31',
        'Contract Type': 'indefinite',
        'Contract Number': 'CNT-2024-001',
        'Contract Start Date': '2024-01-01',
        'Contract End Date': '2026-12-31',
        'Work Days/Week': '5',
        'Work Hours/Day': '8',
        'Annual Leave Days': '30',
        'Probation Period': '90',
        'Email Address': 'ahmed@example.com',
        'Mobile Number': '+966501234567',
        'Company Name': 'My Company',
        'Basic Salary': '15000',
        'Housing Allowance': '3000',
        'Transportation Allowance': '1000',
        'Other Allowance': '500',
        IBAN: 'SA1234567891234567891234',
        'Bank Name': 'Al Rajhi Bank',
        Gender: 'male',
        'Birth Date': '1990-01-15',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Employees');
    XLSX.writeFile(wb, 'employee_upload_template.xlsx', { bookType: 'xlsx', type: 'binary' });
  };

  const normalizeValue = (value: any): string => {
    if (!value) return '';
    return value.toString().trim().toLowerCase();
  };

  const validateRow = (row: any, index: number): ValidationError[] => {
    const rowErrors: ValidationError[] = [];
    const rowNum = index + 2;

    if (!getFieldValue(row, 'Employee ID', 'EmployeeID', 'Employee_ID')) {
      rowErrors.push({ row: rowNum, field: 'Employee ID', message: 'Required' });
    }
    if (!getFieldValue(row, 'Employee Name (English)', 'Employee Name')) {
      rowErrors.push({ row: rowNum, field: 'Employee Name (English)', message: 'Required' });
    }
    if (!getFieldValue(row, 'IQAMA/ID Number', 'IQAMA Number', 'IqamaNumber', 'Iqama_Number', 'ID Number', 'IQAMA')) {
      rowErrors.push({ row: rowNum, field: 'IQAMA/ID Number', message: 'Required' });
    }

    const gender = getFieldValue(row, 'Gender');
    if (gender) {
      const genderNorm = normalizeValue(gender);
      const validGenders = ['male', 'female', 'm', 'f', 'ذكر', 'أنثى'];
      if (!validGenders.includes(genderNorm)) {
        rowErrors.push({ row: rowNum, field: 'Gender', message: 'Must be "male", "female", "M", "F", "ذكر", or "أنثى"' });
      }
    }

    const contractType = getFieldValue(row, 'Contract Type', 'ContractType', 'Contract_Type', 'Employment Type');
    if (contractType) {
      const contractTypeNorm = normalizeValue(contractType).replace(/[\s-]/g, '_');
      const validContractTypes = ['indefinite', 'fixed_term', 'temporary', 'part_time', 'seasonal', 'full_time', 'contract'];
      if (!validContractTypes.includes(contractTypeNorm)) {
        rowErrors.push({ row: rowNum, field: 'Contract Type', message: 'Must be "indefinite", "fixed_term", "temporary", "part_time", "seasonal", "full_time", or "contract"' });
      }
    }

    const status = getFieldValue(row, 'Status');
    if (status) {
      const statusNorm = normalizeValue(status).replace(/[\s-]/g, '_');
      const validStatuses = ['active', 'on_leave', 'terminated', 'onleave'];
      if (!validStatuses.includes(statusNorm)) {
        rowErrors.push({ row: rowNum, field: 'Status', message: 'Must be "active", "on_leave", or "terminated"' });
      }
    }

    return rowErrors;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setErrors([]);
      setSuccessCount(0);
    }
  };

  const getFieldValue = (row: any, ...fieldNames: string[]): any => {
    for (const fieldName of fieldNames) {
      if (row[fieldName] !== undefined && row[fieldName] !== null && row[fieldName] !== '') {
        return row[fieldName];
      }
    }
    return null;
  };

  const handleUpload = async () => {
    if (!file || !currentCompany) return;

    setUploading(true);
    setErrors([]);
    setSuccessCount(0);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array', codepage: 65001 });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, {
        raw: false,
        defval: ''
      });

      if (jsonData.length === 0) {
        setErrors([{ row: 0, field: 'File', message: 'No data found in file' }]);
        setUploading(false);
        return;
      }

      const validationErrors: ValidationError[] = [];
      jsonData.forEach((row, index) => {
        const rowErrors = validateRow(row, index);
        validationErrors.push(...rowErrors);
      });

      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        setUploading(false);
        return;
      }

      const normalizeGender = (value: any): 'male' | 'female' | undefined => {
        if (!value) return undefined;
        const normalized = normalizeValue(value);
        if (['male', 'm', 'ذكر'].includes(normalized)) return 'male';
        if (['female', 'f', 'أنثى'].includes(normalized)) return 'female';
        return undefined;
      };

      const normalizeContractType = (value: any): 'indefinite' | 'fixed_term' | 'temporary' | 'part_time' | 'seasonal' => {
        if (!value) return 'indefinite';
        const normalized = normalizeValue(value).replace(/[\s-]/g, '_');
        if (['full_time', 'fulltime'].includes(normalized)) return 'indefinite';
        if (['contract', 'fixed_term', 'fixedterm', 'fixed'].includes(normalized)) return 'fixed_term';
        if (['temporary', 'temp'].includes(normalized)) return 'temporary';
        if (['part_time', 'parttime', 'part'].includes(normalized)) return 'part_time';
        if (['seasonal', 'season'].includes(normalized)) return 'seasonal';
        return 'indefinite';
      };

      const normalizeStatus = (value: any): 'active' | 'on_leave' | 'terminated' => {
        if (!value) return 'active';
        const normalized = normalizeValue(value).replace(/[\s-]/g, '_');
        if (['on_leave', 'onleave', 'leave'].includes(normalized)) return 'on_leave';
        if (['terminated', 'inactive', 'ended'].includes(normalized)) return 'terminated';
        return 'active';
      };

      const employees = jsonData.map((row) => {
        const englishName = (getFieldValue(row, 'Employee Name (English)', 'Employee Name') || '').toString().trim();
        const englishNameParts = englishName.split(/\s+/).filter(part => part.length > 0);
        const firstName = englishNameParts[0] || '';
        const lastName = englishNameParts.slice(1).join(' ') || englishNameParts[0] || '';

        const arabicName = (getFieldValue(row, 'Employee Name (Arabic)', 'Employee Name Arabic') || '').toString().trim();
        let firstNameAr = null;
        let lastNameAr = null;

        if (arabicName && arabicName.length > 0) {
          const arabicNameParts = arabicName.split(/\s+/).filter(part => part.length > 0);
          if (arabicNameParts.length > 0) {
            firstNameAr = arabicNameParts[0];
            lastNameAr = arabicNameParts.slice(1).join(' ') || arabicNameParts[0];
          }
        }

        const nationality = getFieldValue(row, 'Nationality') ? getFieldValue(row, 'Nationality').toString().trim() : 'Not Specified';
        const isSaudi = nationality.toLowerCase().includes('saudi');

        const probationDays = getFieldValue(row, 'Probation Period') ? parseInt(getFieldValue(row, 'Probation Period').toString()) : 90;
        const hireDate = getFieldValue(row, 'Date of Joining', 'Hire Date') ? getFieldValue(row, 'Date of Joining', 'Hire Date').toString() : new Date().toISOString().split('T')[0];
        const probationEndDate = getFieldValue(row, 'Probation Period') ? new Date(new Date(hireDate).getTime() + probationDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : null;

        const basicSalaryValue = getFieldValue(row, 'Basic Salary', 'BasicSalary', 'Basic_Salary');
        const housingAllowanceValue = getFieldValue(row, 'Housing Allowance', 'HousingAllowance', 'Housing_Allowance');
        const transportationAllowanceValue = getFieldValue(row, 'Transportation Allowance', 'TransportationAllowance', 'Transportation_Allowance');
        const otherAllowanceValue = getFieldValue(row, 'Other Allowance', 'OtherAllowance', 'Other_Allowance');

        const parseNumber = (val: any): number => {
          if (!val) return 0;
          const str = val.toString().trim().replace(/,/g, '').replace(/[^\d.-]/g, '');
          const num = parseFloat(str);
          return isNaN(num) ? 0 : num;
        };

        const basicSalary = parseNumber(basicSalaryValue);
        const housingAllowance = parseNumber(housingAllowanceValue);
        const transportationAllowance = parseNumber(transportationAllowanceValue);
        const otherAllowances = parseNumber(otherAllowanceValue);

        return {
          row,
          company_name: getFieldValue(row, 'Company Name', 'CompanyName', 'Company_Name', 'Company') ? getFieldValue(row, 'Company Name', 'CompanyName', 'Company_Name', 'Company').toString().trim() : null,
          company_id: currentCompany.id,
          employee_number: (getFieldValue(row, 'Employee ID', 'EmployeeID', 'Employee_ID') || '').toString(),
          first_name_en: firstName,
          last_name_en: lastName,
          first_name_ar: firstNameAr,
          last_name_ar: lastNameAr,
          email: getFieldValue(row, 'Email Address', 'Email', 'EmailAddress') ? getFieldValue(row, 'Email Address', 'Email', 'EmailAddress').toString().trim() : null,
          phone: getFieldValue(row, 'Mobile Number', 'Phone', 'Mobile', 'MobileNumber') ? getFieldValue(row, 'Mobile Number', 'Phone', 'Mobile', 'MobileNumber').toString().trim() : null,
          nationality: nationality,
          is_saudi: isSaudi,
          gender: normalizeGender(getFieldValue(row, 'Gender')),
          date_of_birth: getFieldValue(row, 'Birth Date', 'BirthDate', 'Date of Birth') ? getFieldValue(row, 'Birth Date', 'BirthDate', 'Date of Birth').toString() : null,
          hire_date: hireDate,
          probation_end_date: probationEndDate,
          contract_start_date: getFieldValue(row, 'Contract Start Date', 'ContractStartDate', 'Contract_Start_Date') ? getFieldValue(row, 'Contract Start Date', 'ContractStartDate', 'Contract_Start_Date').toString() : null,
          contract_end_date: getFieldValue(row, 'Contract End Date', 'ContractEndDate', 'Contract_End_Date') ? getFieldValue(row, 'Contract End Date', 'ContractEndDate', 'Contract_End_Date').toString() : null,
          job_title_en: getFieldValue(row, 'Position/Job Title', 'Job Title', 'Position', 'JobTitle') ? getFieldValue(row, 'Position/Job Title', 'Job Title', 'Position', 'JobTitle').toString().trim() : 'Employee',
          job_title_ar: null,
          employment_type: normalizeContractType(getFieldValue(row, 'Contract Type', 'ContractType', 'Contract_Type', 'Employment Type')),
          status: normalizeStatus(getFieldValue(row, 'Status')),
          iqama_number: (getFieldValue(row, 'IQAMA/ID Number', 'IQAMA Number', 'IqamaNumber', 'Iqama_Number', 'ID Number', 'IQAMA') || '').toString().trim(),
          iqama_expiry: getFieldValue(row, 'IQAMA Expiry Date', 'EIQAMA Expiry Date', 'Iqama Expiry Date', 'IqamaExpiryDate', 'Iqama_Expiry_Date', 'IQAMA Expiry') ? getFieldValue(row, 'IQAMA Expiry Date', 'EIQAMA Expiry Date', 'Iqama Expiry Date', 'IqamaExpiryDate', 'Iqama_Expiry_Date', 'IQAMA Expiry').toString() : null,
          passport_number: getFieldValue(row, 'Passport Number', 'PassportNumber', 'Passport_Number') ? getFieldValue(row, 'Passport Number', 'PassportNumber', 'Passport_Number').toString().trim() : null,
          passport_expiry: getFieldValue(row, 'Passport Expiry Date', 'PassportExpiryDate', 'Passport_Expiry_Date', 'Passport Expiry') ? getFieldValue(row, 'Passport Expiry Date', 'PassportExpiryDate', 'Passport_Expiry_Date', 'Passport Expiry').toString() : null,
          department_name: getFieldValue(row, 'Department') ? getFieldValue(row, 'Department').toString().trim() : null,
          payroll: {
            basic_salary: basicSalary,
            housing_allowance: housingAllowance,
            transportation_allowance: transportationAllowance,
            other_allowances: otherAllowances,
            iban: getFieldValue(row, 'IBAN', 'Iban', 'Bank Account') ? getFieldValue(row, 'IBAN', 'Iban', 'Bank Account').toString().trim() : null,
            bank_name: getFieldValue(row, 'Bank Name', 'BankName', 'Bank_Name', 'Bank') ? getFieldValue(row, 'Bank Name', 'BankName', 'Bank_Name', 'Bank').toString().trim() : null,
          }
        };
      });

      const { data: allCompanies } = await supabase
        .from('companies')
        .select('id, name_en, name_ar');

      const companyMap = new Map<string, string>();
      if (allCompanies) {
        allCompanies.forEach(company => {
          if (company.name_en) companyMap.set(company.name_en.toLowerCase().trim(), company.id);
          if (company.name_ar) companyMap.set(company.name_ar.toLowerCase().trim(), company.id);
        });
      }

      const employeesWithCompanyIds = employees.map(emp => {
        let finalCompanyId = currentCompany.id;

        if (emp.company_name) {
          const companyId = companyMap.get(emp.company_name.toLowerCase().trim());
          if (companyId) {
            finalCompanyId = companyId;
          }
        }

        return { ...emp, company_id: finalCompanyId };
      });

      const companiesNeeded = new Set(employeesWithCompanyIds.map(e => e.company_id));
      const deptsByCompany = new Map<string, Map<string, string>>();

      for (const companyId of companiesNeeded) {
        const { data: existingDepts } = await supabase
          .from('departments')
          .select('id, name_en, code')
          .eq('company_id', companyId);

        const deptMap = new Map<string, string>();
        if (existingDepts) {
          existingDepts.forEach(dept => {
            deptMap.set(dept.name_en.toLowerCase(), dept.id);
            deptMap.set(dept.code.toLowerCase(), dept.id);
          });
        }
        deptsByCompany.set(companyId, deptMap);
      }

      const newDepartmentsByCompany = new Map<string, Set<string>>();
      employeesWithCompanyIds.forEach(emp => {
        if (emp.department_name) {
          const deptMap = deptsByCompany.get(emp.company_id);
          if (!deptMap || !deptMap.has(emp.department_name.toLowerCase())) {
            if (!newDepartmentsByCompany.has(emp.company_id)) {
              newDepartmentsByCompany.set(emp.company_id, new Set());
            }
            newDepartmentsByCompany.get(emp.company_id)!.add(emp.department_name);
          }
        }
      });

      for (const [companyId, deptNames] of newDepartmentsByCompany) {
        if (deptNames.size > 0) {
          const deptsToCreate = Array.from(deptNames).map(name => ({
            company_id: companyId,
            name_en: name,
            code: name.substring(0, 10).toUpperCase().replace(/\s+/g, '_'),
          }));

          const { data: createdDepts } = await supabase
            .from('departments')
            .insert(deptsToCreate)
            .select('id, name_en, company_id');

          if (createdDepts) {
            createdDepts.forEach(dept => {
              let deptMap = deptsByCompany.get(dept.company_id);
              if (!deptMap) {
                deptMap = new Map();
                deptsByCompany.set(dept.company_id, deptMap);
              }
              deptMap.set(dept.name_en.toLowerCase(), dept.id);
            });
          }
        }
      }

      const existingEmployeesByCompany = new Map<string, Set<string>>();
      for (const companyId of companiesNeeded) {
        const { data: existingEmployees } = await supabase
          .from('employees')
          .select('employee_number')
          .eq('company_id', companyId);

        existingEmployeesByCompany.set(companyId, new Set(existingEmployees?.map(e => e.employee_number) || []));
      }

      const employeesToInsert = employeesWithCompanyIds.map(({ row, department_name, payroll, company_name, ...emp }) => {
        const deptMap = deptsByCompany.get(emp.company_id);
        return {
          employee: {
            ...emp,
            department_id: department_name && deptMap ? deptMap.get(department_name.toLowerCase()) || null : null,
          },
          payroll,
          companyId: emp.company_id
        };
      });

      let insertedData;
      let error;

      if (updateMode) {
        const results = await Promise.all(
          employeesToInsert.map(async ({ employee: emp, payroll, companyId }) => {
            const existingNumbers = existingEmployeesByCompany.get(companyId) || new Set();
            if (existingNumbers.has(emp.employee_number)) {
              const { data: existingEmp } = await supabase
                .from('employees')
                .select('*')
                .eq('company_id', companyId)
                .eq('employee_number', emp.employee_number)
                .single();

              const mergedData: any = {};
              Object.keys(emp).forEach((key) => {
                const newValue = (emp as any)[key];
                const existingValue = existingEmp?.[key];

                if (key === 'company_id' || key === 'employee_number') {
                  mergedData[key] = newValue;
                } else if (newValue !== null && newValue !== undefined && newValue !== '') {
                  mergedData[key] = newValue;
                } else if (existingValue !== null && existingValue !== undefined) {
                  mergedData[key] = existingValue;
                }
              });

              const empResult = await supabase
                .from('employees')
                .update(mergedData)
                .eq('company_id', companyId)
                .eq('employee_number', emp.employee_number)
                .select();

              if (empResult.data && empResult.data[0]) {
                const { data: existingPayroll } = await supabase
                  .from('payroll')
                  .select('*')
                  .eq('employee_id', empResult.data[0].id)
                  .eq('company_id', companyId)
                  .order('effective_from', { ascending: false })
                  .limit(1)
                  .maybeSingle();

                const mergedPayroll = {
                  basic_salary: payroll.basic_salary || existingPayroll?.basic_salary || 0,
                  housing_allowance: payroll.housing_allowance || existingPayroll?.housing_allowance || 0,
                  transportation_allowance: payroll.transportation_allowance || existingPayroll?.transportation_allowance || 0,
                  other_allowances: payroll.other_allowances || existingPayroll?.other_allowances || 0,
                  iban: payroll.iban || existingPayroll?.iban || null,
                  bank_name: payroll.bank_name || existingPayroll?.bank_name || null,
                };

                const grossSalary = mergedPayroll.basic_salary + mergedPayroll.housing_allowance + mergedPayroll.transportation_allowance + mergedPayroll.other_allowances;

                const gosiWageCeiling = 45000;
                const gosiBase = mergedPayroll.basic_salary + mergedPayroll.housing_allowance;
                const gosiWage = Math.min(gosiBase, gosiWageCeiling);

                let gosiEmployee = 0;
                let gosiEmployer = 0;

                if (mergedData.is_saudi) {
                  gosiEmployee = gosiWage * 0.0975;
                  gosiEmployer = gosiWage * 0.1175;
                } else {
                  gosiEmployee = 0;
                  gosiEmployer = gosiWage * 0.02;
                }

                const payrollData = {
                  employee_id: empResult.data[0].id,
                  company_id: companyId,
                  basic_salary: mergedPayroll.basic_salary,
                  housing_allowance: mergedPayroll.housing_allowance,
                  transportation_allowance: mergedPayroll.transportation_allowance,
                  other_allowances: mergedPayroll.other_allowances,
                  gross_salary: grossSalary,
                  gosi_employee: gosiEmployee,
                  gosi_employer: gosiEmployer,
                  net_salary: grossSalary - gosiEmployee,
                  iban: mergedPayroll.iban,
                  bank_name: mergedPayroll.bank_name,
                  effective_from: mergedData.hire_date,
                };

                if (existingPayroll) {
                  await supabase
                    .from('payroll')
                    .update(payrollData)
                    .eq('id', existingPayroll.id);
                } else {
                  await supabase
                    .from('payroll')
                    .insert(payrollData);
                }
              }

              return empResult;
            } else {
              const empResult = await supabase
                .from('employees')
                .insert(emp)
                .select();

              if (empResult.data && empResult.data[0]) {
                const grossSalary = payroll.basic_salary + payroll.housing_allowance + payroll.transportation_allowance + payroll.other_allowances;
                const gosiEmployee = emp.is_saudi ? grossSalary * 0.1 : 0;
                const gosiEmployer = emp.is_saudi ? grossSalary * 0.12 : grossSalary * 0.02;

                await supabase
                  .from('payroll')
                  .insert({
                    employee_id: empResult.data[0].id,
                    company_id: companyId,
                    basic_salary: payroll.basic_salary,
                    housing_allowance: payroll.housing_allowance,
                    transportation_allowance: payroll.transportation_allowance,
                    other_allowances: payroll.other_allowances,
                    gross_salary: grossSalary,
                    gosi_employee: gosiEmployee,
                    gosi_employer: gosiEmployer,
                    net_salary: grossSalary - gosiEmployee,
                    iban: payroll.iban,
                    bank_name: payroll.bank_name,
                    effective_from: emp.hire_date,
                  });
              }

              return empResult;
            }
          })
        );

        const allData = results.map(r => r.data).flat().filter(Boolean);
        const allErrors = results.filter(r => r.error);

        if (allErrors.length > 0) {
          error = allErrors[0].error;
        } else {
          insertedData = allData;
        }
      } else {
        const newEmployees = employeesToInsert.filter(({ employee: emp, companyId }) => {
          const existingNumbers = existingEmployeesByCompany.get(companyId) || new Set();
          return !existingNumbers.has(emp.employee_number);
        });
        const duplicates = employeesToInsert.filter(({ employee: emp, companyId }) => {
          const existingNumbers = existingEmployeesByCompany.get(companyId) || new Set();
          return existingNumbers.has(emp.employee_number);
        });

        if (duplicates.length > 0) {
          const duplicateIds = duplicates.map(({ employee: emp }) => emp.employee_number).join(', ');
          setErrors([{
            row: 0,
            field: 'Duplicate',
            message: `Found ${duplicates.length} existing employee(s): ${duplicateIds}. Enable "Update existing employees" to update them.`
          }]);
          setUploading(false);
          return;
        }

        const result = await supabase
          .from('employees')
          .insert(newEmployees.map(e => e.employee))
          .select();

        if (result.data) {
          await Promise.all(
            result.data.map(async (emp, index) => {
              const payroll = newEmployees[index].payroll;
              const companyId = newEmployees[index].companyId;

              const grossSalary = payroll.basic_salary + payroll.housing_allowance + payroll.transportation_allowance + payroll.other_allowances;
              const gosiEmployee = newEmployees[index].employee.is_saudi ? grossSalary * 0.1 : 0;
              const gosiEmployer = newEmployees[index].employee.is_saudi ? grossSalary * 0.12 : grossSalary * 0.02;

              await supabase
                .from('payroll')
                .insert({
                  employee_id: emp.id,
                  company_id: companyId,
                  basic_salary: payroll.basic_salary,
                  housing_allowance: payroll.housing_allowance,
                  transportation_allowance: payroll.transportation_allowance,
                  other_allowances: payroll.other_allowances,
                  gross_salary: grossSalary,
                  gosi_employee: gosiEmployee,
                  gosi_employer: gosiEmployer,
                  net_salary: grossSalary - gosiEmployee,
                  iban: payroll.iban,
                  bank_name: payroll.bank_name,
                  effective_from: emp.hire_date,
                });
            })
          );
        }

        insertedData = result.data;
        error = result.error;
      }

      if (error) {
        setErrors([{ row: 0, field: 'Database', message: error.message }]);
      } else {
        setSuccessCount(insertedData?.length || 0);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setErrors([{ row: 0, field: 'File', message: 'Failed to process file' }]);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Bulk Employee Upload</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Instructions</h3>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Download the Excel template below</li>
              <li>Fill in your employee data (Required: Employee ID, Employee Name (English), IQAMA/ID Number)</li>
              <li>Upload the completed file</li>
              <li>Review any errors and correct them</li>
              <li>Click "Upload" to import employees</li>
            </ol>
          </div>

          <button
            onClick={downloadTemplate}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
          >
            <Download className="h-5 w-5" />
            <span className="font-medium">Download Excel Template</span>
          </button>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Employee File
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`w-full flex items-center justify-center space-x-2 px-4 py-3 border-2 rounded-lg transition-colors ${
                file
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-dashed border-primary-400 bg-primary-50 hover:bg-primary-100 text-primary-700'
              }`}
            >
              <Upload className="h-5 w-5" />
              <span className="font-medium">{file ? `✓ ${file.name}` : 'Click to Choose Excel File (.xlsx, .xls)'}</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="updateMode"
              checked={updateMode}
              onChange={(e) => setUpdateMode(e.target.checked)}
              className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <label htmlFor="updateMode" className="text-sm text-gray-700">
              Update existing employees (merge new data with existing, preserve non-empty fields)
            </label>
          </div>

          {successCount > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <p className="text-sm font-medium text-green-900">
                  Successfully uploaded {successCount} employees!
                </p>
              </div>
            </div>
          )}

          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-2 mb-2">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900 mb-2">
                    Found {errors.length} error{errors.length !== 1 ? 's' : ''}:
                  </p>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {errors.map((error, index) => (
                      <p key={index} className="text-sm text-red-800">
                        Row {error.row}: {error.field} - {error.message}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? 'Uploading...' : 'Upload Employees'}
          </button>
        </div>
      </div>
    </div>
  );
}
