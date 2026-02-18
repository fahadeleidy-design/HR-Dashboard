import { useState, useEffect, useMemo } from 'react';
import {
  Network, Users, ChevronDown, ChevronRight, User, Briefcase, MapPin,
  Search, ZoomIn, ZoomOut, Maximize2, Download
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';

interface OrgNode {
  id: string;
  org_unit_name: string;
  org_unit_type: string;
  parent_unit_id: string | null;
  org_level: number;
  head_of_unit_id: string | null;
  headcount: number;
  budgeted_headcount: number;
  cost_center: string | null;
  is_active: boolean;
  head_name?: string;
  head_title?: string;
  children: OrgNode[];
}

interface PositionInfo {
  id: string;
  position_title: string;
  position_number: string;
  department: string;
  status: string;
  fte: number;
  incumbent_name: string | null;
}

const LEVEL_COLORS = [
  { bg: 'bg-slate-700', border: 'border-slate-600', text: 'text-white', light: 'bg-slate-50' },
  { bg: 'bg-blue-600', border: 'border-blue-500', text: 'text-white', light: 'bg-blue-50' },
  { bg: 'bg-teal-600', border: 'border-teal-500', text: 'text-white', light: 'bg-teal-50' },
  { bg: 'bg-emerald-600', border: 'border-emerald-500', text: 'text-white', light: 'bg-emerald-50' },
  { bg: 'bg-amber-600', border: 'border-amber-500', text: 'text-white', light: 'bg-amber-50' },
  { bg: 'bg-gray-500', border: 'border-gray-400', text: 'text-white', light: 'bg-gray-50' },
];

export function OrgChartDrillDown() {
  const { currentCompany } = useCompany();
  const [orgUnits, setOrgUnits] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [positions, setPositions] = useState<PositionInfo[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedUnit, setSelectedUnit] = useState<OrgNode | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentCompany?.id) loadData();
  }, [currentCompany]);

  async function loadData() {
    try {
      setLoading(true);
      const [orgRes, empRes, posRes] = await Promise.all([
        supabase.from('org_structure').select('*').eq('company_id', currentCompany!.id).eq('is_active', true).order('org_level'),
        supabase.from('employees').select('id, first_name_en, last_name_en, job_title_en, department_id, manager_id, status, department:departments!employees_department_id_fkey(name_en)').eq('company_id', currentCompany!.id).eq('status', 'active'),
        supabase.from('positions').select('id, position_title, position_number, department, status, fte, current_incumbent_id').eq('company_id', currentCompany!.id),
      ]);
      setOrgUnits(orgRes.data || []);
      setEmployees(empRes.data || []);

      const posData = (posRes.data || []).map(p => {
        const incumbent = (empRes.data || []).find(e => e.id === p.current_incumbent_id);
        return {
          ...p,
          incumbent_name: incumbent ? `${incumbent.first_name} ${incumbent.last_name}` : null,
        };
      });
      setPositions(posData);

      const rootIds = (orgRes.data || []).filter(u => !u.parent_unit_id).map(u => u.id);
      setExpandedNodes(new Set(rootIds));
    } finally {
      setLoading(false);
    }
  }

  const tree = useMemo((): OrgNode[] => {
    const buildTree = (parentId: string | null): OrgNode[] => {
      return orgUnits
        .filter(u => u.parent_unit_id === parentId)
        .map(u => {
          const head = employees.find(e => e.id === u.head_of_unit_id);
          return {
            ...u,
            head_name: head ? `${head.first_name_en} ${head.last_name_en}` : null,
            head_title: head?.job_title_en || null,
            children: buildTree(u.id),
          };
        });
    };
    return buildTree(null);
  }, [orgUnits, employees]);

  const generatedTree = useMemo((): OrgNode[] => {
    if (tree.length > 0) return tree;

    const deptMap: Record<string, any[]> = {};
    employees.forEach(e => {
      const dept = e.department?.name_en || 'Unassigned';
      if (!deptMap[dept]) deptMap[dept] = [];
      deptMap[dept].push(e);
    });

    const topManagers = employees.filter(e => !e.manager_id || !employees.find(emp => emp.id === e.manager_id));
    const rootNode: OrgNode = {
      id: 'root',
      org_unit_name: currentCompany?.name || 'Organization',
      org_unit_type: 'company',
      parent_unit_id: null,
      org_level: 0,
      head_of_unit_id: topManagers[0]?.id || null,
      headcount: employees.length,
      budgeted_headcount: employees.length,
      cost_center: null,
      is_active: true,
      head_name: topManagers[0] ? `${topManagers[0].first_name_en} ${topManagers[0].last_name_en}` : 'CEO',
      head_title: topManagers[0]?.job_title_en || 'Chief Executive',
      children: Object.entries(deptMap).map(([dept, emps]) => {
        const deptHead = emps.find(e => (e.job_title_en || '').toLowerCase().includes('manager') || (e.job_title_en || '').toLowerCase().includes('director'));
        return {
          id: `dept-${dept}`,
          org_unit_name: dept,
          org_unit_type: 'department',
          parent_unit_id: 'root',
          org_level: 1,
          head_of_unit_id: deptHead?.id || null,
          headcount: emps.length,
          budgeted_headcount: emps.length,
          cost_center: null,
          is_active: true,
          head_name: deptHead ? `${deptHead.first_name_en} ${deptHead.last_name_en}` : null,
          head_title: deptHead?.job_title_en || null,
          children: [],
        };
      }),
    };

    if (!expandedNodes.has('root')) {
      setExpandedNodes(prev => new Set([...prev, 'root']));
    }

    return [rootNode];
  }, [tree, employees, currentCompany, expandedNodes]);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  const unitPositions = selectedUnit
    ? positions.filter(p => p.department === selectedUnit.org_unit_name)
    : [];

  const filteredTree = useMemo(() => {
    if (!searchTerm) return generatedTree;
    const term = searchTerm.toLowerCase();
    const filterNodes = (nodes: OrgNode[]): OrgNode[] => {
      return nodes.reduce<OrgNode[]>((acc, node) => {
        const matches = node.org_unit_name.toLowerCase().includes(term)
          || (node.head_name || '').toLowerCase().includes(term);
        const filteredChildren = filterNodes(node.children);
        if (matches || filteredChildren.length > 0) {
          acc.push({ ...node, children: filteredChildren });
        }
        return acc;
      }, []);
    };
    return filterNodes(generatedTree);
  }, [generatedTree, searchTerm]);

  const renderNode = (node: OrgNode, depth: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length > 0;
    const colors = LEVEL_COLORS[Math.min(depth, LEVEL_COLORS.length - 1)];
    const isSelected = selectedUnit?.id === node.id;
    const fillRate = node.budgeted_headcount > 0
      ? Math.round((node.headcount / node.budgeted_headcount) * 100)
      : 100;

    return (
      <div key={node.id} className="ml-0">
        <div
          className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-all mb-1 ${
            isSelected ? 'bg-blue-50 border border-blue-300 shadow-sm' : 'hover:bg-gray-50 border border-transparent'
          }`}
          style={{ paddingLeft: `${depth * 24 + 12}px` }}
        >
          <button
            onClick={() => hasChildren && toggleNode(node.id)}
            className="w-5 h-5 flex items-center justify-center shrink-0"
          >
            {hasChildren ? (
              isExpanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />
            ) : <div className="w-4" />}
          </button>

          <div
            className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center shrink-0`}
          >
            {node.org_unit_type === 'company' ? (
              <Network className={`w-4 h-4 ${colors.text}`} />
            ) : (
              <Users className={`w-4 h-4 ${colors.text}`} />
            )}
          </div>

          <div className="flex-1 min-w-0" onClick={() => setSelectedUnit(node)}>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900 truncate">{node.org_unit_name}</span>
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-500 rounded uppercase">
                {node.org_unit_type}
              </span>
            </div>
            {node.head_name && (
              <div className="text-xs text-gray-500 truncate">{node.head_name} - {node.head_title}</div>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <div className="text-xs font-semibold text-gray-900">{node.headcount}/{node.budgeted_headcount}</div>
              <div className="text-[10px] text-gray-400">HC/Budget</div>
            </div>
            <div className="w-12">
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full ${fillRate >= 90 ? 'bg-green-500' : fillRate >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(fillRate, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {isExpanded && node.children.length > 0 && (
          <div>
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="bg-white rounded-xl border border-gray-200 h-96 animate-pulse" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search units, managers..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <button onClick={() => setExpandedNodes(new Set(orgUnits.map(u => u.id).concat(['root'])))} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50" title="Expand All">
          <Maximize2 className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-4 max-h-[600px] overflow-y-auto">
          {filteredTree.length === 0 ? (
            <div className="text-center py-12">
              <Network className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">
                {employees.length === 0 ? 'No employees found. Add employees to generate the org chart.' : 'No matching units found.'}
              </p>
            </div>
          ) : (
            filteredTree.map(node => renderNode(node))
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          {selectedUnit ? (
            <div className="space-y-4">
              <div>
                <h4 className="text-lg font-bold text-gray-900">{selectedUnit.org_unit_name}</h4>
                <span className="text-xs text-gray-500 uppercase">{selectedUnit.org_unit_type}</span>
              </div>

              {selectedUnit.head_name && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{selectedUnit.head_name}</p>
                    <p className="text-xs text-gray-500">{selectedUnit.head_title || 'Unit Head'}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500">Headcount</div>
                  <div className="text-xl font-bold text-blue-600">{selectedUnit.headcount}</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500">Budgeted</div>
                  <div className="text-xl font-bold text-green-600">{selectedUnit.budgeted_headcount}</div>
                </div>
                <div className="bg-amber-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500">Sub-units</div>
                  <div className="text-xl font-bold text-amber-600">{selectedUnit.children.length}</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500">Fill Rate</div>
                  <div className="text-xl font-bold text-slate-600">
                    {selectedUnit.budgeted_headcount > 0
                      ? Math.round((selectedUnit.headcount / selectedUnit.budgeted_headcount) * 100)
                      : 100}%
                  </div>
                </div>
              </div>

              {selectedUnit.cost_center && (
                <div className="text-sm">
                  <span className="text-gray-500">Cost Center: </span>
                  <span className="font-medium text-gray-900">{selectedUnit.cost_center}</span>
                </div>
              )}

              {unitPositions.length > 0 && (
                <div>
                  <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Positions ({unitPositions.length})</h5>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {unitPositions.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-xs">
                        <div>
                          <span className="font-medium text-gray-900">{p.position_title}</span>
                          <div className="text-gray-400">{p.position_number}</div>
                        </div>
                        <div className="text-right">
                          {p.incumbent_name ? (
                            <span className="text-green-600">{p.incumbent_name}</span>
                          ) : (
                            <span className="text-amber-600">Vacant</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <Network className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Select a unit to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
