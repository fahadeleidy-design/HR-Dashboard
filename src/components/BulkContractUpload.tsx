import { useState } from 'react';
import { Upload, FileText, Check, X, Loader2, AlertCircle, Sparkles, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';

interface BulkContractUploadProps {
  companyId: string;
  onComplete?: () => void;
  onCancel?: () => void;
}

interface UploadItem {
  file: File;
  employeeId: string;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
  contractId?: string;
  confidence?: number;
  error?: string;
  extractedData?: any;
}

export function BulkContractUpload({ companyId, onComplete, onCancel }: BulkContractUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const { showToast } = useToast();

  useState(() => {
    fetchEmployees();
  });

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from('employees')
      .select('id, first_name_en, last_name_en, employee_number')
      .eq('company_id', companyId)
      .order('first_name_en');

    if (data) {
      setEmployees(data);
    }
  };

  const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const validFiles = selectedFiles.filter(file => {
      if (file.type !== 'application/pdf') {
        showToast({
          type: 'error',
          title: 'Invalid File',
          message: `${file.name} is not a PDF file`
        });
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        showToast({
          type: 'error',
          title: 'File Too Large',
          message: `${file.name} exceeds 10MB`
        });
        return false;
      }
      return true;
    });

    setFiles(validFiles);
    setUploadItems(validFiles.map(file => ({
      file,
      employeeId: '',
      status: 'pending' as const
    })));
  };

  const updateEmployeeId = (index: number, employeeId: string) => {
    setUploadItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], employeeId };
      return updated;
    });
  };

  const processAllUploads = async () => {
    const validItems = uploadItems.filter(item => item.employeeId);

    if (validItems.length === 0) {
      showToast({
        type: 'error',
        title: 'No Valid Items',
        message: 'Please assign employees to all contracts'
      });
      return;
    }

    setProcessing(true);

    for (let i = 0; i < uploadItems.length; i++) {
      const item = uploadItems[i];
      if (!item.employeeId) continue;

      await processUpload(i, item);
    }

    setProcessing(false);
    showToast({
      type: 'success',
      title: 'Bulk Upload Complete',
      message: `Processed ${validItems.length} contracts`
    });

    if (onComplete) {
      onComplete();
    }
  };

  const processUpload = async (index: number, item: UploadItem) => {
    try {
      setUploadItems(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], status: 'uploading' };
        return updated;
      });

      const contractNumber = `CT-${Date.now()}-${index}`;
      const fileName = `${companyId}/${item.employeeId}/${contractNumber}-${item.file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('contracts')
        .upload(fileName, item.file, {
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
          employee_id: item.employeeId,
          contract_number: contractNumber,
          contract_type: 'permanent',
          start_date: new Date().toISOString().split('T')[0],
          salary: 0,
          position: 'To be extracted',
          pdf_url: urlData.publicUrl,
          pdf_filename: item.file.name,
          extraction_status: 'pending',
          uploaded_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setUploadItems(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], status: 'processing', contractId: contractData.id };
        return updated;
      });

      await parseContract(index, contractData.id, item.file);

    } catch (err: any) {
      setUploadItems(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], status: 'failed', error: err.message };
        return updated;
      });
    }
  };

  const parseContract = async (index: number, contractId: string, pdfFile: File) => {
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

      setUploadItems(prev => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          status: 'completed',
          confidence: result.confidence,
          extractedData: result.data
        };
        return updated;
      });

    } catch (err: any) {
      setUploadItems(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], status: 'failed', error: err.message };
        return updated;
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'uploading':
      case 'processing':
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
          <Sparkles className="h-6 w-6 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Bulk Contract Upload</h3>
          <p className="text-sm text-gray-600">Upload multiple PDFs and assign employees</p>
        </div>
      </div>

      {files.length === 0 ? (
        <div
          className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-primary-400 hover:bg-primary-50 transition-all duration-200 cursor-pointer group"
          onClick={() => document.getElementById('bulk-files')?.click()}
        >
          <Upload className="h-12 w-12 mx-auto text-gray-400 group-hover:text-primary-600 transition-colors" />
          <p className="mt-4 text-sm font-medium text-gray-700 group-hover:text-primary-700">
            Click to select multiple contract PDFs
          </p>
          <p className="mt-2 text-xs text-gray-500">
            You can select multiple PDF files at once
          </p>
          <input
            id="bulk-files"
            type="file"
            accept=".pdf"
            multiple
            onChange={handleFilesSelect}
            className="hidden"
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-900">{files.length} files selected</span>
            </div>
            {!processing && (
              <button
                onClick={() => {
                  setFiles([]);
                  setUploadItems([]);
                }}
                className="p-1 hover:bg-blue-100 rounded transition-colors"
              >
                <X className="h-5 w-5 text-blue-600" />
              </button>
            )}
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {uploadItems.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex-shrink-0">
                  {getStatusIcon(item.status)}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{item.file.name}</p>
                  <p className="text-sm text-gray-600">{(item.file.size / 1024).toFixed(2)} KB</p>
                  {item.confidence !== undefined && (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-green-500 to-green-600"
                          style={{ width: `${item.confidence}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-700">
                        {item.confidence.toFixed(0)}%
                      </span>
                    </div>
                  )}
                  {item.error && (
                    <p className="text-xs text-red-600 mt-1">{item.error}</p>
                  )}
                </div>

                {item.status === 'pending' && (
                  <select
                    value={item.employeeId}
                    onChange={(e) => updateEmployeeId(index, e.target.value)}
                    className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 min-w-[200px]"
                    disabled={processing}
                  >
                    <option value="">Select Employee</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name_en} {emp.last_name_en}
                      </option>
                    ))}
                  </select>
                )}

                {item.status === 'completed' && item.extractedData && (
                  <div className="text-xs text-green-700 font-medium">
                    ✓ Extracted
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={processAllUploads}
              disabled={processing || uploadItems.every(item => !item.employeeId)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg font-medium hover:from-primary-700 hover:to-primary-800 transition-all duration-200 shadow-lg shadow-primary-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Processing {uploadItems.filter(i => i.status !== 'pending').length}/{uploadItems.filter(i => i.employeeId).length}...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  <span>Process All with AI</span>
                </>
              )}
            </button>
            {onCancel && (
              <button
                onClick={onCancel}
                disabled={processing}
                className="px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            )}
          </div>

          {processing && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                <div>
                  <p className="font-medium text-blue-900">Processing contracts with AI...</p>
                  <p className="text-sm text-blue-700 mt-1">
                    This may take a few minutes depending on the number of files
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
