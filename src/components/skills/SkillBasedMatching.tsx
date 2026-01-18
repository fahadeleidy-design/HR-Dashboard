import React, { useState, useEffect } from 'react';
import { Users, Search, Target, CheckCircle, XCircle, Clock, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';

interface MatchRequest {
  id: string;
  request_type: string;
  request_title: string;
  description: string;
  required_skills: any;
  needed_by_date: string;
  status: string;
  matches_count: number;
  best_match_score: number;
}

interface SkillMatch {
  id: string;
  employee: any;
  overall_match_score: number;
  matched_skills: any;
  missing_skills: any;
  status: string;
}

export default function SkillBasedMatching() {
  const { selectedCompany } = useCompany();
  const { showToast } = useToast();
  const [requests, setRequests] = useState<MatchRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<MatchRequest | null>(null);
  const [matches, setMatches] = useState<SkillMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRequest, setNewRequest] = useState({
    request_title: '',
    request_type: 'project',
    description: '',
    required_skills: [{ skill: '', level: 'intermediate', weight: 3 }],
    needed_by_date: '',
    duration_weeks: 4,
  });

  useEffect(() => {
    if (selectedCompany) {
      loadRequests();
    }
  }, [selectedCompany]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const { data } = await supabase
        .from('skill_matching_requests')
        .select('*')
        .eq('company_id', selectedCompany!.id)
        .order('created_at', { ascending: false });

      setRequests(data || []);
    } catch (error) {
      console.error('Error loading requests:', error);
      showToast('Failed to load matching requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadMatches = async (requestId: string) => {
    try {
      const { data } = await supabase
        .from('skill_matches')
        .select(`
          *,
          employee:employees(id, first_name_en, last_name_en, job_title_en)
        `)
        .eq('request_id', requestId)
        .order('overall_match_score', { ascending: false });

      setMatches(data || []);
    } catch (error) {
      console.error('Error loading matches:', error);
      showToast('Failed to load matches', 'error');
    }
  };

  const handleCreateRequest = async () => {
    try {
      const requiredSkillsJson = newRequest.required_skills.filter(s => s.skill);

      const { error } = await supabase.from('skill_matching_requests').insert([
        {
          company_id: selectedCompany!.id,
          request_title: newRequest.request_title,
          request_type: newRequest.request_type,
          description: newRequest.description,
          required_skills: requiredSkillsJson,
          needed_by_date: newRequest.needed_by_date || null,
          duration_weeks: newRequest.duration_weeks,
        },
      ]);

      if (error) throw error;

      showToast('Matching request created successfully', 'success');
      setShowCreateModal(false);
      setNewRequest({
        request_title: '',
        request_type: 'project',
        description: '',
        required_skills: [{ skill: '', level: 'intermediate', weight: 3 }],
        needed_by_date: '',
        duration_weeks: 4,
      });
      loadRequests();
    } catch (error: any) {
      console.error('Error creating request:', error);
      showToast(error.message || 'Failed to create request', 'error');
    }
  };

  const findMatches = async (requestId: string) => {
    try {
      const request = requests.find(r => r.id === requestId);
      if (!request) return;

      const { data: employees } = await supabase
        .from('employee_skills')
        .select(`
          employee_id,
          skill_name,
          proficiency_level,
          employee:employees(id, first_name_en, last_name_en, job_title_en, company_id)
        `)
        .eq('employee:company_id', selectedCompany!.id);

      if (!employees) return;

      const employeeSkillsMap = new Map();
      employees.forEach((es: any) => {
        if (!employeeSkillsMap.has(es.employee_id)) {
          employeeSkillsMap.set(es.employee_id, {
            employee: es.employee,
            skills: [],
          });
        }
        employeeSkillsMap.get(es.employee_id).skills.push({
          skill: es.skill_name,
          level: es.proficiency_level,
        });
      });

      const requiredSkills = request.required_skills as any[];
      const matchesToInsert: any[] = [];

      employeeSkillsMap.forEach((empData, employeeId) => {
        let matchedCount = 0;
        let totalWeight = 0;
        const matched: any[] = [];
        const missing: any[] = [];

        requiredSkills.forEach((reqSkill: any) => {
          const empSkill = empData.skills.find((s: any) =>
            s.skill.toLowerCase() === reqSkill.skill.toLowerCase()
          );

          if (empSkill) {
            matchedCount++;
            matched.push({ skill: reqSkill.skill, level: empSkill.level });
          } else {
            missing.push({ skill: reqSkill.skill, required_level: reqSkill.level });
          }
          totalWeight += reqSkill.weight || 1;
        });

        const matchScore = matchedCount / requiredSkills.length;

        if (matchScore > 0) {
          matchesToInsert.push({
            request_id: requestId,
            employee_id: employeeId,
            overall_match_score: matchScore,
            required_skills_score: matchScore,
            matched_skills: matched,
            missing_skills: missing,
          });
        }
      });

      if (matchesToInsert.length > 0) {
        const { error } = await supabase.from('skill_matches').insert(matchesToInsert);
        if (error) throw error;

        const { error: updateError } = await supabase
          .from('skill_matching_requests')
          .update({
            matches_count: matchesToInsert.length,
            best_match_score: Math.max(...matchesToInsert.map(m => m.overall_match_score)),
            status: 'matched',
          })
          .eq('id', requestId);

        if (updateError) throw updateError;

        showToast(`Found ${matchesToInsert.length} matches`, 'success');
        loadRequests();
        loadMatches(requestId);
      } else {
        showToast('No matches found', 'info');
      }
    } catch (error: any) {
      console.error('Error finding matches:', error);
      showToast(error.message || 'Failed to find matches', 'error');
    }
  };

  const handleSelectRequest = (request: MatchRequest) => {
    setSelectedRequest(request);
    loadMatches(request.id);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-800';
      case 'matched':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getMatchColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-blue-600';
    if (score >= 0.4) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Skill-Based Matching</h2>
          <p className="text-gray-600 mt-1">Find the right people for projects, teams, and mentorship</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Request
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Matching Requests</h3>

          {requests.length === 0 ? (
            <div className="text-center py-8">
              <Target className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">No requests yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <div
                  key={request.id}
                  onClick={() => handleSelectRequest(request)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    selectedRequest?.id === request.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900 text-sm">{request.request_title}</h4>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(request.status)}`}>
                      {request.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2 capitalize">{request.request_type}</p>
                  {request.matches_count > 0 && (
                    <div className="text-xs text-gray-500">
                      {request.matches_count} matches found
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          {selectedRequest ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedRequest.request_title}</h3>
                  <p className="text-sm text-gray-600">{selectedRequest.description}</p>
                </div>
                {selectedRequest.status === 'open' && (
                  <button
                    onClick={() => findMatches(selectedRequest.id)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Find Matches
                  </button>
                )}
              </div>

              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-2">Required Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {(selectedRequest.required_skills as any[]).map((skill: any, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      {skill.skill} ({skill.level})
                    </span>
                  ))}
                </div>
              </div>

              {matches.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">
                    Matches ({matches.length})
                  </h4>
                  <div className="space-y-4">
                    {matches.map((match) => (
                      <div key={match.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h5 className="font-medium text-gray-900">
                              {match.employee?.first_name_en} {match.employee?.last_name_en}
                            </h5>
                            <p className="text-sm text-gray-600">{match.employee?.job_title_en}</p>
                          </div>
                          <div className="text-right">
                            <div className={`text-2xl font-bold ${getMatchColor(match.overall_match_score)}`}>
                              {(match.overall_match_score * 100).toFixed(0)}%
                            </div>
                            <div className="text-xs text-gray-500">Match Score</div>
                          </div>
                        </div>

                        {match.matched_skills && (match.matched_skills as any[]).length > 0 && (
                          <div className="mb-2">
                            <div className="text-xs text-gray-600 mb-1">Matched Skills:</div>
                            <div className="flex flex-wrap gap-1">
                              {(match.matched_skills as any[]).map((skill: any, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs flex items-center"
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  {skill.skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {match.missing_skills && (match.missing_skills as any[]).length > 0 && (
                          <div>
                            <div className="text-xs text-gray-600 mb-1">Missing Skills:</div>
                            <div className="flex flex-wrap gap-1">
                              {(match.missing_skills as any[]).map((skill: any, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs flex items-center"
                                >
                                  <XCircle className="h-3 w-3 mr-1" />
                                  {skill.skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Select a request to view matches</p>
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Matching Request</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Request Title</label>
                <input
                  type="text"
                  value={newRequest.request_title}
                  onChange={(e) => setNewRequest({ ...newRequest, request_title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., React Developer for Dashboard Project"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Request Type</label>
                <select
                  value={newRequest.request_type}
                  onChange={(e) => setNewRequest({ ...newRequest, request_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="project">Project</option>
                  <option value="mentorship">Mentorship</option>
                  <option value="team">Team Formation</option>
                  <option value="knowledge_transfer">Knowledge Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newRequest.description}
                  onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe what you're looking for..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Required Skills</label>
                {newRequest.required_skills.map((skill, idx) => (
                  <div key={idx} className="flex items-center space-x-2 mb-2">
                    <input
                      type="text"
                      placeholder="Skill name"
                      value={skill.skill}
                      onChange={(e) => {
                        const updated = [...newRequest.required_skills];
                        updated[idx].skill = e.target.value;
                        setNewRequest({ ...newRequest, required_skills: updated });
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <select
                      value={skill.level}
                      onChange={(e) => {
                        const updated = [...newRequest.required_skills];
                        updated[idx].level = e.target.value;
                        setNewRequest({ ...newRequest, required_skills: updated });
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                      <option value="expert">Expert</option>
                    </select>
                  </div>
                ))}
                <button
                  onClick={() =>
                    setNewRequest({
                      ...newRequest,
                      required_skills: [
                        ...newRequest.required_skills,
                        { skill: '', level: 'intermediate', weight: 3 },
                      ],
                    })
                  }
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  + Add Skill
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Needed By</label>
                  <input
                    type="date"
                    value={newRequest.needed_by_date}
                    onChange={(e) => setNewRequest({ ...newRequest, needed_by_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (weeks)</label>
                  <input
                    type="number"
                    value={newRequest.duration_weeks}
                    onChange={(e) =>
                      setNewRequest({ ...newRequest, duration_weeks: parseInt(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRequest}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
