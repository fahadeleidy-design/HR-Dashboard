import { useState } from 'react';
import { Upload, FileText, Check, X, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';

interface ContractUploadProps {
  employeeId: string;
  companyId: string;
  onSuccess?: (contractId: string) => void;
  onCancel?: () => void;
}

interface ParsedData {
  contractNumber?: string;
  salary?: number;
  startDate?: string;
  endDate?: string;
  position?: string;
  department?: string;
  contractType?: string;
  workHours?: number;
  probationPeriod?: number;
  noticePeriod?: number;
  benefits?: {
    housing?: number;
    transport?: number;
  };
}

export function ContractUpload({ employeeId, companyId, onSuccess, onCancel }: ContractUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [confidence, setConfidence] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const { showToast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        setError('Please select a PDF file');
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      setFile(selectedFile);
      setError('');
      setParsedData(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      const contractNumber = `CT-${Date.now()}`;
      const fileName = `${companyId}/${employeeId}/${contractNumber}-${file.name}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('contracts')
        .upload(fileName, file, {
          contentType: 'application/pdf',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('contracts')
        .getPublicUrl(fileName);

      const { data: contractData, error: insertError } = await supabase
        .from('employee_contracts')
        .insert({
          company_id: companyId,
          employee_id: employeeId,
          contract_number: contractNumber,
          contract_type: 'permanent',
          start_date: new Date().toISOString().split('T')[0],
          salary: 0,
          position: 'To be extracted',
          pdf_url: urlData.publicUrl,
          pdf_filename: file.name,
          extraction_status: 'pending',
          uploaded_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (insertError) throw insertError;

      showToast({
        type: 'success',
        title: 'Contract Uploaded',
        message: 'Starting AI extraction...'
      });

      await parseContract(contractData.id, file);

    } catch (err: any) {
      setError(err.message || 'Failed to upload contract');
      showToast({
        type: 'error',
        title: 'Upload Failed',
        message: err.message || 'Failed to upload contract'
      });
    } finally {
      setUploading(false);
    }
  };

  const parseContract = async (contractId: string, pdfFile: File) => {
    setParsing(true);

    try {
      const formData = new FormData();
      formData.append('file', pdfFile);
      formData.append('contractId', contractId);
      formData.append('companyId', companyId);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-contract-pdf`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: formData
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to parse contract');
      }

      setParsedData(result.data);
      setConfidence(result.confidence || 0);

      showToast({
        type: 'success',
        title: 'AI Extraction Complete',
        message: `Extracted data with ${result.confidence}% confidence`
      });

      if (onSuccess) {
        onSuccess(contractId);
      }

    } catch (err: any) {
      setError(err.message || 'Failed to parse contract');
      showToast({
        type: 'error',
        title: 'Parsing Failed',
        message: err.message || 'Failed to extract contract data'
      });
    } finally {
      setParsing(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
          <Sparkles className="h-6 w-6 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">AI-Powered Contract Upload</h3>
          <p className="text-sm text-gray-600">Upload PDF and let AI extract all contract details</p>
        </div>
      </div>

      {!file ? (
        <div
          className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-primary-400 hover:bg-primary-50 transition-all duration-200 cursor-pointer group"
          onClick={() => document.getElementById('contract-file')?.click()}
        >
          <Upload className="h-12 w-12 mx-auto text-gray-400 group-hover:text-primary-600 transition-colors" />
          <p className="mt-4 text-sm font-medium text-gray-700 group-hover:text-primary-700">
            Click to upload contract PDF
          </p>
          <p className="mt-2 text-xs text-gray-500">
            PDF files up to 10MB
          </p>
          <input
            id="contract-file"
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <FileText className="h-10 w-10 text-primary-600" />
            <div className="flex-1">
              <p className="font-medium text-gray-900">{file.name}</p>
              <p className="text-sm text-gray-600">{(file.size / 1024).toFixed(2)} KB</p>
            </div>
            {!uploading && !parsing && (
              <button
                onClick={() => {
                  setFile(null);
                  setParsedData(null);
                }}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {parsing && (
            <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
              <div>
                <p className="font-medium text-blue-900">AI is analyzing the contract...</p>
                <p className="text-sm text-blue-700 mt-1">Extracting employee details, salary, dates, and benefits</p>
              </div>
            </div>
          )}

          {parsedData && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Check className="h-5 w-5 text-green-600" />
                <p className="font-semibold text-green-900">
                  Data Extracted ({confidence.toFixed(0)}% confidence)
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {parsedData.contractNumber && (
                  <div>
                    <span className="text-gray-600">Contract #:</span>
                    <span className="ml-2 font-medium text-gray-900">{parsedData.contractNumber}</span>
                  </div>
                )}
                {parsedData.position && (
                  <div>
                    <span className="text-gray-600">Position:</span>
                    <span className="ml-2 font-medium text-gray-900">{parsedData.position}</span>
                  </div>
                )}
                {parsedData.salary && (
                  <div>
                    <span className="text-gray-600">Salary:</span>
                    <span className="ml-2 font-medium text-gray-900">{parsedData.salary.toLocaleString()} SAR</span>
                  </div>
                )}
                {parsedData.startDate && (
                  <div>
                    <span className="text-gray-600">Start Date:</span>
                    <span className="ml-2 font-medium text-gray-900">{parsedData.startDate}</span>
                  </div>
                )}
                {parsedData.contractType && (
                  <div>
                    <span className="text-gray-600">Type:</span>
                    <span className="ml-2 font-medium text-gray-900 capitalize">{parsedData.contractType.replace('_', ' ')}</span>
                  </div>
                )}
                {parsedData.workHours && (
                  <div>
                    <span className="text-gray-600">Work Hours:</span>
                    <span className="ml-2 font-medium text-gray-900">{parsedData.workHours}h/week</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            {!uploading && !parsing && !parsedData && (
              <button
                onClick={handleUpload}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg font-medium hover:from-primary-700 hover:to-primary-800 transition-all duration-200 shadow-lg shadow-primary-200"
              >
                <Sparkles className="h-5 w-5" />
                <span>Upload & Extract with AI</span>
              </button>
            )}
            {onCancel && (
              <button
                onClick={onCancel}
                disabled={uploading || parsing}
                className="px-4 py-3 border-2 border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
