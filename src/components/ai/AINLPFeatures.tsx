import { useState, useEffect } from 'react';
import {
  FileText, Upload, Sparkles, Loader2, Copy, Check,
  Briefcase, MessageSquare, Star, Download, Eye, RefreshCw,
  ChevronDown, ChevronRight, Search
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';

type NLPView = 'resume' | 'job_description' | 'review_analysis';

interface ResumeResult {
  candidate_name: string;
  candidate_email: string | null;
  skills_found: string[];
  experience_years: number;
  education_level: string;
  overall_score: number;
  strengths: string[];
  gaps: string[];
}

interface JDResult {
  generated_text: string;
  word_count: number;
  quality_score: number;
  sections: string[];
}

interface ReviewAnalysis {
  overall_sentiment: string;
  sentiment_score: number;
  positive_indicators: string[];
  negative_indicators: string[];
  themes: string[];
  word_count: number;
  summary: string;
  recommendations: string[];
}

export function AINLPFeatures() {
  const [activeView, setActiveView] = useState<NLPView>('resume');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const [resumeText, setResumeText] = useState('');
  const [resumeResult, setResumeResult] = useState<ResumeResult | null>(null);
  const [pastResumes, setPastResumes] = useState<any[]>([]);
  const [loadingResumes, setLoadingResumes] = useState(false);

  const [jdTitle, setJdTitle] = useState('');
  const [jdDepartment, setJdDepartment] = useState('');
  const [jdLevel, setJdLevel] = useState('mid');
  const [jdResult, setJdResult] = useState<JDResult | null>(null);
  const [pastJDs, setPastJDs] = useState<any[]>([]);

  const [reviewText, setReviewText] = useState('');
  const [reviewResult, setReviewResult] = useState<ReviewAnalysis | null>(null);

  const { currentCompany } = useCompany();
  const { showToast } = useToast();

  useEffect(() => {
    if (currentCompany?.id) {
      loadPastResumes();
      loadPastJDs();
    }
  }, [currentCompany]);

  async function loadPastResumes() {
    if (!currentCompany?.id) return;
    setLoadingResumes(true);
    try {
      const { data } = await supabase
        .from('ai_resume_analyses')
        .select('id, candidate_name, candidate_email, overall_score, skills_found, experience_years, education_level, created_at')
        .eq('company_id', currentCompany.id)
        .order('created_at', { ascending: false })
        .limit(10);
      setPastResumes(data || []);
    } catch {
    } finally {
      setLoadingResumes(false);
    }
  }

  async function loadPastJDs() {
    if (!currentCompany?.id) return;
    try {
      const { data } = await supabase
        .from('ai_generated_content')
        .select('id, title, content_type, quality_score, word_count, status, created_at')
        .eq('company_id', currentCompany.id)
        .eq('content_type', 'job_description')
        .order('created_at', { ascending: false })
        .limit(10);
      setPastJDs(data || []);
    } catch {
    }
  }

  async function callAI(action: string, payload: Record<string, any>) {
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-hr-assistant`;
    const { data: { session } } = await supabase.auth.getSession();

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action,
        company_id: currentCompany!.id,
        payload,
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data;
  }

  async function parseResume() {
    if (!resumeText.trim() || !currentCompany?.id) return;
    setLoading(true);
    try {
      const data = await callAI('parse_resume', { resume_text: resumeText });
      setResumeResult(data);
      loadPastResumes();
      showToast('Resume parsed successfully', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function generateJD() {
    if (!jdTitle.trim() || !currentCompany?.id) return;
    setLoading(true);
    try {
      const data = await callAI('generate_content', {
        content_type: 'job_description',
        title: jdTitle,
        department: jdDepartment,
        level: jdLevel,
      });
      setJdResult(data);
      loadPastJDs();
      showToast('Job description generated', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function analyzeReview() {
    if (!reviewText.trim() || !currentCompany?.id) return;
    setLoading(true);
    try {
      const data = await callAI('analyze_review', { review_text: reviewText });
      setReviewResult(data);
      showToast('Review analyzed', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function getScoreColor(score: number) {
    if (score >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (score >= 60) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 40) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-red-600 bg-red-50 border-red-200';
  }

  function getSentimentColor(sentiment: string) {
    if (sentiment.includes('Very Positive')) return 'text-emerald-600 bg-emerald-50';
    if (sentiment.includes('Positive')) return 'text-emerald-500 bg-emerald-50';
    if (sentiment.includes('Neutral')) return 'text-gray-600 bg-gray-50';
    if (sentiment.includes('Very Negative')) return 'text-red-600 bg-red-50';
    return 'text-amber-600 bg-amber-50';
  }

  const views = [
    { id: 'resume' as const, label: 'Resume Parser', icon: Upload },
    { id: 'job_description' as const, label: 'JD Generator', icon: FileText },
    { id: 'review_analysis' as const, label: 'Review Analysis', icon: MessageSquare },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Natural Language Processing</h2>
        <p className="text-sm text-gray-500 mt-0.5">AI-powered text analysis, generation, and extraction</p>
      </div>

      <div className="flex gap-2">
        {views.map(view => {
          const Icon = view.icon;
          return (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeView === view.id
                  ? 'bg-slate-700 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {view.label}
            </button>
          );
        })}
      </div>

      {activeView === 'resume' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Paste Resume Text</h3>
              <textarea
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder="Paste resume/CV text here...&#10;&#10;Example:&#10;John Smith&#10;john@email.com&#10;+966 50 123 4567&#10;&#10;5 years of experience in software engineering...&#10;Skills: JavaScript, React, Python, AWS..."
                className="w-full h-64 border border-gray-200 rounded-lg p-3 text-sm resize-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400"
              />
              <button
                onClick={parseResume}
                disabled={loading || !resumeText.trim()}
                className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:opacity-50 text-sm"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Parse Resume
              </button>
            </div>

            {pastResumes.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="font-semibold text-gray-900 mb-3">Recent Analyses</h3>
                <div className="space-y-2">
                  {pastResumes.map(r => (
                    <div key={r.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                      <div>
                        <span className="text-sm font-medium text-gray-800">{r.candidate_name}</span>
                        <span className="text-xs text-gray-400 ml-2">{r.experience_years}yr exp</span>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${getScoreColor(r.overall_score)}`}>
                        {r.overall_score}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {resumeResult && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{resumeResult.candidate_name}</h3>
                    {resumeResult.candidate_email && (
                      <p className="text-sm text-gray-500">{resumeResult.candidate_email}</p>
                    )}
                  </div>
                  <div className={`text-center px-4 py-2 rounded-xl border ${getScoreColor(resumeResult.overall_score)}`}>
                    <div className="text-2xl font-bold">{resumeResult.overall_score}</div>
                    <div className="text-xs">Overall Score</div>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Experience</div>
                    <div className="text-lg font-semibold text-gray-900">{resumeResult.experience_years} years</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Education</div>
                    <div className="text-lg font-semibold text-gray-900">{resumeResult.education_level}</div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Skills Detected ({resumeResult.skills_found.length})</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {resumeResult.skills_found.map((skill, i) => (
                      <span key={i} className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full">{skill}</span>
                    ))}
                  </div>
                </div>

                {resumeResult.strengths.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-emerald-700 mb-2">Strengths</h4>
                    {resumeResult.strengths.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        {s}
                      </div>
                    ))}
                  </div>
                )}

                {resumeResult.gaps.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-amber-700 mb-2">Gaps</h4>
                    {resumeResult.gaps.map((g, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                        <ChevronRight className="w-3.5 h-3.5 text-amber-500" />
                        {g}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeView === 'job_description' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Generate Job Description</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Job Title</label>
                  <input
                    type="text"
                    value={jdTitle}
                    onChange={(e) => setJdTitle(e.target.value)}
                    placeholder="e.g., Senior Software Engineer"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-200"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Department</label>
                  <input
                    type="text"
                    value={jdDepartment}
                    onChange={(e) => setJdDepartment(e.target.value)}
                    placeholder="e.g., Engineering"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-200"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Level</label>
                  <select
                    value={jdLevel}
                    onChange={(e) => setJdLevel(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-200"
                  >
                    <option value="junior">Junior</option>
                    <option value="mid">Mid-Level</option>
                    <option value="senior">Senior</option>
                    <option value="lead">Lead</option>
                    <option value="director">Director</option>
                  </select>
                </div>
                <button
                  onClick={generateJD}
                  disabled={loading || !jdTitle.trim()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:opacity-50 text-sm"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Generate Job Description
                </button>
              </div>
            </div>

            {pastJDs.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="font-semibold text-gray-900 mb-3">Recent Generations</h3>
                <div className="space-y-2">
                  {pastJDs.map(jd => (
                    <div key={jd.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                      <span className="text-sm font-medium text-gray-800">{jd.title || 'Untitled'}</span>
                      <span className="text-xs text-gray-400">{jd.word_count} words</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {jdResult && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">Generated Job Description</h3>
                  <span className="text-xs text-gray-400">{jdResult.word_count} words</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${getScoreColor(jdResult.quality_score)}`}>
                    Quality: {jdResult.quality_score}%
                  </span>
                  <button
                    onClick={() => copyToClipboard(jdResult.generated_text)}
                    className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="p-5 max-h-[600px] overflow-y-auto">
                <div className="prose prose-sm max-w-none">
                  {jdResult.generated_text.split('\n').map((line, i) => {
                    if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-bold text-gray-900 mt-4 mb-2">{line.replace('## ', '')}</h2>;
                    if (line.startsWith('### ')) return <h3 key={i} className="text-base font-semibold text-gray-800 mt-3 mb-1.5">{line.replace('### ', '')}</h3>;
                    if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-semibold text-gray-700">{line.replace(/\*\*/g, '')}</p>;
                    if (line.startsWith('- ')) return <li key={i} className="text-gray-700 ml-4">{line.replace('- ', '')}</li>;
                    if (line.trim() === '') return <br key={i} />;
                    return <p key={i} className="text-gray-700">{line}</p>;
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeView === 'review_analysis' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Analyze Performance Review</h3>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Paste performance review text here...&#10;&#10;Example:&#10;John has shown excellent leadership skills this quarter. His communication with the team has been outstanding, and he consistently meets deadlines. However, he needs improvement in documentation and could be more proactive in mentoring junior team members."
              className="w-full h-64 border border-gray-200 rounded-lg p-3 text-sm resize-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400"
            />
            <button
              onClick={analyzeReview}
              disabled={loading || !reviewText.trim()}
              className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:opacity-50 text-sm"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Analyze Review
            </button>
          </div>

          {reviewResult && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="p-5 border-b border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Analysis Results</h3>
                  <span className={`text-sm px-3 py-1 rounded-full font-medium ${getSentimentColor(reviewResult.overall_sentiment)}`}>
                    {reviewResult.overall_sentiment}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-500 mb-1">Sentiment Score</div>
                    <div className={`text-xl font-bold ${reviewResult.sentiment_score > 0 ? 'text-emerald-600' : reviewResult.sentiment_score < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                      {reviewResult.sentiment_score > 0 ? '+' : ''}{reviewResult.sentiment_score}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-500 mb-1">Word Count</div>
                    <div className="text-xl font-bold text-gray-900">{reviewResult.word_count}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-500 mb-1">Themes</div>
                    <div className="text-xl font-bold text-gray-900">{reviewResult.themes.length}</div>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <p className="text-sm text-gray-700 leading-relaxed bg-slate-50 rounded-lg p-3">{reviewResult.summary}</p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Key Themes</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {reviewResult.themes.map((theme, i) => (
                      <span key={i} className="text-xs px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full">{theme}</span>
                    ))}
                  </div>
                </div>

                {reviewResult.positive_indicators.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-emerald-700 mb-2">Positive Indicators</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {reviewResult.positive_indicators.map((ind, i) => (
                        <span key={i} className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full">{ind}</span>
                      ))}
                    </div>
                  </div>
                )}

                {reviewResult.negative_indicators.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-red-700 mb-2">Areas for Improvement</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {reviewResult.negative_indicators.map((ind, i) => (
                        <span key={i} className="text-xs px-2.5 py-1 bg-red-50 text-red-700 rounded-full">{ind}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">AI Recommendations</h4>
                  <div className="space-y-1.5">
                    {reviewResult.recommendations.map((rec, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <Star className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                        {rec}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
