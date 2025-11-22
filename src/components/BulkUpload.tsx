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
  'EIQAMA Expiry Date'?: string;
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
        'EIQAMA Expiry Date': '2025-12-31',
        'Passport Number': 'A12345678',
        'Passport Issue Date': '2018-06-01',
        'Passport Expiry Date': '2028-05-31',
        'Contract Type': 'full_time',
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

  const validateRow = (row: EmployeeRow, index: number): ValidationError[] => {
    const rowErrors: ValidationError[] = [];
    const rowNum = index + 2;

    if (!row['Employee ID']) {
      rowErrors.push({ row: rowNum, field: 'Employee ID', message: 'Required' });
    }
    if (!row['Employee Name (English)']) {
      rowErrors.push({ row: rowNum, field: 'Employee Name (English)', message: 'Required' });
    }
    if (!row.Nationality) {
      rowErrors.push({ row: rowNum, field: 'Nationality', message: 'Required' });
    }
    if (!row['Date of Joining']) {
      rowErrors.push({ row: rowNum, field: 'Date of Joining', message: 'Required' });
    }
    if (!row['Position/Job Title']) {
      rowErrors.push({ row: rowNum, field: 'Position/Job Title', message: 'Required' });
    }

    if (row.Gender && !['male', 'female'].includes(row.Gender.toLowerCase())) {
      rowErrors.push({ row: rowNum, field: 'Gender', message: 'Must be "male" or "female"' });
    }

    if (row['Contract Type'] && !['full_time', 'part_time', 'contract'].includes(row['Contract Type'].toLowerCase())) {
      rowErrors.push({ row: rowNum, field: 'Contract Type', message: 'Must be "full_time", "part_time", or "contract"' });
    }

    if (row.Status && !['active', 'on_leave', 'terminated'].includes(row.Status.toLowerCase())) {
      rowErrors.push({ row: rowNum, field: 'Status', message: 'Must be "active", "on_leave", or "terminated"' });
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

  const handleUpload = async () => {
    if (!file || !currentCompany) return;

    setUploading(true);
    setErrors([]);
    setSuccessCount(0);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array', codepage: 65001 });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<EmployeeRow>(worksheet, {
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

      const employees = jsonData.map((row) => {
        const englishName = (row['Employee Name (English)'] || '').toString().trim();
        const englishNameParts = englishName.split(/\s+/).filter(part => part.length > 0);
        const firstName = englishNameParts[0] || '';
        const lastName = englishNameParts.slice(1).join(' ') || englishNameParts[0] || '';

        const arabicName = (row['Employee Name (Arabic)'] || '').toString().trim();
        let firstNameAr = null;
        let lastNameAr = null;

        if (arabicName && arabicName.length > 0) {
          const arabicNameParts = arabicName.split(/\s+/).filter(part => part.length > 0);
          if (arabicNameParts.length > 0) {
            firstNameAr = arabicNameParts[0];
            lastNameAr = arabicNameParts.slice(1).join(' ') || arabicNameParts[0];
          }
        }

        return {
          company_id: currentCompany.id,
          employee_number: (row['Employee ID'] || '').toString(),
          first_name_en: firstName,
          last_name_en: lastName,
          first_name_ar: firstNameAr,
          last_name_ar: lastNameAr,
          email: row['Email Address'] ? row['Email Address'].toString() : null,
          phone: row['Mobile Number'] ? row['Mobile Number'].toString() : null,
          nationality: (row.Nationality || '').toString(),
          is_saudi: (row.Nationality || '').toString().toLowerCase().includes('saudi') || false,
          gender: row.Gender ? (row.Gender.toString().toLowerCase() as 'male' | 'female') : undefined,
          date_of_birth: row['Birth Date'] ? row['Birth Date'].toString() : null,
          hire_date: (row['Date of Joining'] || '').toString(),
          job_title_en: (row['Position/Job Title'] || '').toString(),
          job_title_ar: null,
          employment_type: (row['Contract Type']?.toString().toLowerCase() || 'full_time') as 'full_time' | 'part_time' | 'contract',
          status: (row.Status?.toString().toLowerCase() || 'active') as 'active' | 'on_leave' | 'terminated',
          iqama_number: row['IQAMA/ID Number'] ? row['IQAMA/ID Number'].toString() : null,
          iqama_expiry: row['EIQAMA Expiry Date'] ? row['EIQAMA Expiry Date'].toString() : null,
          passport_number: row['Passport Number'] ? row['Passport Number'].toString() : null,
          passport_expiry: row['Passport Expiry Date'] ? row['Passport Expiry Date'].toString() : null,
          department_id: row.Department ? row.Department.toString() : null,
        };
      });

      const { data: insertedData, error } = await supabase
        .from('employees')
        .insert(employees)
        .select();

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
              <li>Fill in your employee data</li>
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
