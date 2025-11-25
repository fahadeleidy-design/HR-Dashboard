import { useState } from 'react';
import { Upload, FileText, Loader2, CheckCircle, XCircle, AlertCircle, Sparkles, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';

interface BulkDocumentUploadProps {
  companyId: string;
  onComplete?: () => void;
  onCancel?: () => void;
}

interface UploadItem {
  file: File;
  employeeId: string | null;
  employeeName: string | null;
  documentType: string;
  documentName: string;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  error?: string;
  confidence: number;
}

const DOCUMENT_TYPES = ['iqama', 'passport', 'contract', 'certificate', 'visa', 'medical', 'other'];

export function BulkDocumentUpload({ companyId, onComplete, onCancel }: BulkDocumentUploadProps) {
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
      .select('id, first_name_en, last_name_en, first_name_ar, last_name_ar, employee_number')
      .eq('company_id', companyId)
      .order('first_name_en');

    if (data) {
      setEmployees(data);
    }
  };

  const detectDocumentType = (filename: string): string => {
    const lower = filename.toLowerCase();

    if (lower.includes('iqama') || lower.includes('إقامة')) return 'iqama';
    if (lower.includes('passport') || lower.includes('جواز')) return 'passport';
    if (lower.includes('contract') || lower.includes('عقد')) return 'contract';
    if (lower.includes('certificate') || lower.includes('شهادة')) return 'certificate';
    if (lower.includes('visa') || lower.includes('تأشيرة')) return 'visa';
    if (lower.includes('medical') || lower.includes('طبي')) return 'medical';

    return 'other';
  };

  const matchEmployee = (filename: string): { id: string | null; name: string | null; confidence: number } => {
    const cleanName = filename
      .replace(/\.(pdf|doc|docx|jpg|jpeg|png)$/i, '')
      .toLowerCase()
      .replace(/[_-]/g, ' ')
      .trim();

    let bestMatch: { id: string | null; name: string | null; confidence: number } = {
      id: null,
      name: null,
      confidence: 0
    };

    for (const emp of employees) {
      const fullNameEn = `${emp.first_name_en} ${emp.last_name_en}`.toLowerCase();
      const fullNameAr = `${emp.first_name_ar || ''} ${emp.last_name_ar || ''}`.toLowerCase();
      const empNumber = emp.employee_number.toLowerCase();

      if (cleanName.includes(fullNameEn)) {
        const confidence = (fullNameEn.length / cleanName.length) * 100;
        if (confidence > bestMatch.confidence) {
          bestMatch = {
            id: emp.id,
            name: `${emp.first_name_en} ${emp.last_name_en}`,
            confidence: Math.min(confidence, 95)
          };
        }
      }

      if (fullNameAr && cleanName.includes(fullNameAr)) {
        const confidence = (fullNameAr.length / cleanName.length) * 100;
        if (confidence > bestMatch.confidence) {
          bestMatch = {
            id: emp.id,
            name: `${emp.first_name_en} ${emp.last_name_en}`,
            confidence: Math.min(confidence, 95)
          };
        }
      }

      if (cleanName.includes(empNumber)) {
        const confidence = 85;
        if (confidence > bestMatch.confidence) {
          bestMatch = {
            id: emp.id,
            name: `${emp.first_name_en} ${emp.last_name_en}`,
            confidence
          };
        }
      }

      const firstNameMatch = cleanName.includes(emp.first_name_en.toLowerCase());
      const lastNameMatch = cleanName.includes(emp.last_name_en.toLowerCase());

      if (firstNameMatch && lastNameMatch) {
        const confidence = 80;
        if (confidence > bestMatch.confidence) {
          bestMatch = {
            id: emp.id,
            name: `${emp.first_name_en} ${emp.last_name_en}`,
            confidence
          };
        }
      }
    }

    return bestMatch;
  };

  const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const validFiles = selectedFiles.filter(file => {
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

    const items: UploadItem[] = validFiles.map(file => {
      const documentType = detectDocumentType(file.name);
      const employeeMatch = matchEmployee(file.name);

      return {
        file,
        employeeId: employeeMatch.id,
        employeeName: employeeMatch.name,
        documentType,
        documentName: file.name.replace(/\.(pdf|doc|docx|jpg|jpeg|png)$/i, ''),
        status: 'pending' as const,
        confidence: employeeMatch.confidence
      };
    });

    setUploadItems(items);
  };

  const updateEmployeeId = (index: number, employeeId: string) => {
    setUploadItems(prev => {
      const updated = [...prev];
      const emp = employees.find(e => e.id === employeeId);
      updated[index] = {
        ...updated[index],
        employeeId,
        employeeName: emp ? `${emp.first_name_en} ${emp.last_name_en}` : null,
        confidence: 100
      };
      return updated;
    });
  };

  const updateDocumentType = (index: number, documentType: string) => {
    setUploadItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], documentType };
      return updated;
    });
  };

  const processAllUploads = async () => {
    const validItems = uploadItems.filter(item => item.employeeId);

    if (validItems.length === 0) {
      showToast({
        type: 'error',
        title: 'No Valid Items',
        message: 'Please assign employees to all documents'
      });
      return;
    }

    setProcessing(true);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < uploadItems.length; i++) {
      const item = uploadItems[i];
      if (!item.employeeId) continue;

      const success = await processUpload(i, item);
      if (success) successCount++;
      else failCount++;
    }

    setProcessing(false);

    showToast({
      type: successCount > 0 ? 'success' : 'error',
      title: 'Bulk Upload Complete',
      message: `Successfully uploaded ${successCount} documents${failCount > 0 ? `, ${failCount} failed` : ''}`
    });

    if (onComplete) {
      onComplete();
    }
  };

  const processUpload = async (index: number, item: UploadItem): Promise<boolean> => {
    try {
      setUploadItems(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], status: 'uploading' };
        return updated;
      });

      const fileName = `${companyId}/${item.employeeId}/${Date.now()}-${item.file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, item.file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from('documents')
        .insert({
          company_id: companyId,
          employee_id: item.employeeId,
          document_type: item.documentType,
          document_name: item.documentName,
          document_url: urlData.publicUrl,
          status: 'active'
        });

      if (insertError) throw insertError;

      setUploadItems(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], status: 'completed' };
        return updated;
      });

      return true;

    } catch (err: any) {
      setUploadItems(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], status: 'failed', error: err.message };
        return updated;
      });
      return false;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'uploading':
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
          <Sparkles className="h-6 w-6 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">AI Bulk Document Upload</h3>
          <p className="text-sm text-gray-600">Automatically detects employee names and document types</p>
        </div>
      </div>

      {files.length === 0 ? (
        <div
          className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-purple-400 hover:bg-purple-50 transition-all duration-200 cursor-pointer group"
          onClick={() => document.getElementById('bulk-docs-files')?.click()}
        >
          <Upload className="h-12 w-12 mx-auto text-gray-400 group-hover:text-purple-600 transition-colors" />
          <p className="mt-4 text-sm font-medium text-gray-700 group-hover:text-purple-700">
            Click to select multiple documents
          </p>
          <p className="mt-2 text-xs text-gray-500">
            PDF, DOC, DOCX, JPG, PNG (max 10MB each)
          </p>
          <p className="mt-2 text-xs text-purple-600 font-medium">
            💡 Tip: Name files like "John Doe Passport.pdf" or "EMP001 Iqama.pdf"
          </p>
          <input
            id="bulk-docs-files"
            type="file"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            multiple
            onChange={handleFilesSelect}
            className="hidden"
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-600" />
              <span className="font-medium text-purple-900">{files.length} files selected</span>
            </div>
            {!processing && (
              <button
                onClick={() => {
                  setFiles([]);
                  setUploadItems([]);
                }}
                className="p-1 hover:bg-purple-100 rounded transition-colors"
              >
                <X className="h-5 w-5 text-purple-600" />
              </button>
            )}
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {uploadItems.map((item, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex-shrink-0 mt-1">
                  {getStatusIcon(item.status)}
                </div>

                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 truncate">{item.file.name}</p>
                      <p className="text-sm text-gray-600">{(item.file.size / 1024).toFixed(2)} KB</p>
                    </div>
                    {item.employeeId && item.confidence > 0 && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-white rounded border border-gray-200">
                        <Sparkles className="h-3 w-3 text-purple-600" />
                        <span className={`text-xs font-medium ${getConfidenceColor(item.confidence)}`}>
                          {item.confidence.toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </div>

                  {item.error && (
                    <p className="text-xs text-red-600">{item.error}</p>
                  )}

                  {item.status === 'pending' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Employee {item.employeeName && <span className="text-green-600">✓ Auto-detected</span>}
                        </label>
                        <select
                          value={item.employeeId || ''}
                          onChange={(e) => updateEmployeeId(index, e.target.value)}
                          className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-500"
                          disabled={processing}
                        >
                          <option value="">Select Employee</option>
                          {employees.map((emp) => (
                            <option key={emp.id} value={emp.id}>
                              {emp.first_name_en} {emp.last_name_en}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Document Type <span className="text-purple-600">✓ Auto-detected</span>
                        </label>
                        <select
                          value={item.documentType}
                          onChange={(e) => updateDocumentType(index, e.target.value)}
                          className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-500"
                          disabled={processing}
                        >
                          {DOCUMENT_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {type.charAt(0).toUpperCase() + type.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {item.status === 'completed' && (
                    <div className="text-xs text-green-700 font-medium">
                      ✓ Uploaded successfully
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={processAllUploads}
              disabled={processing || uploadItems.every(item => !item.employeeId)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg font-medium hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-lg shadow-purple-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Processing {uploadItems.filter(i => i.status !== 'pending').length}/{uploadItems.filter(i => i.employeeId).length}...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  <span>Upload All Documents</span>
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
                  <p className="font-medium text-blue-900">Uploading documents...</p>
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
