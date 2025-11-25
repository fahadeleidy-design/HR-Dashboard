import { useState, useEffect } from 'react';
import { Brain, Loader2, AlertTriangle, CheckCircle, Info, Sparkles, Calendar, FileText, User, CreditCard, Zap, TrendingUp, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface DocumentAIAnalysisProps {
  documentId: string;
  documentType: string;
  fileUrl: string;
  onAnalysisComplete?: () => void;
}

interface AnalysisData {
  extractedData: Record<string, any>;
  aiAnalysis: {
    documentType: string;
    confidence: number;
    completeness: number;
    qualityScore: number;
    dataPoints: number;
    warnings: string[];
    recommendations: string[];
    keyInsights: string[];
    missingFields: string[];
  };
  metadata: {
    fileSize: number;
    fileType: string;
    pageCount: number;
    language: string;
    processingTime: number;
  };
}

export function DocumentAIAnalysis({ documentId, documentType, fileUrl, onAnalysisComplete }: DocumentAIAnalysisProps) {
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    loadExistingAnalysis();
  }, [documentId]);

  const loadExistingAnalysis = async () => {
    try {
      const { data: doc, error: docError } = await supabase
        .from('documents')
        .select('extraction_status, extraction_confidence, ai_analysis, extracted_data')
        .eq('id', documentId)
        .single();

      if (docError || !doc) return;

      if (doc.extraction_status === 'completed' && doc.ai_analysis) {
        setAnalysisData({
          extractedData: doc.extracted_data || {},
          aiAnalysis: doc.ai_analysis,
          metadata: {
            fileSize: 0,
            fileType: 'application/pdf',
            pageCount: 1,
            language: 'English',
            processingTime: 0,
          },
        });
        setExpanded(true);
      }
    } catch (err) {
      console.error('Failed to load existing analysis:', err);
    }
  };

  const generateAnalysis = (doc: any): AnalysisData => {
    const warnings: string[] = [];
    const recommendations: string[] = [];
    const keyInsights: string[] = [];
    const missingFields: string[] = [];

    const extractedData: Record<string, any> = {
      documentNumber: doc.document_number,
      holderName: doc.holder_name,
      holderId: doc.holder_id,
      issuer: doc.issuer,
      issueDate: doc.issue_date,
      expiryDate: doc.expiry_date,
      amount: doc.amount,
      documentType: doc.document_type,
    };

    let dataPoints = Object.values(extractedData).filter(v => v != null).length;

    if (doc.expiry_date) {
      const expiryDate = new Date(doc.expiry_date);
      const today = new Date();
      const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilExpiry < 0) {
        warnings.push('Document has expired - immediate action required');
        recommendations.push('Renew this document immediately to maintain compliance');
      } else if (daysUntilExpiry < 30) {
        warnings.push(`Document expires in ${daysUntilExpiry} days`);
        recommendations.push('Schedule renewal appointment within the next week');
      } else if (daysUntilExpiry < 90) {
        warnings.push(`Document expires in ${daysUntilExpiry} days`);
        recommendations.push('Begin renewal process to avoid last-minute issues');
      } else {
        keyInsights.push(`Document is valid for ${daysUntilExpiry} more days`);
      }
    } else {
      missingFields.push('Expiry Date');
      warnings.push('No expiry date found - cannot track document validity');
    }

    if (!doc.document_number) missingFields.push('Document Number');
    if (!doc.holder_name) missingFields.push('Holder Name');
    if (!doc.issue_date) missingFields.push('Issue Date');

    if (doc.employee) {
      keyInsights.push(`Employee: ${doc.employee.first_name_en} ${doc.employee.last_name_en}`);
      keyInsights.push(`Employee Number: ${doc.employee.employee_number}`);
    }

    if (doc.document_type === 'iqama') {
      keyInsights.push('Critical document: Iqama is required for legal residency in Saudi Arabia');
      recommendations.push('Keep a digital copy accessible at all times');
    } else if (doc.document_type === 'passport') {
      keyInsights.push('Essential travel document - ensure it remains valid');
      recommendations.push('Passport should be valid for at least 6 months for international travel');
    } else if (doc.document_type === 'contract') {
      keyInsights.push('Employment contract - defines rights and obligations');
      if (doc.amount) {
        keyInsights.push(`Contract value: SAR ${doc.amount.toLocaleString()}`);
      }
    }

    const completeness = Math.min(100, Math.round((dataPoints / 8) * 100));
    const confidence = Math.min(100, dataPoints * 12);
    const qualityScore = Math.round((completeness + confidence) / 2);

    return {
      extractedData,
      aiAnalysis: {
        documentType: doc.document_type,
        confidence,
        completeness,
        qualityScore,
        dataPoints,
        warnings,
        recommendations,
        keyInsights,
        missingFields,
      },
      metadata: {
        fileSize: 0,
        fileType: 'application/pdf',
        pageCount: 1,
        language: 'English',
        processingTime: 0,
      },
    };
  };

  const handleAnalyze = async () => {
    setError(null);
    setShowSuccess(false);
    setIsAnalyzing(true);

    try {
      const { data: doc } = await supabase
        .from('documents')
        .select('file_path')
        .eq('id', documentId)
        .single();

      if (!doc?.file_path) throw new Error('Document file path not found');

      const { data: fileData, error: downloadError } = await supabase.storage
        .from('documents')
        .download(doc.file_path);

      if (downloadError) throw downloadError;

      const file = new File([fileData], 'document.pdf', { type: fileData.type });

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentId', documentId);
      formData.append('documentType', documentType);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const analysisResponse = await fetch(
        `${supabaseUrl}/functions/v1/comprehensive-document-analysis`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      const result = await analysisResponse.json();

      if (!result.success) {
        throw new Error(result.error || 'Analysis failed');
      }

      setAnalysisData(result.data);
      setExpanded(true);
      setShowSuccess(true);

      setTimeout(() => setShowSuccess(false), 2000);

      if (onAnalysisComplete) onAnalysisComplete();

    } catch (err: any) {
      console.error('Analysis error:', err);
      setError(err.message || 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const formatFieldName = (key: string) => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-900">AI Document Analysis</h3>
                {analysisData && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                    <CheckCircle className="h-3 w-3" />
                    Analyzed
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-600">Comprehensive data extraction & insights</p>
            </div>
          </div>
          <div className="relative">
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg text-sm font-medium hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-sm hover:shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : analysisData ? (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Re-Analyze</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  <span>Analyze</span>
                </>
              )}
            </button>
            {showSuccess && (
              <div className="absolute -top-1 -right-1 animate-bounce">
                <CheckCircle className="h-6 w-6 text-green-500 fill-green-100" />
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-b border-red-200">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {analysisData && (
        <div className="divide-y divide-gray-200">
          <div className="p-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className={`inline-flex items-center justify-center h-16 w-16 rounded-full ${getScoreColor(analysisData.aiAnalysis.confidence)} mb-2`}>
                  <span className="text-2xl font-bold">{analysisData.aiAnalysis.confidence}%</span>
                </div>
                <p className="text-xs font-medium text-gray-600">Confidence</p>
              </div>
              <div className="text-center">
                <div className={`inline-flex items-center justify-center h-16 w-16 rounded-full ${getScoreColor(analysisData.aiAnalysis.completeness)} mb-2`}>
                  <span className="text-2xl font-bold">{analysisData.aiAnalysis.completeness}%</span>
                </div>
                <p className="text-xs font-medium text-gray-600">Completeness</p>
              </div>
              <div className="text-center">
                <div className={`inline-flex items-center justify-center h-16 w-16 rounded-full ${getScoreColor(analysisData.aiAnalysis.qualityScore)} mb-2`}>
                  <span className="text-2xl font-bold">{analysisData.aiAnalysis.qualityScore}%</span>
                </div>
                <p className="text-xs font-medium text-gray-600">Quality</p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 text-blue-600 mb-2">
                  <span className="text-2xl font-bold">{analysisData.aiAnalysis.dataPoints}</span>
                </div>
                <p className="text-xs font-medium text-gray-600">Data Points</p>
              </div>
            </div>
          </div>

          {(analysisData.aiAnalysis.warnings.length > 0 || analysisData.aiAnalysis.recommendations.length > 0) && (
            <div className="p-4 space-y-3">
              {analysisData.aiAnalysis.warnings.length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-red-900 mb-1">Warnings</p>
                      <ul className="space-y-1">
                        {analysisData.aiAnalysis.warnings.map((warning, idx) => (
                          <li key={idx} className="text-xs text-red-700">• {warning}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {analysisData.aiAnalysis.recommendations.length > 0 && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-blue-900 mb-1">Recommendations</p>
                      <ul className="space-y-1">
                        {analysisData.aiAnalysis.recommendations.map((rec, idx) => (
                          <li key={idx} className="text-xs text-blue-700">• {rec}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {analysisData.aiAnalysis.keyInsights.length > 0 && (
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-purple-600" />
                <h4 className="text-sm font-semibold text-gray-900">Key Insights</h4>
              </div>
              <div className="space-y-2">
                {analysisData.aiAnalysis.keyInsights.map((insight, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2 bg-purple-50 rounded-lg">
                    <TrendingUp className="h-3 w-3 text-purple-600 flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-purple-900">{insight}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-4">
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full flex items-center justify-between text-sm font-semibold text-gray-900 hover:text-purple-600 transition-colors"
            >
              <span>Extracted Data ({Object.keys(analysisData.extractedData).filter(k => analysisData.extractedData[k]).length} fields)</span>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {expanded && (
              <div className="mt-4 space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(analysisData.extractedData)
                    .filter(([_, value]) => value !== undefined && value !== null && value !== '')
                    .map(([key, value]) => (
                      <div key={key} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-xs font-medium text-gray-600 mb-1">{formatFieldName(key)}</p>
                        <p className="text-sm text-gray-900 font-medium break-words">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </p>
                      </div>
                    ))}
                </div>

                {analysisData.aiAnalysis.missingFields.length > 0 && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-xs font-semibold text-yellow-900 mb-2">Missing Fields</p>
                    <div className="flex flex-wrap gap-2">
                      {analysisData.aiAnalysis.missingFields.map((field, idx) => (
                        <span key={idx} className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                          {field}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-4 bg-gray-50">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-xs text-gray-600 mb-1">File Size</p>
                <p className="text-sm font-medium text-gray-900">{(analysisData.metadata.fileSize / 1024).toFixed(2)} KB</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Pages</p>
                <p className="text-sm font-medium text-gray-900">{analysisData.metadata.pageCount}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Language</p>
                <p className="text-sm font-medium text-gray-900">{analysisData.metadata.language}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Processing</p>
                <p className="text-sm font-medium text-gray-900">{(analysisData.metadata.processingTime / 1000).toFixed(2)}s</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
