import { useState, useEffect } from 'react';
import {
  GitBranch, Plus, Clock, CheckCircle, AlertTriangle, X, Check, Users, Shuffle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';

interface OrgChangeRequest {
  id: string;
  change_type: string;
  change_name: string;
  description: string;
  effective_date: string;
  affected_employee_count: number;
  cost_impact: number;
  risk_assessment: string | null;
  status: string;
  created_at: string;
}

interface MatrixAssignment {
  id: string;
  employee_id: string;
  primary_manager_id: string | null;
  secondary_manager_id: string | null;
  project_name: string | null;
  project_role: string | null;
  allocation_percentage: number;
  is_active: boolean;
  employee?: { first_name: string; last_name: string };
  primary_manager?: { first_name: string; last_name: string };
  secondary_manager?: { first_name: string; last_name: string };
}

interface JobProfile {
  id: string;
  profile_code: string;
  job_title: string;
  job_family: string;
  job_level: string;
  summary: string | null;
  min_salary: number | null;
  max_salary: number | null;
  is_active: boolean;
}

const CHANGE_TYPES = [
  { value: 'reorg', label: 'Reorganization' },
  { value: 'merger', label: 'Unit Merger' },
  { value: 'split', label: 'Unit Split' },
  { value: 'new_unit', label: 'New Unit Creation' },
  { value: 'elimination', label: 'Unit Elimination' },
  { value: 'restructure', label: 'Restructuring' },
];

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  implemented: 'bg-blue-100 text-blue-800',
};

export function OrgChangeManagement() {
  const { currentCompany } = useCompany();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState<'changes' | 'matrix' | 'profiles'>('changes');
  const [changes, setChanges] = useState<OrgChangeRequest[]>([]);
  const [matrixAssignments, setMatrixAssignments] = useState<MatrixAssignment[]>([]);
  const [jobProfiles, setJobProfiles] = useState<JobProfile[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showChangeForm, setShowChangeForm] = useState(false);
  const [showMatrixForm, setShowMatrixForm] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);

  const [changeForm, setChangeForm] = useState({
    change_type: 'reorg',
    change_name: '',
    description: '',
    effective_date: new Date().toISOString().split('T')[0],
    affected_employee_count: 0,
    cost_impact: 0,
    risk_assessment: '',
    communication_plan: '',
  });

  const [matrixForm, setMatrixForm] = useState({
    employee_id: '',
    primary_manager_id: '',
    secondary_manager_id: '',
    project_name: '',
    project_role: '',
    allocation_percentage: 50,
  });

  const [profileForm, setProfileForm] = useState({
    profile_code: '',
    job_title: '',
    job_family: '',
    job_level: '',
    summary: '',
    key_responsibilities: '',
    required_qualifications: '',
    min_salary: 0,
    max_salary: 0,
    education_requirement: '',
    remote_eligible: false,
  });

  useEffect(() => {
    if (currentCompany?.id) loadData();
  }, [currentCompany]);

  async function loadData() {
    try {
      setLoading(true);
      const [changeRes, matrixRes, profileRes, empRes] = await Promise.all([
        supabase.from('org_change_requests').select('*').eq('company_id', currentCompany!.id).order('created_at', { ascending: false }),
        supabase.from('matrix_assignments').select('*, employee:employees!matrix_assignments_employee_id_fkey(first_name, last_name), primary_manager:employees!matrix_assignments_primary_manager_id_fkey(first_name, last_name), secondary_manager:employees!matrix_assignments_secondary_manager_id_fkey(first_name, last_name)').eq('company_id', currentCompany!.id).eq('is_active', true),
        supabase.from('job_profiles').select('*').eq('company_id', currentCompany!.id).order('job_family'),
        supabase.from('employees').select('id, first_name, last_name, job_title').eq('company_id', currentCompany!.id).eq('employment_status', 'active'),
      ]);
      setChanges(changeRes.data || []);
      setMatrixAssignments(matrixRes.data || []);
      setJobProfiles(profileRes.data || []);
      setEmployees(empRes.data || []);
    } finally {
      setLoading(false);
    }
  }

  async function saveChange() {
    try {
      const { error } = await supabase.from('org_change_requests').insert({
        company_id: currentCompany!.id,
        ...changeForm,
        status: 'draft',
        requested_by: user?.id,
      });
      if (error) throw error;
      showToast('Change request created', 'success');
      setShowChangeForm(false);
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  }

  async function saveMatrix() {
    try {
      const { error } = await supabase.from('matrix_assignments').insert({
        company_id: currentCompany!.id,
        ...matrixForm,
        primary_manager_id: matrixForm.primary_manager_id || null,
        secondary_manager_id: matrixForm.secondary_manager_id || null,
      });
      if (error) throw error;
      showToast('Matrix assignment created', 'success');
      setShowMatrixForm(false);
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  }

  async function saveProfile() {
    try {
      const { error } = await supabase.from('job_profiles').insert({
        company_id: currentCompany!.id,
        ...profileForm,
        min_salary: profileForm.min_salary || null,
        max_salary: profileForm.max_salary || null,
        created_by: user?.id,
      });
      if (error) throw error;
      showToast('Job profile created', 'success');
      setShowProfileForm(false);
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  }

  if (loading) {
    return <div className="bg-white rounded-xl border border-gray-200 h-64 animate-pulse" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {[
          { id: 'changes' as const, label: 'Change Requests', icon: GitBranch },
          { id: 'matrix' as const, label: 'Matrix Org', icon: Shuffle },
          { id: 'profiles' as const, label: 'Job Profiles', icon: Users },
        ].map(v => {
          const Icon = v.icon;
          return (
            <button
              key={v.id}
              onClick={() => setActiveSection(v.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-medium transition-colors ${
                activeSection === v.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {v.label}
            </button>
          );
        })}
      </div>

      {activeSection === 'changes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900">Organizational Change Requests</h4>
            <button onClick={() => setShowChangeForm(true)} className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 text-white rounded-lg text-xs font-medium hover:bg-slate-800">
              <Plus className="w-3.5 h-3.5" />
              New Change Request
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <div className="text-xs text-gray-500">Total Requests</div>
              <div className="text-xl font-bold text-gray-900">{changes.length}</div>
            </div>
            <div className="bg-amber-50 rounded-lg border border-amber-200 p-3">
              <div className="text-xs text-gray-500">Pending</div>
              <div className="text-xl font-bold text-amber-600">{changes.filter(c => c.status === 'pending' || c.status === 'draft').length}</div>
            </div>
            <div className="bg-green-50 rounded-lg border border-green-200 p-3">
              <div className="text-xs text-gray-500">Approved</div>
              <div className="text-xl font-bold text-green-600">{changes.filter(c => c.status === 'approved').length}</div>
            </div>
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-3">
              <div className="text-xs text-gray-500">Implemented</div>
              <div className="text-xl font-bold text-blue-600">{changes.filter(c => c.status === 'implemented').length}</div>
            </div>
          </div>

          <div className="space-y-2">
            {changes.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <GitBranch className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No change requests yet. Create one to track organizational changes.</p>
              </div>
            ) : (
              changes.map(change => (
                <div key={change.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="text-sm font-semibold text-gray-900">{change.change_name}</h5>
                        <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${STATUS_COLORS[change.status] || STATUS_COLORS.draft}`}>
                          {change.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2">{change.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span>{CHANGE_TYPES.find(t => t.value === change.change_type)?.label || change.change_type}</span>
                        <span>Effective: {new Date(change.effective_date).toLocaleDateString()}</span>
                        <span>{change.affected_employee_count} employees affected</span>
                      </div>
                    </div>
                    {change.cost_impact !== 0 && (
                      <div className="text-right text-sm shrink-0">
                        <span className={`font-semibold ${change.cost_impact > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {change.cost_impact > 0 ? '+' : ''}{(change.cost_impact / 1000).toFixed(0)}K SAR
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeSection === 'matrix' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900">Matrix Organization Assignments</h4>
            <button onClick={() => setShowMatrixForm(true)} className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 text-white rounded-lg text-xs font-medium hover:bg-slate-800">
              <Plus className="w-3.5 h-3.5" />
              Add Assignment
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Primary Manager</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Secondary Manager</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Project</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Allocation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {matrixAssignments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-gray-500 text-sm">
                      No matrix assignments. Add assignments for employees with dual reporting lines.
                    </td>
                  </tr>
                ) : (
                  matrixAssignments.map(ma => (
                    <tr key={ma.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {ma.employee ? `${ma.employee.first_name} ${ma.employee.last_name}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {ma.primary_manager ? `${ma.primary_manager.first_name} ${ma.primary_manager.last_name}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {ma.secondary_manager ? `${ma.secondary_manager.first_name} ${ma.secondary_manager.last_name}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {ma.project_name || '-'}
                        {ma.project_role && <span className="text-gray-400"> ({ma.project_role})</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-16 bg-gray-100 rounded-full h-1.5">
                            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${ma.allocation_percentage}%` }} />
                          </div>
                          <span className="text-xs font-medium text-gray-600">{ma.allocation_percentage}%</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSection === 'profiles' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900">Job Profiles & Descriptions</h4>
            <button onClick={() => { setProfileForm({ profile_code: `JP-${String(jobProfiles.length + 1).padStart(3, '0')}`, job_title: '', job_family: '', job_level: '', summary: '', key_responsibilities: '', required_qualifications: '', min_salary: 0, max_salary: 0, education_requirement: '', remote_eligible: false }); setShowProfileForm(true); }} className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 text-white rounded-lg text-xs font-medium hover:bg-slate-800">
              <Plus className="w-3.5 h-3.5" />
              New Profile
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {jobProfiles.length === 0 ? (
              <div className="md:col-span-2 lg:col-span-3 bg-white rounded-xl border border-gray-200 p-12 text-center">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No job profiles. Create profiles to standardize job descriptions.</p>
              </div>
            ) : (
              jobProfiles.map(jp => (
                <div key={jp.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h5 className="text-sm font-semibold text-gray-900">{jp.job_title}</h5>
                      <p className="text-xs text-gray-400 font-mono">{jp.profile_code}</p>
                    </div>
                    <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${jp.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {jp.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-gray-600">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Family:</span>
                      <span className="font-medium">{jp.job_family}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Level:</span>
                      <span className="font-medium">{jp.job_level}</span>
                    </div>
                    {jp.min_salary && jp.max_salary && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Salary:</span>
                        <span className="font-medium">{(jp.min_salary / 1000).toFixed(0)}K - {(jp.max_salary / 1000).toFixed(0)}K SAR</span>
                      </div>
                    )}
                  </div>
                  {jp.summary && (
                    <p className="text-xs text-gray-500 mt-2 line-clamp-2">{jp.summary}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {showChangeForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">New Change Request</h3>
              <button onClick={() => setShowChangeForm(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Change Name</label>
                <input type="text" value={changeForm.change_name} onChange={e => setChangeForm(f => ({ ...f, change_name: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Change Type</label>
                  <select value={changeForm.change_type} onChange={e => setChangeForm(f => ({ ...f, change_type: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                    {CHANGE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Effective Date</label>
                  <input type="date" value={changeForm.effective_date} onChange={e => setChangeForm(f => ({ ...f, effective_date: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea rows={3} value={changeForm.description} onChange={e => setChangeForm(f => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Employees Affected</label>
                  <input type="number" value={changeForm.affected_employee_count} onChange={e => setChangeForm(f => ({ ...f, affected_employee_count: parseInt(e.target.value) || 0 }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Cost Impact (SAR)</label>
                  <input type="number" value={changeForm.cost_impact} onChange={e => setChangeForm(f => ({ ...f, cost_impact: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Risk Assessment</label>
                <textarea rows={2} value={changeForm.risk_assessment} onChange={e => setChangeForm(f => ({ ...f, risk_assessment: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-gray-200">
              <button onClick={() => setShowChangeForm(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm">Cancel</button>
              <button onClick={saveChange} className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm hover:bg-slate-800 flex items-center gap-2">
                <Check className="w-4 h-4" /> Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {showMatrixForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Matrix Assignment</h3>
              <button onClick={() => setShowMatrixForm(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Employee</label>
                <select value={matrixForm.employee_id} onChange={e => setMatrixForm(f => ({ ...f, employee_id: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                  <option value="">Select employee</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Primary Manager</label>
                  <select value={matrixForm.primary_manager_id} onChange={e => setMatrixForm(f => ({ ...f, primary_manager_id: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                    <option value="">Select</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Secondary Manager</label>
                  <select value={matrixForm.secondary_manager_id} onChange={e => setMatrixForm(f => ({ ...f, secondary_manager_id: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                    <option value="">Select</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Project Name</label>
                  <input type="text" value={matrixForm.project_name} onChange={e => setMatrixForm(f => ({ ...f, project_name: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Allocation %</label>
                  <input type="number" min="0" max="100" value={matrixForm.allocation_percentage} onChange={e => setMatrixForm(f => ({ ...f, allocation_percentage: parseInt(e.target.value) || 0 }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-gray-200">
              <button onClick={() => setShowMatrixForm(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm">Cancel</button>
              <button onClick={saveMatrix} className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm hover:bg-slate-800 flex items-center gap-2">
                <Check className="w-4 h-4" /> Save
              </button>
            </div>
          </div>
        </div>
      )}

      {showProfileForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">New Job Profile</h3>
              <button onClick={() => setShowProfileForm(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Profile Code</label>
                  <input type="text" value={profileForm.profile_code} onChange={e => setProfileForm(f => ({ ...f, profile_code: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Job Title</label>
                  <input type="text" value={profileForm.job_title} onChange={e => setProfileForm(f => ({ ...f, job_title: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Job Family</label>
                  <input type="text" value={profileForm.job_family} onChange={e => setProfileForm(f => ({ ...f, job_family: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="e.g. Engineering" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Job Level</label>
                  <input type="text" value={profileForm.job_level} onChange={e => setProfileForm(f => ({ ...f, job_level: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="e.g. Senior" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Summary</label>
                <textarea rows={2} value={profileForm.summary} onChange={e => setProfileForm(f => ({ ...f, summary: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Key Responsibilities</label>
                <textarea rows={3} value={profileForm.key_responsibilities} onChange={e => setProfileForm(f => ({ ...f, key_responsibilities: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Required Qualifications</label>
                <textarea rows={2} value={profileForm.required_qualifications} onChange={e => setProfileForm(f => ({ ...f, required_qualifications: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Min Salary (SAR)</label>
                  <input type="number" value={profileForm.min_salary} onChange={e => setProfileForm(f => ({ ...f, min_salary: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Max Salary (SAR)</label>
                  <input type="number" value={profileForm.max_salary} onChange={e => setProfileForm(f => ({ ...f, max_salary: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Education</label>
                  <input type="text" value={profileForm.education_requirement} onChange={e => setProfileForm(f => ({ ...f, education_requirement: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="e.g. Bachelor's Degree" />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={profileForm.remote_eligible} onChange={e => setProfileForm(f => ({ ...f, remote_eligible: e.target.checked }))} className="w-4 h-4 text-blue-600 border-gray-300 rounded" />
                    <span className="text-xs font-medium text-gray-700">Remote Eligible</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-gray-200">
              <button onClick={() => setShowProfileForm(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm">Cancel</button>
              <button onClick={saveProfile} className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm hover:bg-slate-800 flex items-center gap-2">
                <Check className="w-4 h-4" /> Create Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
