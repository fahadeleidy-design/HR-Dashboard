import { useState, useEffect } from 'react';
import { FileText, Download, AlertCircle, CheckCircle, XCircle, Building2, Users, DollarSign } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useToast } from '@/contexts/ToastContext';
import { formatCurrency } from '@/lib/formatters';

interface WPSFileGeneratorProps {
  batch: any;
  payrollItems: any[];
  onComplete: () => void;
  language?: 'en' | 'ar';
}

interface EmployeeWithBank extends any {
  bank_name: string;
  bank_code: string;
  iban: string;
  account_number: string;
  validation_error?: string;
}

interface BankGroup {
  bankCode: string;
  bankName: string;
  employees: EmployeeWithBank[];
  totalAmount: number;
}

const SAUDI_BANKS = {
  '80': 'National Commercial Bank (BNPL)',
  '45': 'Saudi American Bank (SAB)',
  '10': 'Riyad Bank',
  '05': 'Alinma Bank',
  '71': 'Arab National Bank',
  '15': 'Bank AlJazira',
  '20': 'Bank AlBilad',
  '40': 'Saudi Fransi Bank',
  '55': 'Emirates NBD',
  '65': 'Saudi British Bank (SABB)',
  '75': 'Saudi Investment Bank',
  '85': 'Gulf International Bank',
};

export function WPSFileGenerator({ batch, payrollItems, onComplete, language = 'en' }: WPSFileGeneratorProps) {
  const [generating, setGenerating] = useState(false);
  const [validating, setValidating] = useState(false);
  const [employerId, setEmployerId] = useState('');
  const [establishmentId, setEstablishmentId] = useState('');
  const [validatedData, setValidatedData] = useState<EmployeeWithBank[]>([]);
  const [bankGroups, setBankGroups] = useState<BankGroup[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const { logError } = useErrorHandler();
  const { showToast } = useToast();

  useEffect(() => {
    validateEmployeeData();
  }, [payrollItems]);

  const validateIBAN = (iban: string): boolean => {
    if (!iban) return false;
    const cleanIBAN = iban.replace(/\s/g, '').toUpperCase();
    if (!cleanIBAN.startsWith('SA')) return false;
    if (cleanIBAN.length !== 24) return false;
    const bankCode = cleanIBAN.substring(4, 6);
    if (!SAUDI_BANKS[bankCode as keyof typeof SAUDI_BANKS]) return false;
    return true;
  };

  const extractBankCode = (iban: string): string => {
    const cleanIBAN = iban.replace(/\s/g, '').toUpperCase();
    return cleanIBAN.substring(4, 6);
  };

  const validateEmployeeData = async () => {
    setValidating(true);
    const validationErrors: string[] = [];
    const validated: EmployeeWithBank[] = [];

    for (const item of payrollItems) {
      const emp = item.employee;
      let error = '';

      if (!emp.bank_name || !emp.bank_account_iban) {
        error = 'Missing bank details';
      } else if (!validateIBAN(emp.bank_account_iban)) {
        error = 'Invalid IBAN format';
      } else if ((item.net_salary || 0) <= 0) {
        error = 'Invalid salary amount';
      } else if (!emp.employee_number) {
        error = 'Missing employee number';
      }

      if (error) {
        validationErrors.push(`${emp.first_name_en} ${emp.last_name_en}: ${error}`);
      }

      const bankCode = emp.bank_account_iban ? extractBankCode(emp.bank_account_iban) : '';
      validated.push({
        ...item,
        bank_name: emp.bank_name || 'Unknown',
        bank_code: bankCode,
        iban: emp.bank_account_iban || '',
        account_number: emp.bank_account_number || '',
        validation_error: error,
      });
    }

    setValidatedData(validated);
    setErrors(validationErrors);

    const validEmployees = validated.filter(e => !e.validation_error);
    const grouped = validEmployees.reduce((acc, emp) => {
      const existing = acc.find(g => g.bankCode === emp.bank_code);
      if (existing) {
        existing.employees.push(emp);
        existing.totalAmount += Number(emp.net_salary || 0);
      } else {
        acc.push({
          bankCode: emp.bank_code,
          bankName: SAUDI_BANKS[emp.bank_code as keyof typeof SAUDI_BANKS] || 'Unknown Bank',
          employees: [emp],
          totalAmount: Number(emp.net_salary || 0),
        });
      }
      return acc;
    }, [] as BankGroup[]);

    setBankGroups(grouped.sort((a, b) => b.totalAmount - a.totalAmount));
    setValidating(false);
  };

  const generateSIFContent = (employees: EmployeeWithBank[]): string => {
    const paymentDate = new Date(batch.period_end);
    const formattedPaymentDate = paymentDate.toISOString().split('T')[0].replace(/-/g, '');
    let content = '';

    employees.forEach((item) => {
      const emp = item.employee;
      const recordType = 'SCR';
      const routingCode = item.bank_code.padStart(3, '0');
      const employeeBank = item.bank_code.padStart(3, '0');
      const employeeAccount = item.account_number.padEnd(16, ' ').substring(0, 16);
      const employeeId = emp.employee_number.padEnd(14, ' ').substring(0, 14);
      const employeeName = `${emp.first_name_en} ${emp.last_name_en}`.padEnd(35, ' ').substring(0, 35);
      const amount = Math.round(Number(item.net_salary || 0) * 100).toString().padStart(15, '0');
      const bankCode = employeeBank;
      const routingType = '01';
      const accountType = '01';
      const employeeIBAN = item.iban.replace(/\s/g, '').toUpperCase().padEnd(34, ' ').substring(0, 34);

      const line = [
        recordType,
        routingCode,
        employeeBank,
        employeeAccount,
        employeeId,
        employeeName,
        amount,
        formattedPaymentDate,
        formattedPaymentDate,
        employerId.padEnd(10, ' ').substring(0, 10),
        establishmentId.padEnd(10, ' ').substring(0, 10),
        bankCode,
        routingType,
        accountType,
        employeeIBAN,
        ''.padEnd(10, ' ')
      ].join('|');

      content += line + '\n';
    });

    return content;
  };

  const generateWPSFiles = async () => {
    if (!employerId || !establishmentId) {
      showToast('Please enter Employer ID and Establishment ID', 'error');
      return;
    }

    if (errors.length > 0) {
      showToast(`Cannot generate file: ${errors.length} validation errors found`, 'error');
      return;
    }

    if (bankGroups.length === 0) {
      showToast('No valid employee data found', 'error');
      return;
    }

    setGenerating(true);
    try {
      const paymentDate = new Date(batch.period_end);
      const formattedPaymentDate = paymentDate.toISOString().split('T')[0].replace(/-/g, '');
      const filesGenerated: string[] = [];

      for (const group of bankGroups) {
        const sifContent = generateSIFContent(group.employees);
        const bankNameSlug = group.bankName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
        const fileName = `WPS_${batch.month}_${bankNameSlug}_${formattedPaymentDate}.sif`;

        const { error: dbError } = await supabase
          .from('wps_files')
          .insert({
            batch_id: batch.id,
            company_id: batch.company_id,
            file_name: fileName,
            file_content: sifContent,
            file_format: 'SIF',
            employer_id: employerId,
            establishment_id: establishmentId,
            payment_date: batch.period_end,
            total_employees: group.employees.length,
            total_amount: group.totalAmount,
            status: 'generated',
            bank_code: group.bankCode,
          });

        if (dbError) throw dbError;

        const blob = new Blob([sifContent], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(url);

        filesGenerated.push(`${group.bankName} (${group.employees.length} employees)`);
      }

      await supabase.from('audit_logs').insert({
        table_name: 'wps_files',
        action: 'INSERT',
        record_id: batch.id,
        changes: {
          batch_id: batch.id,
          files_generated: filesGenerated.length,
          total_employees: bankGroups.reduce((s, g) => s + g.employees.length, 0),
          total_amount: bankGroups.reduce((s, g) => s + g.totalAmount, 0),
        },
        user_id: (await supabase.auth.getUser()).data.user?.id,
      });

      showToast(`Successfully generated ${filesGenerated.length} WPS file(s)`, 'success');
      onComplete();
    } catch (error: any) {
      logError(error, 'high', { component: 'WPSFileGenerator', action: 'generateWPSFiles' });
      showToast('Failed to generate WPS files: ' + error.message, 'error');
    } finally {
      setGenerating(false);
    }
  };

  const validCount = validatedData.filter(e => !e.validation_error).length;
  const invalidCount = validatedData.filter(e => e.validation_error).length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-cyan-50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {language === 'ar' ? 'مولد ملفات نظام حماية الأجور' : 'WPS File Generator'}
            </h3>
            <p className="text-sm text-gray-600">
              {language === 'ar' ? 'إنشاء ملفات متوافقة مع نظام سارية' : 'Generate SARIE-compliant payment files'}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {validating ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
            <span className="ml-3 text-gray-600">{language === 'ar' ? 'جاري التحقق من البيانات...' : 'Validating employee data...'}</span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`rounded-lg p-4 text-center border-2 ${validCount > 0 ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                <CheckCircle className={`h-6 w-6 mx-auto mb-2 ${validCount > 0 ? 'text-green-600' : 'text-gray-400'}`} />
                <p className="text-sm text-gray-600">{language === 'ar' ? 'موظف صالح' : 'Valid Employees'}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{validCount}</p>
              </div>
              <div className={`rounded-lg p-4 text-center border-2 ${invalidCount > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                <XCircle className={`h-6 w-6 mx-auto mb-2 ${invalidCount > 0 ? 'text-red-600' : 'text-gray-400'}`} />
                <p className="text-sm text-gray-600">{language === 'ar' ? 'موظف غير صالح' : 'Invalid Employees'}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{invalidCount}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 text-center border-2 border-blue-200">
                <Building2 className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">{language === 'ar' ? 'البنوك' : 'Banks'}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{bankGroups.length}</p>
              </div>
            </div>

            {errors.length > 0 && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 max-h-48 overflow-y-auto">
                <div className="flex items-start gap-2 mb-2">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-900 mb-2">
                      {language === 'ar' ? 'أخطاء التحقق من الصحة' : 'Validation Errors'} ({errors.length})
                    </p>
                    <ul className="text-xs text-red-800 space-y-1">
                      {errors.map((err, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-red-600">•</span>
                          <span>{err}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {bankGroups.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-900">
                  {language === 'ar' ? 'تجميع حسب البنك' : 'Grouping by Bank'}
                </h4>
                {bankGroups.map((group) => (
                  <div key={group.bankCode} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{group.bankName}</p>
                          <p className="text-xs text-gray-500">{language === 'ar' ? 'رمز البنك' : 'Bank Code'}: {group.bankCode}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {group.employees.length}
                        </p>
                        <p className="text-sm font-semibold text-green-600 flex items-center gap-1 justify-end">
                          <DollarSign className="h-4 w-4" />
                          {formatCurrency(group.totalAmount, language)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {language === 'ar' ? 'رقم صاحب العمل' : 'Employer ID'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={employerId}
                    onChange={(e) => setEmployerId(e.target.value.replace(/\D/g, '').substring(0, 10))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={language === 'ar' ? 'أدخل رقم صاحب العمل (10 أرقام)' : 'Enter Employer ID (10 digits)'}
                    maxLength={10}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {language === 'ar' ? 'المسجل في التأمينات الاجتماعية / وزارة العمل' : 'As registered with GOSI/MOL'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {language === 'ar' ? 'رقم المنشأة' : 'Establishment ID'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={establishmentId}
                    onChange={(e) => setEstablishmentId(e.target.value.replace(/\D/g, '').substring(0, 10))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={language === 'ar' ? 'أدخل رقم المنشأة (10 أرقام)' : 'Enter Establishment ID (10 digits)'}
                    maxLength={10}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {language === 'ar' ? 'المسجل في وزارة الموارد البشرية' : 'As registered with Ministry of HR'}
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-900 mb-2">
                  {language === 'ar' ? 'تفاصيل تنسيق الملف:' : 'File Format Details:'}
                </p>
                <ul className="text-xs text-blue-800 space-y-1 ml-4 list-disc">
                  <li>{language === 'ar' ? 'التنسيق: SARIE SIF (تنسيق الواجهة القياسية)' : 'Format: SARIE SIF (Standard Interface Format)'}</li>
                  <li>{language === 'ar' ? 'الترميز: ASCII/UTF-8' : 'Encoding: ASCII/UTF-8'}</li>
                  <li>{language === 'ar' ? 'الفاصل: شريط عمودي (|)' : 'Delimiter: Pipe (|)'}</li>
                  <li>{language === 'ar' ? 'نوع السجل: SCR (سجل ائتمان الراتب)' : 'Record Type: SCR (Salary Credit Record)'}</li>
                  <li>{language === 'ar' ? 'يتم إنشاء ملف منفصل لكل بنك' : 'Separate file generated per bank'}</li>
                </ul>
              </div>

              <button
                onClick={generateWPSFiles}
                disabled={generating || !employerId || !establishmentId || validCount === 0 || errors.length > 0}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
              >
                {generating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    <span>{language === 'ar' ? 'جاري الإنشاء...' : 'Generating...'}</span>
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5" />
                    <span>
                      {language === 'ar'
                        ? `إنشاء وتنزيل ${bankGroups.length} ملف WPS`
                        : `Generate & Download ${bankGroups.length} WPS File${bankGroups.length !== 1 ? 's' : ''}`}
                    </span>
                  </>
                )}
              </button>

              {bankGroups.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>
                    {language === 'ar'
                      ? 'سيتم تنزيل الملفات تلقائيًا بعد الإنشاء'
                      : 'Files will be automatically downloaded after generation'}
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
