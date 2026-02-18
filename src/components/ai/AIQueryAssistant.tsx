import { useState, useEffect, useRef } from 'react';
import {
  MessageSquare, Send, ThumbsUp, ThumbsDown, Clock,
  Sparkles, HelpCircle, BarChart3, Users, DollarSign,
  Loader2, ChevronRight, History, Trash2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

interface QueryResult {
  intent: string;
  summary: string;
  data: any[];
  confidence: number;
  response_time_ms: number;
}

interface QueryHistoryItem {
  id: string;
  query_text: string;
  result_summary: string;
  confidence_score: number;
  feedback_rating: number | null;
  created_at: string;
}

const SUGGESTED_QUERIES = [
  { icon: Users, text: "How many employees do we have?", category: "Headcount" },
  { icon: DollarSign, text: "What is the average salary by department?", category: "Compensation" },
  { icon: BarChart3, text: "Show me the headcount breakdown by department", category: "Analytics" },
  { icon: Users, text: "Who are our most recent hires?", category: "Hiring" },
  { icon: HelpCircle, text: "What is our diversity breakdown?", category: "Diversity" },
  { icon: Clock, text: "Show pending approval requests", category: "Workflow" },
];

export function AIQueryAssistant() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [history, setHistory] = useState<QueryHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { currentCompany } = useCompany();
  const { user } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    if (currentCompany?.id) loadHistory();
  }, [currentCompany]);

  async function loadHistory() {
    if (!currentCompany?.id) return;
    setLoadingHistory(true);
    try {
      const { data } = await supabase
        .from('ai_nl_queries')
        .select('id, query_text, result_summary, confidence_score, feedback_rating, created_at')
        .eq('company_id', currentCompany.id)
        .order('created_at', { ascending: false })
        .limit(20);
      setHistory(data || []);
    } catch {
    } finally {
      setLoadingHistory(false);
    }
  }

  async function handleSubmit(queryText?: string) {
    const q = queryText || query;
    if (!q.trim() || !currentCompany?.id) return;

    setLoading(true);
    setResult(null);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-hr-assistant`;
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'nl_query',
          company_id: currentCompany.id,
          payload: { query_text: q },
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setResult(data);
      setQuery('');
      loadHistory();
    } catch (err: any) {
      showToast(err.message || 'Failed to process query', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleFeedback(queryId: string, rating: number) {
    try {
      await supabase
        .from('ai_nl_queries')
        .update({ feedback_rating: rating })
        .eq('id', queryId);
      loadHistory();
      showToast('Feedback recorded', 'success');
    } catch {
    }
  }

  function getConfidenceColor(score: number) {
    if (score >= 85) return 'text-emerald-600 bg-emerald-50';
    if (score >= 70) return 'text-blue-600 bg-blue-50';
    if (score >= 50) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">AI HR Assistant</h2>
            <p className="text-sm text-slate-300">Ask questions about your workforce in natural language</p>
          </div>
        </div>

        <div className="relative mt-4">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="Ask a question... e.g., 'How many employees are in Engineering?'"
            className="w-full bg-white/10 border border-white/20 rounded-xl pl-4 pr-12 py-3.5 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-transparent"
            disabled={loading}
          />
          <button
            onClick={() => handleSubmit()}
            disabled={loading || !query.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-cyan-500 hover:bg-cyan-400 rounded-lg transition-colors disabled:opacity-40"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <History className="w-3.5 h-3.5" />
            Query History ({history.length})
          </button>
        </div>
      </div>

      {!result && !loading && !showHistory && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-3">Suggested Questions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {SUGGESTED_QUERIES.map((sq, i) => {
              const Icon = sq.icon;
              return (
                <button
                  key={i}
                  onClick={() => {
                    setQuery(sq.text);
                    handleSubmit(sq.text);
                  }}
                  className="flex items-center gap-3 p-3.5 bg-white border border-gray-200 rounded-xl hover:border-slate-400 hover:shadow-sm transition-all text-left group"
                >
                  <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center group-hover:bg-slate-200 transition-colors">
                    <Icon className="w-4 h-4 text-slate-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">{sq.text}</p>
                    <p className="text-xs text-gray-400">{sq.category}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {loading && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-slate-500 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Analyzing your question...</p>
          <p className="text-sm text-gray-400 mt-1">Processing HR data to find the answer</p>
        </div>
      )}

      {result && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-500" />
                <h3 className="font-semibold text-gray-900">AI Response</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getConfidenceColor(result.confidence)}`}>
                  {result.confidence.toFixed(0)}% confidence
                </span>
                <span className="text-xs text-gray-400">
                  {result.response_time_ms}ms
                </span>
              </div>
            </div>
            <p className="text-gray-700 mt-3 leading-relaxed">{result.summary}</p>
          </div>

          {result.data && result.data.length > 0 && (
            <div className="p-5">
              <h4 className="text-sm font-medium text-gray-500 mb-3">Data</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      {Object.keys(result.data[0]).filter(k => typeof result.data[0][k] !== 'object').map(key => (
                        <th key={key} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          {key.replace(/_/g, ' ')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {result.data.slice(0, 15).map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        {Object.entries(row).filter(([, v]) => typeof v !== 'object').map(([key, value]) => (
                          <td key={key} className="px-3 py-2 text-gray-700">
                            {typeof value === 'number'
                              ? Number.isInteger(value) ? value.toLocaleString() : (value as number).toFixed(1)
                              : String(value)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {result.data.length > 15 && (
                  <p className="text-xs text-gray-400 mt-2 px-3">Showing 15 of {result.data.length} results</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {showHistory && (
        <div className="bg-white border border-gray-200 rounded-xl">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <History className="w-4 h-4" />
              Query History
            </h3>
            <button onClick={() => setShowHistory(false)} className="text-xs text-gray-400 hover:text-gray-600">
              Close
            </button>
          </div>
          {loadingHistory ? (
            <div className="p-6 text-center">
              <Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" />
            </div>
          ) : history.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">No queries yet</div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
              {history.map(item => (
                <div key={item.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => {
                          setQuery(item.query_text);
                          setShowHistory(false);
                          handleSubmit(item.query_text);
                        }}
                        className="text-sm font-medium text-gray-800 hover:text-slate-600 text-left"
                      >
                        {item.query_text}
                      </button>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.result_summary}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getConfidenceColor(item.confidence_score)}`}>
                        {item.confidence_score?.toFixed(0)}%
                      </span>
                      {item.feedback_rating === null && (
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => handleFeedback(item.id, 5)}
                            className="p-1 hover:bg-green-50 rounded text-gray-300 hover:text-green-500"
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleFeedback(item.id, 1)}
                            className="p-1 hover:bg-red-50 rounded text-gray-300 hover:text-red-500"
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(item.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
