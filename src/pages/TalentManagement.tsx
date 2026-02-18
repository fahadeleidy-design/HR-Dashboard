import { useState, useEffect } from 'react';
import { Users, Grid, TrendingUp, Award, Target, AlertCircle, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { useCompany } from '../contexts/CompanyContext';

interface TalentAssessment {
  id: string;
  employee: {
    first_name: string;
    last_name: string;
    job_title: string;
    department: string;
  };
  performance_level: string;
  potential_level: string;
  nine_box_position: string;
  is_high_potential: boolean;
  retention_risk: string;
}

interface SuccessionPlan {
  id: string;
  position_title: string;
  department: string;
  criticality_level: string;
  current_incumbent: {
    first_name: string;
    last_name: string;
  };
  current_succession_depth: number;
  succession_depth_target: number;
}

export default function TalentManagement() {
  const [activeTab, setActiveTab] = useState<'nine-box' | 'succession' | 'career-paths' | 'retention'>('nine-box');
  const [assessments, setAssessments] = useState<TalentAssessment[]>([]);
  const [successionPlans, setSuccessionPlans] = useState<SuccessionPlan[]>([]);
  const [nineBoxGrid, setNineBoxGrid] = useState<{ [key: string]: TalentAssessment[] }>({});
  const [stats, setStats] = useState({
    high_potentials: 0,
    key_talent: 0,
    succession_ready: 0,
    flight_risk: 0,
    total_assessed: 0,
  });
  const [loading, setLoading] = useState(true);

  const { showToast } = useToast();
  const { currentCompany } = useCompany();

  useEffect(() => {
    if (currentCompany?.id) {
      loadTalentData();
    }
  }, [currentCompany]);

  async function loadTalentData() {
    try {
      setLoading(true);

      const { data: assessmentData, error: assessmentError } = await supabase
        .from('talent_assessments')
        .select(`
          *,
          employee:employees(first_name, last_name, job_title, department)
        `)
        .eq('company_id', currentCompany!.id)
        .order('assessment_date', { ascending: false });

      if (assessmentError) throw assessmentError;
      setAssessments(assessmentData || []);

      const grid: { [key: string]: TalentAssessment[] } = {};
      (assessmentData || []).forEach(assessment => {
        const position = assessment.nine_box_position;
        if (!grid[position]) {
          grid[position] = [];
        }
        grid[position].push(assessment);
      });
      setNineBoxGrid(grid);

      const { data: successionData, error: successionError } = await supabase
        .from('succession_planning_v2')
        .select(`
          *,
          current_incumbent:employees(first_name, last_name)
        `)
        .eq('company_id', currentCompany!.id);

      if (successionError) throw successionError;
      setSuccessionPlans(successionData || []);

      const hiPo = (assessmentData || []).filter(a => a.is_high_potential).length;
      const keyTalent = (assessmentData || []).filter(a => a.is_key_talent).length;
      const flightRisk = (assessmentData || []).filter(a => a.retention_risk === 'high' || a.retention_risk === 'critical').length;

      setStats({
        high_potentials: hiPo,
        key_talent: keyTalent,
        succession_ready: 0,
        flight_risk: flightRisk,
        total_assessed: assessmentData?.length || 0,
      });
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  const get9BoxLabel = (performance: string, potential: string) => {
    const labels: { [key: string]: string } = {
      'low-limited': 'Underperformer',
      'low-moderate': 'Growth Employee',
      'low-high': 'Enigma',
      'low-exceptional': 'Rough Diamond',
      'medium-limited': 'Effective Contributor',
      'medium-moderate': 'Core Employee',
      'medium-high': 'High Professional',
      'medium-exceptional': 'Emerging Leader',
      'high-limited': 'Solid Professional',
      'high-moderate': 'Trusted Professional',
      'high-high': 'High Potential',
      'high-exceptional': 'Star Performer',
      'exceptional-limited': 'Expert',
      'exceptional-moderate': 'Key Player',
      'exceptional-high': 'Future Leader',
      'exceptional-exceptional': 'Top Talent'
    };
    return labels[`${performance}-${potential}`] || 'Unclassified';
  };

  const getBoxColor = (performance: string, potential: string) => {
    if (performance === 'high' && potential === 'high') return 'bg-green-500';
    if (performance === 'exceptional' && potential === 'exceptional') return 'bg-green-600';
    if (performance === 'high' || potential === 'high') return 'bg-blue-500';
    if (performance === 'low' || potential === 'limited') return 'bg-red-500';
    return 'bg-amber-500';
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'critical': return 'bg-red-600 text-white';
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-amber-100 text-amber-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading talent management data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-lg p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Star className="w-8 h-8" />
          <h1 className="text-3xl font-bold">Talent Management & Succession</h1>
        </div>
        <p className="text-indigo-100">
          9-box grid talent assessment, succession planning, and career pathing
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">High Potentials</div>
          <div className="text-2xl font-bold text-indigo-600">{stats.high_potentials}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Key Talent</div>
          <div className="text-2xl font-bold text-blue-600">{stats.key_talent}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Succession Ready</div>
          <div className="text-2xl font-bold text-green-600">{stats.succession_ready}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Flight Risk</div>
          <div className="text-2xl font-bold text-red-600">{stats.flight_risk}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Total Assessed</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total_assessed}</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {[
              { id: 'nine-box' as const, label: '9-Box Grid', icon: Grid },
              { id: 'succession' as const, label: 'Succession Planning', icon: Users },
              { id: 'career-paths' as const, label: 'Career Paths', icon: Target },
              { id: 'retention' as const, label: 'Retention Risk', icon: AlertCircle },
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'nine-box' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">9-Box Talent Grid</h3>
                <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                  Conduct Talent Review
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {['exceptional', 'high', 'medium', 'low'].map(performance => (
                  ['exceptional', 'high', 'moderate', 'limited'].map(potential => {
                    const position = `${performance}-${potential}`;
                    const employees = nineBoxGrid[position] || [];
                    const label = get9BoxLabel(performance, potential);
                    const color = getBoxColor(performance, potential);

                    return (
                      <div
                        key={position}
                        className={`${color} bg-opacity-10 border-2 ${color.replace('bg-', 'border-')} rounded-lg p-3 min-h-[120px]`}
                      >
                        <div className="text-xs font-semibold text-gray-700 mb-2">
                          {label}
                        </div>
                        <div className="text-lg font-bold mb-1">{employees.length}</div>
                        {employees.slice(0, 2).map(emp => (
                          <div key={emp.id} className="text-xs text-gray-600 truncate">
                            {emp.employee?.first_name} {emp.employee?.last_name}
                          </div>
                        ))}
                        {employees.length > 2 && (
                          <div className="text-xs text-gray-500">+{employees.length - 2} more</div>
                        )}
                      </div>
                    );
                  })
                ))}
              </div>

              <div className="mt-6">
                <h4 className="font-semibold mb-3">Legend</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-600 rounded"></div>
                    <span>Top Talent / Star Performers</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                    <span>High Potentials</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-500 rounded"></div>
                    <span>Solid Contributors</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-amber-500 rounded"></div>
                    <span>Development Needed</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'succession' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Succession Planning</h3>
                <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                  Create Succession Plan
                </button>
              </div>

              <div className="grid gap-4">
                {successionPlans.map(plan => (
                  <div key={plan.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900">{plan.position_title}</h4>
                        <p className="text-sm text-gray-600">{plan.department}</p>
                        {plan.current_incumbent && (
                          <p className="text-sm text-gray-500">
                            Current: {plan.current_incumbent.first_name} {plan.current_incumbent.last_name}
                          </p>
                        )}
                      </div>
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                        plan.criticality_level === 'critical' ? 'bg-red-100 text-red-800' :
                        plan.criticality_level === 'high' ? 'bg-amber-100 text-amber-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {plan.criticality_level} criticality
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Succession Depth:</span>
                        <span className="ml-2 font-medium">
                          {plan.current_succession_depth} / {plan.succession_depth_target}
                        </span>
                      </div>
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full"
                          style={{ width: `${(plan.current_succession_depth / plan.succession_depth_target) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'career-paths' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Career Paths</h3>
                <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                  Create Career Path
                </button>
              </div>

              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6 text-center">
                <Target className="w-16 h-16 text-indigo-300 mx-auto mb-4" />
                <h4 className="font-semibold text-gray-900 mb-2">Career Development Framework</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Define career progression paths with clear steps, requirements, and development activities
                </p>
                <div className="flex gap-3 justify-center">
                  <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                    Create Path
                  </button>
                  <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                    View Sample Paths
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'retention' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Retention Risk Management</h3>

              <div className="grid gap-3">
                {assessments.filter(a => a.retention_risk !== 'low').map(assessment => (
                  <div key={assessment.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {assessment.employee?.first_name} {assessment.employee?.last_name}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {assessment.employee?.job_title} • {assessment.employee?.department}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {assessment.is_high_potential && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">
                            High Potential
                          </span>
                        )}
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${getRiskColor(assessment.retention_risk)}`}>
                          {assessment.retention_risk} risk
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
