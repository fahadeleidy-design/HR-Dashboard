import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { BulkDocumentUpload } from '@/components/BulkDocumentUpload';
import { DocumentAIAnalysis } from '@/components/DocumentAIAnalysis';
import { ScrollableTable } from '@/components/ScrollableTable';
import { FileText, AlertTriangle, CheckCircle, Plus, Upload, X, Loader2, Layers, Brain, Eye, FileQuestion, Users, Printer, Download, FileSpreadsheet, Filter } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useSortableData, SortableTableHeader } from '@/components/SortableTable';
import { formatNumber } from '@/lib/formatters';

interface Document {
  id: string;
  employee_id: string;
  document_type: string;
  document_number: string;
  document_url: string;
  issue_date: string;
  expiry_date: string | null;
  status: 'active' | 'expired' | 'expiring_soon';
  extraction_status?: string;
  extraction_confidence?: number;
  extracted_data?: Record<string, any>;
  ai_analysis?: Record<string, any>;
  employee: {
    employee_number: string;
    first_name_en: string;
    last_name_en: string;
  };
}

export function Documents() {
  const { currentCompany } = useCompany();
  const { t, language, isRTL } = useLanguage();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'expiring_soon' | 'expired'>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [showAIAnalysisModal, setShowAIAnalysisModal] = useState(false);
  const [showMissingContractsModal, setShowMissingContractsModal] = useState(false);
  const [showEmployeeDocumentsModal, setShowEmployeeDocumentsModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [employeesWithoutContracts, setEmployeesWithoutContracts] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    employee_id: '',
    document_type: 'iqama',
    document_name: '',
    issue_date: '',
    expiry_date: '',
    file: null as File | null
  });

  useEffect(() => {
    if (currentCompany) {
      fetchDocuments();
      fetchEmployees();
      fetchEmployeesWithoutContracts();
    }
  }, [currentCompany]);

  const fetchEmployees = async () => {
    if (!currentCompany) return;

    const { data } = await supabase
      .from('employees')
      .select('id, first_name_en, last_name_en, employee_number')
      .eq('company_id', currentCompany.id)
      .order('first_name_en');

    if (data) setEmployees(data);
  };

  const fetchEmployeesWithoutContracts = async () => {
    if (!currentCompany) return;

    try {
      const { data: allEmployees, error: empError } = await supabase
        .from('employees')
        .select('id, first_name_en, last_name_en, first_name_ar, last_name_ar, employee_number, job_title_en, hire_date, employment_status')
        .eq('company_id', currentCompany.id)
        .order('first_name_en');

      if (empError) {
        console.error('Error fetching employees:', empError);
        return;
      }

      const { data: contractDocs, error: docError } = await supabase
        .from('documents')
        .select('employee_id, document_name, holder_name')
        .eq('company_id', currentCompany.id)
        .eq('document_type', 'contract');

      if (docError) {
        console.error('Error fetching contract documents:', docError);
        return;
      }

      console.log('=== MISSING CONTRACTS DETECTION (NAME-BASED) ===');
      console.log('Company ID:', currentCompany.id);
      console.log('Total employees:', allEmployees?.length || 0);
      console.log('Contract documents found:', contractDocs?.length || 0);

      if (allEmployees && contractDocs) {
        const normalizeString = (str: string) => {
          return str
            .toUpperCase()
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/[^\w\s]/g, '');
        };

        const contractNames = new Set(
          contractDocs
            .map(doc => normalizeString(doc.document_name || doc.holder_name || ''))
            .filter(name => name.length > 0)
        );

        const employeeIdsWithContracts = new Set(
          contractDocs.map(doc => doc.employee_id).filter(id => id)
        );

        console.log('Contract names found:', Array.from(contractNames).slice(0, 10));
        console.log('Unique employees with contracts (by ID):', employeeIdsWithContracts.size);

        const employeesWithout = allEmployees.filter(emp => {
          const employeeNameEN = normalizeString(`${emp.first_name_en} ${emp.last_name_en}`);
          const employeeNameAR = normalizeString(`${emp.first_name_ar || ''} ${emp.last_name_ar || ''}`);

          const hasContractByName = contractNames.has(employeeNameEN) || contractNames.has(employeeNameAR);
          const hasContractById = employeeIdsWithContracts.has(emp.id);

          return !hasContractByName && !hasContractById;
        });

        console.log('Employees WITHOUT contracts:', employeesWithout.length);
        if (employeesWithout.length > 0) {
          console.log('Missing contract employees (first 10):', employeesWithout.slice(0, 10).map(e => ({
            id: e.id,
            number: e.employee_number,
            nameEN: `${e.first_name_en} ${e.last_name_en}`,
            nameAR: `${e.first_name_ar || ''} ${e.last_name_ar || ''}`
          })));
        }
        console.log('=================================');

        setEmployeesWithoutContracts(employeesWithout);
      } else {
        console.log('Missing data - allEmployees:', !!allEmployees, 'contractDocs:', !!contractDocs);
        setEmployeesWithoutContracts([]);
      }
    } catch (error) {
      console.error('Error in fetchEmployeesWithoutContracts:', error);
      setEmployeesWithoutContracts([]);
    }
  };

  const fetchDocuments = async () => {
    if (!currentCompany) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select(`
          *,
          employee:employees(employee_number, first_name_en, last_name_en)
        `)
        .eq('company_id', currentCompany.id)
        .order('expiry_date', { ascending: true });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesStatus = filter === 'all' || doc.status === filter;
    const matchesEmployee = !selectedEmployeeId || doc.employee_id === selectedEmployeeId;
    return matchesStatus && matchesEmployee;
  });

  const activeCount = documents.filter(d => d.status === 'active').length;
  const expiringSoonCount = documents.filter(d => d.status === 'expiring_soon').length;
  const expiredCount = documents.filter(d => d.status === 'expired').length;

  const { sortedData, sortConfig, requestSort } = useSortableData(filteredDocuments);

  const refreshData = () => {
    fetchDocuments();
    fetchEmployeesWithoutContracts();
  };

  const getEmployeeDocuments = (employeeId: string) => {
    return documents.filter(doc => doc.employee_id === employeeId);
  };

  const handleViewEmployeeDocuments = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    setShowEmployeeDocumentsModal(true);
  };

  const handleViewDocument = (document: Document) => {
    if (document.document_url) {
      window.open(document.document_url, '_blank');
    }
  };

  const handlePrintEmployeeDocuments = (employeeId: string) => {
    const employeeDocs = getEmployeeDocuments(employeeId);
    const employee = employees.find(e => e.id === employeeId);

    if (!employee) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Employee Documents - ${employee.first_name_en} ${employee.last_name_en}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            h1 { color: #1e40af; border-bottom: 3px solid #1e40af; padding-bottom: 10px; }
            h2 { color: #374151; margin-top: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #1e40af; color: white; }
            tr:nth-child(even) { background-color: #f3f4f6; }
            .status-active { color: #059669; font-weight: bold; }
            .status-expiring { color: #d97706; font-weight: bold; }
            .status-expired { color: #dc2626; font-weight: bold; }
            .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
            .company-info { text-align: right; color: #6b7280; }
            @media print {
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>Employee Documents Report</h1>
              <p><strong>Employee:</strong> ${employee.first_name_en} ${employee.last_name_en} (${employee.employee_number})</p>
              <p><strong>Total Documents:</strong> ${employeeDocs.length}</p>
            </div>
            <div class="company-info">
              <p><strong>${currentCompany?.name_en || 'Company'}</strong></p>
              <p>${new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Document Type</th>
                <th>Document Name</th>
                <th>Issue Date</th>
                <th>Expiry Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${employeeDocs.map(doc => `
                <tr>
                  <td>${doc.document_type.toUpperCase()}</td>
                  <td>${doc.document_name || '-'}</td>
                  <td>${doc.issue_date ? new Date(doc.issue_date).toLocaleDateString() : '-'}</td>
                  <td>${doc.expiry_date ? new Date(doc.expiry_date).toLocaleDateString() : '-'}</td>
                  <td class="status-${doc.status}">${doc.status.replace('_', ' ').toUpperCase()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleExportEmployeeDocuments = (employeeId: string, format: 'excel' | 'pdf' = 'excel') => {
    const employeeDocs = getEmployeeDocuments(employeeId);
    const employee = employees.find(e => e.id === employeeId);

    if (!employee) return;

    if (format === 'excel') {
      const exportData = employeeDocs.map(doc => ({
        'Employee Number': employee.employee_number,
        'Employee Name': `${employee.first_name_en} ${employee.last_name_en}`,
        'Document Type': doc.document_type.toUpperCase(),
        'Document Name': doc.document_name || '-',
        'Issue Date': doc.issue_date ? new Date(doc.issue_date).toLocaleDateString() : '-',
        'Expiry Date': doc.expiry_date ? new Date(doc.expiry_date).toLocaleDateString() : '-',
        'Status': doc.status.replace('_', ' ').toUpperCase()
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Employee Documents');

      const colWidths = [
        { wch: 15 },
        { wch: 25 },
        { wch: 15 },
        { wch: 30 },
        { wch: 12 },
        { wch: 12 },
        { wch: 15 }
      ];
      ws['!cols'] = colWidths;

      XLSX.writeFile(wb, `${employee.first_name_en}_${employee.last_name_en}_Documents_${new Date().toISOString().split('T')[0]}.xlsx`);
    }
  };

  const handleExportAllDocuments = () => {
    const exportData = documents.map(doc => ({
      'Employee Number': doc.employee?.employee_number || '-',
      'Employee Name': doc.employee ? `${doc.employee.first_name_en} ${doc.employee.last_name_en}` : '-',
      'Document Type': doc.document_type.toUpperCase(),
      'Document Name': doc.document_name || '-',
      'Issue Date': doc.issue_date ? new Date(doc.issue_date).toLocaleDateString() : '-',
      'Expiry Date': doc.expiry_date ? new Date(doc.expiry_date).toLocaleDateString() : '-',
      'Status': doc.status.replace('_', ' ').toUpperCase()
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'All Documents');

    const colWidths = [
      { wch: 15 },
      { wch: 25 },
      { wch: 15 },
      { wch: 30 },
      { wch: 12 },
      { wch: 12 },
      { wch: 15 }
    ];
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, `All_Documents_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany || !formData.employee_id) return;

    setUploading(true);
    try {
      let documentUrl = null;

      if (formData.file) {
        const fileName = `${currentCompany.id}/${formData.employee_id}/${Date.now()}-${formData.file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(fileName, formData.file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(fileName);

        documentUrl = urlData.publicUrl;
      }

      const { error: insertError } = await supabase
        .from('documents')
        .insert({
          company_id: currentCompany.id,
          employee_id: formData.employee_id,
          document_type: formData.document_type,
          document_name: formData.document_name,
          document_url: documentUrl,
          issue_date: formData.issue_date || null,
          expiry_date: formData.expiry_date || null,
          status: 'active'
        });

      if (insertError) throw insertError;

      setShowUploadModal(false);
      setFormData({
        employee_id: '',
        document_type: 'iqama',
        document_name: '',
        issue_date: '',
        expiry_date: '',
        file: null
      });
      fetchDocuments();
    } catch (error: any) {
      console.error('Error uploading document:', error);
      alert(error.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
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
      <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : 'text-left'}>
          <h1 className="text-3xl font-bold text-gray-900">{t.documents.title}</h1>
          <p className="text-gray-600 mt-1">{t.documents.subtitle}</p>
          <p className="text-xs text-blue-600 mt-2 font-mono bg-blue-50 px-3 py-1 rounded inline-block">
            📊 {employees.length} employees | {documents.filter(d => d.document_type === 'contract').length} contracts | {employeesWithoutContracts.length} missing
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportAllDocuments}
            className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-medium hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg shadow-green-200 hover:shadow-xl hover:scale-105"
          >
            <FileSpreadsheet className="h-5 w-5" />
            <span>Export All</span>
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg font-medium hover:from-primary-700 hover:to-primary-800 transition-all duration-200 shadow-lg shadow-primary-200 hover:shadow-xl hover:scale-105"
          >
            <Plus className="h-5 w-5" />
            <span>{t.documents.addDocument}</span>
          </button>
          <button
            onClick={() => setShowBulkUploadModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg font-medium hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-lg shadow-purple-200 hover:shadow-xl hover:scale-105"
          >
            <Layers className="h-5 w-5" />
            <span>AI Bulk Upload</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.common.total} {t.documents.title}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(documents.length, language)}</p>
            </div>
            <FileText className="h-12 w-12 text-gray-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.common.active}</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{formatNumber(activeCount, language)}</p>
            </div>
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.common.expiringSoon}</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">{formatNumber(expiringSoonCount, language)}</p>
            </div>
            <AlertTriangle className="h-12 w-12 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.common.expired}</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{formatNumber(expiredCount, language)}</p>
            </div>
            <AlertTriangle className="h-12 w-12 text-red-600" />
          </div>
        </div>

        <div
          className={`rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-all duration-200 border-2 ${
            employeesWithoutContracts.length > 0
              ? 'bg-gradient-to-br from-orange-50 to-red-50 border-orange-200 hover:border-orange-400'
              : 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 hover:border-green-400'
          }`}
          onClick={() => setShowMissingContractsModal(true)}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${employeesWithoutContracts.length > 0 ? 'text-orange-700' : 'text-green-700'}`}>
                Missing Contracts
              </p>
              <p className={`text-2xl font-bold mt-1 ${employeesWithoutContracts.length > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                {formatNumber(employeesWithoutContracts.length, language)}
              </p>
              <p className={`text-xs mt-1 ${employeesWithoutContracts.length > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                {employeesWithoutContracts.length === 0 ? 'all have contracts' : 'employees'}
              </p>
            </div>
            {employeesWithoutContracts.length > 0 ? (
              <FileQuestion className="h-12 w-12 text-orange-600" />
            ) : (
              <CheckCircle className="h-12 w-12 text-green-600" />
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <Filter className="h-5 w-5 text-gray-500" />
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="flex-1 max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">All Employees</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.employee_number} - {emp.first_name_en} {emp.last_name_en}
                  </option>
                ))}
              </select>
              {selectedEmployeeId && (
                <>
                  <button
                    onClick={() => handleViewEmployeeDocuments(selectedEmployeeId)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                    <span>View</span>
                  </button>
                  <button
                    onClick={() => handlePrintEmployeeDocuments(selectedEmployeeId)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <Printer className="h-4 w-4" />
                    <span>Print</span>
                  </button>
                  <button
                    onClick={() => handleExportEmployeeDocuments(selectedEmployeeId)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    <span>Export</span>
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="flex space-x-2">
            {['all', 'active', 'expiring_soon', 'expired'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status as any)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filter === status
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? t.common.all : status === 'active' ? t.common.active : status === 'expiring_soon' ? t.common.expiringSoon : t.common.expired}
              </button>
            ))}
          </div>
        </div>

        <ScrollableTable maxHeight="calc(100vh - 400px)">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <SortableTableHeader
                  label={t.common.employee}
                  sortKey="employee.first_name_en"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label={t.documents.documentType}
                  sortKey="document_type"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label={t.documents.documentNumber}
                  sortKey="document_number"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label={t.documents.issueDate}
                  sortKey="issue_date"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label={t.documents.expiryDate}
                  sortKey="expiry_date"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label={t.common.status}
                  sortKey="status"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  AI Analysis
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    {t.messages.noResults}
                  </td>
                </tr>
              ) : (
                sortedData.map((document) => (
                  <tr key={document.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {document.employee.first_name_en} {document.employee.last_name_en}
                      </div>
                      <div className="text-sm text-gray-500">{document.employee.employee_number}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {document.document_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {document.document_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(document.issue_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {document.expiry_date ? new Date(document.expiry_date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        document.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : document.status === 'expiring_soon'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {document.status.split('_').join(' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {document.extraction_status === 'completed' ? (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                            <CheckCircle className="h-3 w-3" />
                            <span>{document.extraction_confidence}%</span>
                          </div>
                        </div>
                      ) : document.extraction_status === 'processing' ? (
                        <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>Processing</span>
                        </div>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                          Not analyzed
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {document.document_url && (
                          <button
                            onClick={() => handleViewDocument(document)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-xs font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200"
                          >
                            <Eye className="h-3 w-3" />
                            <span>View</span>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedDocument(document);
                            setShowAIAnalysisModal(true);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg text-xs font-medium hover:from-purple-700 hover:to-blue-700 transition-all duration-200"
                        >
                          <Brain className="h-3 w-3" />
                          <span>AI</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </ScrollableTable>
      </div>

      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">{t.documents.addDocument}</h2>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-600" />
                </button>
              </div>
            </div>

            <form onSubmit={handleUpload} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.common.employee} *
                </label>
                <select
                  required
                  value={formData.employee_id}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
                >
                  <option value="">Select employee...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name_en} {emp.last_name_en} ({emp.employee_number})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.documents.documentType} *
                </label>
                <select
                  required
                  value={formData.document_type}
                  onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
                >
                  <option value="iqama">Iqama</option>
                  <option value="passport">Passport</option>
                  <option value="contract">Contract</option>
                  <option value="certificate">Certificate</option>
                  <option value="visa">Visa</option>
                  <option value="medical">Medical</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.document_name}
                  onChange={(e) => setFormData({ ...formData, document_name: e.target.value })}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
                  placeholder="Enter document name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.documents.issueDate}
                  </label>
                  <input
                    type="date"
                    value={formData.issue_date}
                    onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.documents.expiryDate}
                  </label>
                  <input
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload File (Optional)
                </label>
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-400 hover:bg-primary-50 transition-all cursor-pointer"
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  {formData.file ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="h-6 w-6 text-primary-600" />
                      <span className="text-sm text-gray-700">{formData.file.name}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFormData({ ...formData, file: null });
                        }}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        <X className="h-4 w-4 text-gray-600" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">Click to upload document</p>
                      <p className="text-xs text-gray-500 mt-1">PDF, DOC, DOCX, JPG, PNG (max 10MB)</p>
                    </>
                  )}
                </div>
                <input
                  id="file-upload"
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && file.size <= 10 * 1024 * 1024) {
                      setFormData({ ...formData, file });
                    } else {
                      alert('File size must be less than 10MB');
                    }
                  }}
                  className="hidden"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg font-medium hover:from-primary-700 hover:to-primary-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-5 w-5" />
                      <span>Upload Document</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  disabled={uploading}
                  className="px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBulkUploadModal && (
        <div className="fixed inset-0 bg-gradient-to-br from-black/60 to-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h2 className="text-2xl font-bold text-gray-900">AI Bulk Document Upload</h2>
              <p className="text-gray-600 mt-1">Upload multiple documents with automatic employee and type detection</p>
            </div>

            <div className="p-6">
              <BulkDocumentUpload
                companyId={currentCompany!.id}
                onComplete={() => {
                  setShowBulkUploadModal(false);
                  refreshData();
                }}
                onCancel={() => setShowBulkUploadModal(false)}
              />
            </div>
          </div>
        </div>
      )}

      {showAIAnalysisModal && selectedDocument && (
        <div className="fixed inset-0 bg-gradient-to-br from-black/60 to-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">AI Document Analysis</h2>
                  <p className="text-gray-600 mt-1">
                    {selectedDocument.employee.first_name_en} {selectedDocument.employee.last_name_en} - {selectedDocument.document_type}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowAIAnalysisModal(false);
                    setSelectedDocument(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-600" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <DocumentAIAnalysis
                documentId={selectedDocument.id}
                documentType={selectedDocument.document_type}
                fileUrl={selectedDocument.document_url}
                onAnalysisComplete={() => {
                  refreshData();
                }}
              />
            </div>
          </div>
        </div>
      )}

      {showMissingContractsModal && (
        <div className="fixed inset-0 bg-gradient-to-br from-black/60 to-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                    <FileQuestion className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Employees Missing Contracts</h2>
                    <p className="text-gray-600 mt-1">
                      {employeesWithoutContracts.length} {employeesWithoutContracts.length === 1 ? 'employee' : 'employees'} without contracts
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowMissingContractsModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-600" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {employeesWithoutContracts.length === 0 ? (
                <div className="space-y-6">
                  <div className="text-center py-12">
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">All Set!</h3>
                    <p className="text-gray-600">All employees have contracts on file</p>
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-semibold text-blue-900 mb-3">Contract Coverage Summary</p>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-blue-600">{employees.length}</p>
                        <p className="text-xs text-blue-700">Total Employees</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-600">{employees.length - employeesWithoutContracts.length}</p>
                        <p className="text-xs text-green-700">With Contracts</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-orange-600">{employeesWithoutContracts.length}</p>
                        <p className="text-xs text-orange-700">Missing Contracts</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${employees.length > 0 ? ((employees.length - employeesWithoutContracts.length) / employees.length * 100).toFixed(1) : 0}%` }}
                        ></div>
                      </div>
                      <p className="text-center text-xs text-gray-600 mt-2">
                        {employees.length > 0 ? ((employees.length - employeesWithoutContracts.length) / employees.length * 100).toFixed(1) : 0}% Contract Coverage
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                    <p className="text-sm font-semibold text-blue-900 mb-3">Contract Coverage Summary</p>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-blue-600">{employees.length}</p>
                        <p className="text-xs text-blue-700">Total Employees</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-600">{employees.length - employeesWithoutContracts.length}</p>
                        <p className="text-xs text-green-700">With Contracts</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-orange-600">{employeesWithoutContracts.length}</p>
                        <p className="text-xs text-orange-700">Missing Contracts</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${((employees.length - employeesWithoutContracts.length) / employees.length * 100).toFixed(1)}%` }}
                        ></div>
                      </div>
                      <p className="text-center text-xs text-gray-600 mt-2">
                        {((employees.length - employeesWithoutContracts.length) / employees.length * 100).toFixed(1)}% Contract Coverage
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-lg mb-4">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-orange-600" />
                      <div>
                        <p className="text-sm font-semibold text-orange-900">Action Required</p>
                        <p className="text-xs text-orange-700">The following employees need contract documents uploaded</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-bold">
                      {employeesWithoutContracts.length}
                    </span>
                  </div>

                  <ScrollableTable maxHeight="500px">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Employee #
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name (English)
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name (Arabic)
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Position
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Department
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Hire Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {employeesWithoutContracts.map((employee) => (
                          <tr key={employee.id} className="hover:bg-orange-50 transition-colors">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-sm font-medium text-gray-900">{employee.employee_number}</span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-gray-400" />
                                <span className="text-sm font-medium text-gray-900">
                                  {employee.first_name_en} {employee.last_name_en}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-sm text-gray-700" dir="rtl">
                                {employee.first_name_ar} {employee.last_name_ar}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-sm text-gray-700">{employee.job_title_en || '-'}</span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-sm text-gray-700">-</span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-sm text-gray-700">
                                {employee.hire_date ? new Date(employee.hire_date).toLocaleDateString() : '-'}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                employee.employment_status === 'active'
                                  ? 'bg-green-100 text-green-800'
                                  : employee.employment_status === 'probation'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {employee.employment_status || 'active'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollableTable>

                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <FileText className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-blue-900 mb-2">Quick Actions</p>
                        <ul className="text-sm text-blue-700 space-y-1">
                          <li>• Use "Add Document" button to upload individual contracts</li>
                          <li>• Use "AI Bulk Upload" for multiple contracts at once</li>
                          <li>• Ensure all employment contracts are properly documented for compliance</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showEmployeeDocumentsModal && selectedEmployeeId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-white bg-opacity-20 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Employee Documents</h2>
                  <p className="text-blue-100 mt-1">
                    {(() => {
                      const emp = employees.find(e => e.id === selectedEmployeeId);
                      return emp ? `${emp.first_name_en} ${emp.last_name_en} (${emp.employee_number})` : '';
                    })()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePrintEmployeeDocuments(selectedEmployeeId)}
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                  title="Print"
                >
                  <Printer className="h-5 w-5 text-white" />
                </button>
                <button
                  onClick={() => handleExportEmployeeDocuments(selectedEmployeeId)}
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                  title="Export to Excel"
                >
                  <Download className="h-5 w-5 text-white" />
                </button>
                <button
                  onClick={() => {
                    setShowEmployeeDocumentsModal(false);
                    setSelectedEmployeeId('');
                  }}
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-white" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {(() => {
                const employeeDocs = getEmployeeDocuments(selectedEmployeeId);
                const emp = employees.find(e => e.id === selectedEmployeeId);

                if (!emp) return null;

                return (
                  <>
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                          <FileText className="h-8 w-8 text-blue-600" />
                          <div>
                            <p className="text-sm text-blue-600 font-medium">Total Documents</p>
                            <p className="text-2xl font-bold text-blue-900">{employeeDocs.length}</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-8 w-8 text-green-600" />
                          <div>
                            <p className="text-sm text-green-600 font-medium">Active</p>
                            <p className="text-2xl font-bold text-green-900">
                              {employeeDocs.filter(d => d.status === 'active').length}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="h-8 w-8 text-red-600" />
                          <div>
                            <p className="text-sm text-red-600 font-medium">Expired</p>
                            <p className="text-2xl font-bold text-red-900">
                              {employeeDocs.filter(d => d.status === 'expired').length}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {employeeDocs.length === 0 ? (
                      <div className="text-center py-12">
                        <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Documents Found</h3>
                        <p className="text-gray-600">This employee has no documents uploaded yet.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Document Type
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Document Name
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Issue Date
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Expiry Date
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {employeeDocs.map((doc) => (
                              <tr key={doc.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {doc.document_type.toUpperCase()}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-sm text-gray-900">{doc.document_name || '-'}</span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                  {doc.issue_date ? new Date(doc.issue_date).toLocaleDateString() : '-'}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                  {doc.expiry_date ? new Date(doc.expiry_date).toLocaleDateString() : '-'}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    doc.status === 'active'
                                      ? 'bg-green-100 text-green-800'
                                      : doc.status === 'expiring_soon'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    {doc.status.replace('_', ' ').toUpperCase()}
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  {doc.document_url && (
                                    <button
                                      onClick={() => handleViewDocument(doc)}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
                                    >
                                      <Eye className="h-3 w-3" />
                                      <span>View</span>
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
