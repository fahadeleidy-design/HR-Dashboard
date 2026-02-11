import React, { useState, useEffect } from 'react';
import { Award, TrendingUp, Target, Plus, Star, ThumbsUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { useErrorHandler } from '@/hooks/useErrorHandler';

interface Props {
  employeeId: string;
}

export default function EmployeeSkillsProfile({ employeeId }: Props) {
  const { showToast } = useToast();
  const [skills, setSkills] = useState<any[]>([]);
  const [developmentPlans, setDevelopmentPlans] = useState<any[]>([]);
  const [endorsements, setEndorsements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { logError } = useErrorHandler();

  useEffect(() => {
    if (employeeId) {
      loadData();
    }
  }, [employeeId]);

  const loadData = async () => {
    try {
      setLoading(true);

      const { data: skillsData } = await supabase
        .from('employee_skills')
        .select('*')
        .eq('employee_id', employeeId)
        .order('proficiency_level', { ascending: false });

      setSkills(skillsData || []);

      const { data: plansData } = await supabase
        .from('skill_development_plans')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('status', 'planned')
        .or('status.eq.in_progress')
        .order('priority', { ascending: false });

      setDevelopmentPlans(plansData || []);

      const { data: endorsementsData } = await supabase
        .from('skill_endorsements')
        .select(`
          *,
          endorser:employees!skill_endorsements_endorser_id_fkey(first_name_en, last_name_en)
        `)
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false })
        .limit(5);

      setEndorsements(endorsementsData || []);
    } catch (error) {
      logError(error, 'medium', { component: 'EmployeeSkillsProfile', action: 'loadSkillsProfile' });
      showToast('Failed to load skills profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getProficiencyColor = (level: string) => {
    const levels: Record<string, string> = {
      novice: 'bg-red-100 text-red-800',
      beginner: 'bg-orange-100 text-orange-800',
      intermediate: 'bg-yellow-100 text-yellow-800',
      advanced: 'bg-blue-100 text-blue-800',
      expert: 'bg-purple-100 text-purple-800',
      master: 'bg-green-100 text-green-800',
    };
    return levels[level?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  const getProficiencyLevel = (level: string): number => {
    const levels: Record<string, number> = {
      novice: 1,
      beginner: 2,
      intermediate: 3,
      advanced: 4,
      expert: 5,
      master: 6,
    };
    return levels[level?.toLowerCase()] || 0;
  };

  const skillsByCategory = skills.reduce((acc: any, skill) => {
    const category = skill.skill_category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(skill);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Skills</p>
              <p className="text-3xl font-bold text-gray-900">{skills.length}</p>
            </div>
            <Award className="h-10 w-10 text-blue-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Development Plans</p>
              <p className="text-3xl font-bold text-gray-900">{developmentPlans.length}</p>
            </div>
            <Target className="h-10 w-10 text-orange-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Endorsements</p>
              <p className="text-3xl font-bold text-gray-900">{endorsements.length}</p>
            </div>
            <ThumbsUp className="h-10 w-10 text-green-400" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Skills by Category</h3>

        {Object.keys(skillsByCategory).length === 0 ? (
          <div className="text-center py-8">
            <Award className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">No skills recorded</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(skillsByCategory).map(([category, categorySkills]: [string, any]) => (
              <div key={category}>
                <h4 className="font-medium text-gray-900 mb-3">{category}</h4>
                <div className="space-y-3">
                  {categorySkills.map((skill: any) => (
                    <div key={skill.id} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">{skill.skill_name}</span>
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${getProficiencyColor(
                              skill.proficiency_level
                            )}`}
                          >
                            {skill.proficiency_level}
                          </span>
                          {skill.verified_date && (
                            <Award className="h-4 w-4 text-green-500" title="Verified" />
                          )}
                        </div>
                        {skill.years_of_experience && (
                          <span className="text-sm text-gray-500">
                            {skill.years_of_experience} years experience
                          </span>
                        )}
                      </div>
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{
                            width: `${(getProficiencyLevel(skill.proficiency_level) / 6) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {developmentPlans.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Development Plans</h3>
          <div className="space-y-4">
            {developmentPlans.map((plan) => (
              <div key={plan.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-gray-900">{plan.skill_name}</h4>
                    <p className="text-sm text-gray-500">
                      {plan.current_level} → {plan.target_level}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      plan.priority === 'high'
                        ? 'bg-red-100 text-red-800'
                        : plan.priority === 'medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {plan.priority}
                  </span>
                </div>
                <div className="mb-2">
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{plan.progress_percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${plan.progress_percentage}%` }}
                    ></div>
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  Target date: {new Date(plan.target_completion_date).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {endorsements.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Endorsements</h3>
          <div className="space-y-4">
            {endorsements.map((endorsement) => (
              <div key={endorsement.id} className="border-l-4 border-green-500 pl-4 py-2">
                <div className="flex items-center space-x-2 mb-1">
                  <ThumbsUp className="h-4 w-4 text-green-500" />
                  <span className="font-medium text-gray-900">{endorsement.skill_name}</span>
                  <span className="text-sm text-gray-500">
                    by {endorsement.endorser?.first_name_en} {endorsement.endorser?.last_name_en}
                  </span>
                </div>
                {endorsement.endorsement_comment && (
                  <p className="text-sm text-gray-600">{endorsement.endorsement_comment}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
