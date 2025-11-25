import { useState } from 'react';
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
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError(null);

    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const file = new File([blob], 'document.pdf', { type: blob.type });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentId', documentId);
      formData.append('documentType', documentType);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const result = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/comprehensive-document-analysis`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: formData
        }
      );

      const resultData = await result.json();

      if (resultData.success && resultData.data) {
        setAnalysisData(resultData.data);
        setExpanded(true);
        if (onAnalysisComplete) onAnalysisComplete();
      } else {
        throw new Error(resultData.error || 'Analysis failed');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
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
            <div>
              <h3 className="text-sm font-bold text-gray-900">AI Document Analysis</h3>
              <p className="text-xs text-gray-600">Comprehensive data extraction & insights</p>
            </div>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg text-sm font-medium hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {analyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                <span>Analyze Document</span>
              </>
            )}
          </button>
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
