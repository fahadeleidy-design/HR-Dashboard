import { useState, useEffect } from 'react';
import {
  Lightbulb, RefreshCw, Check, X, Users, DollarSign,
  TrendingUp, GraduationCap, Award, Loader2, Filter,
  ChevronDown, ChevronRight, AlertTriangle, Star
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

interface Recommendation {
  id: string;
  recommendation_type: string;
  target_entity_type: string;
  target_entity_id: string | null;
  title: string;
  description: string;
  confidence_score: number;
  reasoning: any[];
  priority: string;
  status: string;
  created_at: string;
}

const TYPE_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  job: { icon: Users, color: 'bg-blue-100 text-blue-600', label: 'Job Match' },
  learning: { icon: GraduationCap, color: 'bg-emerald-100 text-emerald-600', label: 'Learning' },
  career: { icon: TrendingUp, color: 'bg-amber-100 text-amber-600', label: 'Career Path' },
  compensation: { icon: DollarSign, color: 'bg-teal-100 text-teal-600', label: 'Compensation' },
  succession: { icon: Award, color: 'bg-rose-100 text-rose-600', label: 'Succession' },
  team_composition: { icon: Users, color: 'bg-slate-100 text-slate-600', label: 'Team' },
};

const PRIORITY_CONFIG: Record<string, { color: string; badge: string }> = {
  critical: { color: 'border-red-200 bg-red-50', badge: 'bg-red-100 text-red-700' },
  high: { color: 'border-amber-200 bg-amber-50', badge: 'bg-amber-100 text-amber-700' },
  medium: { color: 'border-blue-200 bg-blue-50', badge: 'bg-blue-100 text-blue-700' },
  low: { color: 'border-gray-200 bg-gray-50', badge: 'bg-gray-100 text-gray-600' },
};

export function AIRecommendations() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('pending');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { currentCompany } = useCompany();
  const { user } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    if (currentCompany?.id) loadRecommendations();
  }, [currentCompany, filterType, filterStatus]);

  async function loadRecommendations() {
    if (!currentCompany?.id) return;
    setLoading(true);
    try {
      let query = supabase
        .from('ai_recommendations')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('priority', { ascending: true })
        .order('confidence_score', { ascending: false })
        .limit(50);

      if (filterType !== 'all') {
        query = query.eq('recommendation_type', filterType);
      }
      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRecommendations(data || []);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  async function generateRecommendations(type: string) {
    if (!currentCompany?.id) return;
    setGenerating(true);
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
          action: 'generate_recommendations',
          company_id: currentCompany.id,
          payload: { recommendation_type: type },
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      showToast(`Generated ${data.count} recommendations`, 'success');
      loadRecommendations();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setGenerating(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    try {
      await supabase.from('ai_recommendations').update({
        status,
        actioned_by: user?.id,
        actioned_at: new Date().toISOString(),
      }).eq('id', id);
      showToast(`Recommendation ${status}`, 'success');
      loadRecommendations();
    } catch {
    }
  }

  const stats = {
    total: recommendations.length,
    critical: recommendations.filter(r => r.priority === 'critical').length,
    high: recommendations.filter(r => r.priority === 'high').length,
    avgConfidence: recommendations.length > 0
      ? Math.round(recommendations.reduce((s, r) => s + r.confidence_score, 0) / recommendations.length)
      : 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Intelligent Recommendations</h2>
          <p className="text-sm text-gray-500 mt-0.5">AI-generated suggestions for workforce optimization</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => generateRecommendations('all')}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm disabled:opacity-50"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Generate
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-sm text-gray-500 mb-1">Active Recommendations</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white border border-red-200 rounded-xl p-4">
          <div className="text-sm text-gray-500 mb-1">Critical Priority</div>
          <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
        </div>
        <div className="bg-white border border-amber-200 rounded-xl p-4">
          <div className="text-sm text-gray-500 mb-1">High Priority</div>
          <div className="text-2xl font-bold text-amber-600">{stats.high}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-sm text-gray-500 mb-1">Avg Confidence</div>
          <div className="text-2xl font-bold text-gray-900">{stats.avgConfidence}%</div>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">Type:</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:ring-2 focus:ring-slate-200"
          >
            <option value="all">All Types</option>
            <option value="compensation">Compensation</option>
            <option value="career">Career Path</option>
            <option value="learning">Learning</option>
            <option value="job">Job Match</option>
            <option value="succession">Succession</option>
            <option value="team_composition">Team Composition</option>
          </select>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-gray-500">Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:ring-2 focus:ring-slate-200"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="dismissed">Dismissed</option>
            <option value="implemented">Implemented</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : recommendations.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <Lightbulb className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-gray-600 font-medium mb-1">No recommendations found</h3>
          <p className="text-sm text-gray-400 mb-4">Generate AI recommendations to get workforce insights</p>
          <button
            onClick={() => generateRecommendations('all')}
            disabled={generating}
            className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 text-sm"
          >
            Generate Recommendations
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {recommendations.map(rec => {
            const typeConfig = TYPE_CONFIG[rec.recommendation_type] || TYPE_CONFIG.job;
            const priorityConfig = PRIORITY_CONFIG[rec.priority] || PRIORITY_CONFIG.medium;
            const Icon = typeConfig.icon;
            const isExpanded = expandedId === rec.id;

            return (
              <div
                key={rec.id}
                className={`bg-white border rounded-xl overflow-hidden transition-all ${
                  rec.status === 'pending' ? 'border-gray-200' : 'border-gray-100 opacity-75'
                }`}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${typeConfig.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 text-sm">{rec.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${priorityConfig.badge}`}>
                          {rec.priority}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${typeConfig.color}`}>
                          {typeConfig.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1 leading-relaxed">{rec.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          {rec.confidence_score}% confidence
                        </span>
                        <span>{new Date(rec.created_at).toLocaleDateString()}</span>
                        <span className="capitalize">{rec.target_entity_type}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {rec.status === 'pending' && (
                        <>
                          <button
                            onClick={() => updateStatus(rec.id, 'accepted')}
                            className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Accept"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => updateStatus(rec.id, 'dismissed')}
                            className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                            title="Dismiss"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                        className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {isExpanded && rec.reasoning && rec.reasoning.length > 0 && (
                  <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
                    <h4 className="text-xs font-medium text-gray-500 mb-2 uppercase">Contributing Factors</h4>
                    <div className="space-y-1.5">
                      {(Array.isArray(rec.reasoning) ? rec.reasoning : []).map((factor: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          <span className="text-gray-700">
                            {typeof factor === 'string' ? factor : (
                              factor.employee
                                ? `${factor.employee}: ${factor.gap_percentage}% below average (current: ${factor.current_salary?.toLocaleString()} SAR)`
                                : factor.detail || factor.factor || JSON.stringify(factor)
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
