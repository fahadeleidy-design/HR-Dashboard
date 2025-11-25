import { useState } from 'react';
import { FileText, Download, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface WPSFileGeneratorProps {
  batch: any;
  payrollItems: any[];
  onComplete: () => void;
}

export function WPSFileGenerator({ batch, payrollItems, onComplete }: WPSFileGeneratorProps) {
  const [generating, setGenerating] = useState(false);
  const [employerId, setEmployerId] = useState('');
  const [establishmentId, setEstablishmentId] = useState('');

  const generateWPSFile = async () => {
    if (!employerId || !establishmentId) {
      alert('Please enter Employer ID and Establishment ID');
      return;
    }

    setGenerating(true);
    try {
      const paymentDate = new Date(batch.period_end);
      const formattedPaymentDate = paymentDate.toISOString().split('T')[0].replace(/-/g, '');

      let sifContent = '';

      payrollItems.forEach((item, index) => {
        const recordType = 'SCR';
        const routingCode = '080';
        const employeeBank = '080';
        const employeeAccount = item.employee.iqama_number || '0000000000';
        const employeeId = item.employee.employee_number.padEnd(14, ' ');
        const employeeName = `${item.employee.first_name_en} ${item.employee.last_name_en}`.padEnd(35, ' ').substring(0, 35);
        const amount = Math.round(Number(item.net_salary || 0) * 100).toString().padStart(15, '0');
        const bankCode = employeeBank;
        const routingType = '01';
        const accountType = '01';
        const employeeIBAN = `SA${employeeAccount}`.padEnd(34, '0');

        const line = [
          recordType,
          routingCode,
          employeeBank,
          employeeAccount.padEnd(16, ' '),
          employeeId,
          employeeName,
          amount,
          formattedPaymentDate,
          formattedPaymentDate,
          employerId.padEnd(10, ' '),
          establishmentId.padEnd(10, ' '),
          bankCode,
          routingType,
          accountType,
          employeeIBAN,
          ''.padEnd(10, ' ')
        ].join('|');

        sifContent += line + '\n';
      });

      const fileName = `WPS_${batch.month}_${formattedPaymentDate}.sif`;
      const totalAmount = payrollItems.reduce((sum, item) => sum + Number(item.net_salary || 0), 0);

      const { data: wpsFile, error } = await supabase
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
          total_employees: payrollItems.length,
          total_amount: totalAmount,
          status: 'generated'
        })
        .select()
        .single();

      if (error) throw error;

      const blob = new Blob([sifContent], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);

      alert('WPS file generated and downloaded successfully!');
      onComplete();
    } catch (error: any) {
      console.error('Error generating WPS file:', error);
      alert('Failed to generate WPS file: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-purple-600 flex items-center justify-center">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">WPS File Generator</h3>
            <p className="text-sm text-gray-600">Generate SARIE-compliant payment file</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">WPS (Wage Protection System)</p>
              <p className="text-xs text-blue-700 mt-1">
                This generates a SARIE-compliant SIF (Standard Interface Format) file for wage payment submission to Saudi banks and GOSI.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-600">Employees</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{payrollItems.length}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-600">Total Amount</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              SAR {payrollItems.reduce((sum, item) => sum + Number(item.net_salary || 0), 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-600">Payment Date</p>
            <p className="text-lg font-bold text-gray-900 mt-1">
              {new Date(batch.period_end).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Employer ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={employerId}
              onChange={(e) => setEmployerId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Enter Employer ID (10 digits)"
              maxLength={10}
            />
            <p className="text-xs text-gray-500 mt-1">As registered with GOSI/MOL</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Establishment ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={establishmentId}
              onChange={(e) => setEstablishmentId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Enter Establishment ID (10 digits)"
              maxLength={10}
            />
            <p className="text-xs text-gray-500 mt-1">As registered with Ministry of Labor</p>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm font-medium text-yellow-900 mb-2">File Format Details:</p>
          <ul className="text-xs text-yellow-800 space-y-1 ml-4 list-disc">
            <li>Format: SARIE SIF (Standard Interface Format)</li>
            <li>Encoding: ASCII/UTF-8</li>
            <li>Delimiter: Pipe (|)</li>
            <li>Record Type: SCR (Salary Credit Record)</li>
            <li>Each line represents one employee payment</li>
          </ul>
        </div>

        <button
          onClick={generateWPSFile}
          disabled={generating || !employerId || !establishmentId}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
        >
          {generating ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              <span>Generating...</span>
            </>
          ) : (
            <>
              <Download className="h-5 w-5" />
              <span>Generate & Download WPS File</span>
            </>
          )}
        </button>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span>File will be automatically downloaded after generation</span>
        </div>
      </div>
    </div>
  );
}
