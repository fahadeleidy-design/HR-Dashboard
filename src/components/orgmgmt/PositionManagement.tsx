import { useState, useEffect, useMemo } from 'react';
import {
  Briefcase, Plus, Search, Filter, Edit, Eye, X, Check, Users, AlertTriangle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface Position {
  id: string;
  position_number: string;
  position_title: string;
  department: string;
  job_level: string | null;
  job_family: string | null;
  status: string;
  fte: number;
  min_salary: number | null;
  mid_salary: number | null;
  max_salary: number | null;
  location: string | null;
  key_responsibilities: string | null;
  required_qualifications: string | null;
  reports_to_position_id: string | null;
  effective_date: string;
  end_date: string | null;
  current_incumbent: { first_name_en: string; last_name_en: string } | null;
  reports_to: { position_title: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  budgeted: 'bg-blue-100 text-blue-800',
  proposed: 'bg-amber-100 text-amber-800',
  frozen: 'bg-gray-100 text-gray-800',
  eliminated: 'bg-red-100 text-red-800',
};

const PIE_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#9ca3af', '#ef4444'];

export function PositionManagement() {
  const { currentCompany } = useCompany();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [positions, setPositions] = useState<Position[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const [form, setForm] = useState({
    position_number: '',
    position_title: '',
    department: '',
    job_level: '',
    job_family: '',
    status: 'active',
    fte: 1,
    min_salary: 0,
    mid_salary: 0,
    max_salary: 0,
    location: '',
    key_responsibilities: '',
    required_qualifications: '',
    reports_to_position_id: '',
  });

  useEffect(() => {
    if (currentCompany?.id) loadData();
  }, [currentCompany]);

  async function loadData() {
    try {
      setLoading(true);
      const [posRes, deptRes, empRes] = await Promise.all([
        supabase
          .from('positions')
          .select('*, current_incumbent:employees(first_name_en, last_name_en), reports_to:positions!reports_to_position_id(position_title)')
          .eq('company_id', currentCompany!.id)
          .order('position_number'),
        supabase.from('departments').select('id, name_en').eq('company_id', currentCompany!.id),
        supabase.from('employees').select('id, first_name_en, last_name_en').eq('company_id', currentCompany!.id).eq('status', 'active'),
      ]);
      setPositions(posRes.data || []);
      setDepartments(deptRes.data || []);
      setEmployees(empRes.data || []);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    let result = positions;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p =>
        p.position_title.toLowerCase().includes(term) ||
        p.position_number.toLowerCase().includes(term) ||
        p.department.toLowerCase().includes(term)
      );
    }
    if (statusFilter !== 'all') result = result.filter(p => p.status === statusFilter);
    if (deptFilter !== 'all') result = result.filter(p => p.department === deptFilter);
    return result;
  }, [positions, searchTerm, statusFilter, deptFilter]);

  const stats = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    positions.forEach(p => {
      statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
    });
    const vacant = positions.filter(p => p.status === 'active' && !p.current_incumbent).length;
    const totalFTE = positions.filter(p => p.status === 'active').reduce((sum, p) => sum + (p.fte || 0), 0);

    return {
      total: positions.length,
      active: statusCounts['active'] || 0,
      budgeted: statusCounts['budgeted'] || 0,
      proposed: statusCounts['proposed'] || 0,
      frozen: statusCounts['frozen'] || 0,
      eliminated: statusCounts['eliminated'] || 0,
      vacant,
      totalFTE,
      statusData: Object.entries(statusCounts).map(([name, value]) => ({ name, value })),
    };
  }, [positions]);

  const uniqueDepts = [...new Set(positions.map(p => p.department))].sort();

  async function handleSave() {
    try {
      const payload = {
        company_id: currentCompany!.id,
        ...form,
        min_salary: form.min_salary || null,
        mid_salary: form.mid_salary || null,
        max_salary: form.max_salary || null,
        reports_to_position_id: form.reports_to_position_id || null,
        created_by: user?.id,
      };

      if (selectedPosition) {
        const { error } = await supabase.from('positions').update(payload).eq('id', selectedPosition.id);
        if (error) throw error;
        showToast('Position updated successfully', 'success');
      } else {
        const { error } = await supabase.from('positions').insert(payload);
        if (error) throw error;
        showToast('Position created successfully', 'success');
      }
      setShowForm(false);
      setSelectedPosition(null);
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  }

  function openEdit(pos: Position) {
    setSelectedPosition(pos);
    setForm({
      position_number: pos.position_number,
      position_title: pos.position_title,
      department: pos.department,
      job_level: pos.job_level || '',
      job_family: pos.job_family || '',
      status: pos.status,
      fte: pos.fte,
      min_salary: pos.min_salary || 0,
      mid_salary: pos.mid_salary || 0,
      max_salary: pos.max_salary || 0,
      location: pos.location || '',
      key_responsibilities: pos.key_responsibilities || '',
      required_qualifications: pos.required_qualifications || '',
      reports_to_position_id: pos.reports_to_position_id || '',
    });
    setShowForm(true);
  }

  function openCreate() {
    setSelectedPosition(null);
    setForm({
      position_number: `POS-${String(positions.length + 1).padStart(4, '0')}`,
      position_title: '',
      department: '',
      job_level: '',
      job_family: '',
      status: 'active',
      fte: 1,
      min_salary: 0,
      mid_salary: 0,
      max_salary: 0,
      location: '',
      key_responsibilities: '',
      required_qualifications: '',
      reports_to_position_id: '',
    });
    setShowForm(true);
  }

  if (loading) {
    return <div className="bg-white rounded-xl border border-gray-200 h-64 animate-pulse" />;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="text-xs text-gray-500">Total</div>
          <div className="text-xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-green-50 rounded-lg border border-green-200 p-3">
          <div className="text-xs text-gray-500">Active</div>
          <div className="text-xl font-bold text-green-600">{stats.active}</div>
        </div>
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-3">
          <div className="text-xs text-gray-500">Budgeted</div>
          <div className="text-xl font-bold text-blue-600">{stats.budgeted}</div>
        </div>
        <div className="bg-amber-50 rounded-lg border border-amber-200 p-3">
          <div className="text-xs text-gray-500">Vacant</div>
          <div className="text-xl font-bold text-amber-600">{stats.vacant}</div>
        </div>
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
          <div className="text-xs text-gray-500">Frozen</div>
          <div className="text-xl font-bold text-gray-600">{stats.frozen}</div>
        </div>
        <div className="bg-red-50 rounded-lg border border-red-200 p-3">
          <div className="text-xs text-gray-500">Eliminated</div>
          <div className="text-xl font-bold text-red-600">{stats.eliminated}</div>
        </div>
        <div className="bg-teal-50 rounded-lg border border-teal-200 p-3">
          <div className="text-xs text-gray-500">Total FTE</div>
          <div className="text-xl font-bold text-teal-600">{stats.totalFTE.toFixed(1)}</div>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search positions..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="budgeted">Budgeted</option>
          <option value="proposed">Proposed</option>
          <option value="frozen">Frozen</option>
          <option value="eliminated">Eliminated</option>
        </select>
        <select
          value={deptFilter}
          onChange={e => setDeptFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
        >
          <option value="all">All Departments</option>
          {uniqueDepts.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 text-sm font-medium">
          <Plus className="w-4 h-4" />
          Create Position
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Position #</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Title</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Department</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Incumbent</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Level</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Salary Range</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">FTE</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-500 text-sm">
                    No positions found. Create your first position to get started.
                  </td>
                </tr>
              ) : (
                filtered.map(pos => (
                  <tr key={pos.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono text-gray-900">{pos.position_number}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{pos.position_title}</div>
                      {pos.reports_to && <div className="text-xs text-gray-400">Reports to: {pos.reports_to.position_title}</div>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{pos.department}</td>
                    <td className="px-4 py-3 text-sm">
                      {pos.current_incumbent ? (
                        <span className="text-gray-900">{pos.current_incumbent.first_name_en} {pos.current_incumbent.last_name_en}</span>
                      ) : (
                        <span className="text-amber-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Vacant</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{pos.job_level || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">
                      {pos.min_salary && pos.max_salary
                        ? `${(pos.min_salary / 1000).toFixed(0)}K - ${(pos.max_salary / 1000).toFixed(0)}K`
                        : '-'
                      }
                    </td>
                    <td className="px-4 py-3 text-sm text-center text-gray-900">{pos.fte}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[pos.status] || STATUS_COLORS.active}`}>
                        {pos.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => { setSelectedPosition(pos); setShowDetail(true); }} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => openEdit(pos)} className="p-1.5 text-gray-400 hover:text-slate-600 rounded-lg hover:bg-slate-50">
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">{selectedPosition ? 'Edit Position' : 'Create Position'}</h3>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Position Number</label>
                  <input type="text" value={form.position_number} onChange={e => setForm(f => ({ ...f, position_number: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Position Title</label>
                  <input type="text" value={form.position_title} onChange={e => setForm(f => ({ ...f, position_title: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Department</label>
                  <input type="text" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                    <option value="active">Active</option>
                    <option value="budgeted">Budgeted</option>
                    <option value="proposed">Proposed</option>
                    <option value="frozen">Frozen</option>
                    <option value="eliminated">Eliminated</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Job Level</label>
                  <input type="text" value={form.job_level} onChange={e => setForm(f => ({ ...f, job_level: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="e.g. Senior, Manager" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Job Family</label>
                  <input type="text" value={form.job_family} onChange={e => setForm(f => ({ ...f, job_family: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="e.g. Engineering" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">FTE</label>
                  <input type="number" step="0.1" min="0" max="1" value={form.fte} onChange={e => setForm(f => ({ ...f, fte: parseFloat(e.target.value) || 1 }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Min Salary (SAR)</label>
                  <input type="number" value={form.min_salary} onChange={e => setForm(f => ({ ...f, min_salary: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Mid Salary</label>
                  <input type="number" value={form.mid_salary} onChange={e => setForm(f => ({ ...f, mid_salary: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Max Salary</label>
                  <input type="number" value={form.max_salary} onChange={e => setForm(f => ({ ...f, max_salary: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
                <input type="text" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Reports To</label>
                <select value={form.reports_to_position_id} onChange={e => setForm(f => ({ ...f, reports_to_position_id: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                  <option value="">-- None --</option>
                  {positions.filter(p => p.id !== selectedPosition?.id).map(p => (
                    <option key={p.id} value={p.id}>{p.position_number} - {p.position_title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Key Responsibilities</label>
                <textarea rows={3} value={form.key_responsibilities} onChange={e => setForm(f => ({ ...f, key_responsibilities: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Required Qualifications</label>
                <textarea rows={3} value={form.required_qualifications} onChange={e => setForm(f => ({ ...f, required_qualifications: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-gray-200">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm hover:bg-slate-800 flex items-center gap-2">
                <Check className="w-4 h-4" />
                {selectedPosition ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDetail && selectedPosition && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Position Details</h3>
              <button onClick={() => setShowDetail(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xl font-bold text-gray-900">{selectedPosition.position_title}</h4>
                  <p className="text-sm text-gray-500 font-mono">{selectedPosition.position_number}</p>
                </div>
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[selectedPosition.status]}`}>
                  {selectedPosition.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">Department:</span> <span className="font-medium">{selectedPosition.department}</span></div>
                <div><span className="text-gray-500">Level:</span> <span className="font-medium">{selectedPosition.job_level || '-'}</span></div>
                <div><span className="text-gray-500">Family:</span> <span className="font-medium">{selectedPosition.job_family || '-'}</span></div>
                <div><span className="text-gray-500">FTE:</span> <span className="font-medium">{selectedPosition.fte}</span></div>
                <div><span className="text-gray-500">Location:</span> <span className="font-medium">{selectedPosition.location || '-'}</span></div>
                <div>
                  <span className="text-gray-500">Incumbent:</span>{' '}
                  {selectedPosition.current_incumbent
                    ? <span className="font-medium">{selectedPosition.current_incumbent.first_name_en} {selectedPosition.current_incumbent.last_name_en}</span>
                    : <span className="text-amber-600 font-medium">Vacant</span>
                  }
                </div>
              </div>
              {selectedPosition.min_salary && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">Salary Range (SAR)</div>
                  <div className="text-sm font-medium">{selectedPosition.min_salary?.toLocaleString()} - {selectedPosition.mid_salary?.toLocaleString()} - {selectedPosition.max_salary?.toLocaleString()}</div>
                </div>
              )}
              {selectedPosition.key_responsibilities && (
                <div>
                  <h5 className="text-xs font-semibold text-gray-500 uppercase mb-1">Key Responsibilities</h5>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedPosition.key_responsibilities}</p>
                </div>
              )}
              {selectedPosition.required_qualifications && (
                <div>
                  <h5 className="text-xs font-semibold text-gray-500 uppercase mb-1">Required Qualifications</h5>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedPosition.required_qualifications}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
