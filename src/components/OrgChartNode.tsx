import { User, ChevronDown, ChevronRight, Mail, Phone, Building2, Users, Crown, Star, Edit3, Badge, Briefcase, MapPin, TrendingUp } from 'lucide-react';
import { useState } from 'react';

interface OrgChartNodeProps {
  employee: {
    id: string;
    employee_number: string;
    first_name_en: string;
    last_name_en: string;
    job_title_en: string;
    email: string | null;
    phone: string | null;
    department_name: string | null;
    direct_reports: any[];
    direct_reports_count: number;
    total_reports_count: number;
    level: number;
    hire_date: string;
  };
  subordinates: any[];
  level: number;
  onEmployeeClick: (employee: any) => void;
  compactMode?: boolean;
  highlightedId?: string | null;
  onEditManager?: (employee: any) => void;
}

export function OrgChartNode({ employee, subordinates, level, onEmployeeClick, compactMode = false, highlightedId = null, onEditManager }: OrgChartNodeProps) {
  const [isExpanded, setIsExpanded] = useState(level < 2);
  const [isHovered, setIsHovered] = useState(false);
  const isHighlighted = highlightedId === employee.id;

  const directSubordinates = subordinates.filter(s => s.manager_id === employee.id);
  const hasSubordinates = directSubordinates.length > 0;

  const levelColors = [
    { bg: 'from-red-500 to-red-600', border: 'border-red-300', light: 'from-red-50 to-red-100', glow: 'shadow-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-700' },
    { bg: 'from-blue-500 to-blue-600', border: 'border-blue-300', light: 'from-blue-50 to-blue-100', glow: 'shadow-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700' },
    { bg: 'from-green-500 to-green-600', border: 'border-green-300', light: 'from-green-50 to-green-100', glow: 'shadow-green-200', text: 'text-green-700', badge: 'bg-green-100 text-green-700' },
    { bg: 'from-teal-500 to-teal-600', border: 'border-teal-300', light: 'from-teal-50 to-teal-100', glow: 'shadow-teal-200', text: 'text-teal-700', badge: 'bg-teal-100 text-teal-700' },
    { bg: 'from-amber-500 to-amber-600', border: 'border-amber-300', light: 'from-amber-50 to-amber-100', glow: 'shadow-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700' },
  ];

  const colorIndex = Math.min(level, levelColors.length - 1);
  const colors = levelColors[colorIndex];

  return (
    <div className="flex flex-col items-center animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="relative group">
        <div
          className={`relative bg-white rounded-2xl shadow-xl border-2 ${isHighlighted ? 'border-primary-500 ring-4 ring-primary-200 animate-pulse' : colors.border} ${compactMode ? 'p-4 w-72' : 'p-6 w-96'} cursor-pointer hover:shadow-2xl ${colors.glow} transition-all duration-500 transform hover:scale-105 hover:-translate-y-1 overflow-hidden`}
          onClick={() => onEmployeeClick(employee)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Background gradient overlay on hover */}
          <div className={`absolute inset-0 bg-gradient-to-br ${colors.light} opacity-0 group-hover:opacity-50 transition-opacity duration-500 pointer-events-none`}></div>

          {/* Animated background particles */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
            <div className={`absolute top-2 right-2 w-2 h-2 rounded-full bg-gradient-to-br ${colors.bg} animate-ping`}></div>
            <div className={`absolute bottom-2 left-2 w-1.5 h-1.5 rounded-full bg-gradient-to-br ${colors.bg} animate-ping`} style={{ animationDelay: '0.3s' }}></div>
          </div>

          {/* Top level badge */}
          {level === 0 && (
            <div className="absolute top-3 right-3 bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-500 rounded-full p-2 shadow-2xl animate-pulse border-2 border-white">
              <Crown className="h-5 w-5 text-white" />
            </div>
          )}

          {/* Level indicator */}
          <div className={`absolute top-3 right-3 ${level === 0 ? 'right-14' : ''} ${colors.badge} px-2.5 py-1 rounded-full text-xs font-bold shadow-md`}>
            L{level}
          </div>

          {/* Edit button */}
          {onEditManager && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditManager(employee);
              }}
              className="absolute top-2 left-2 bg-white/90 hover:bg-white rounded-lg p-1.5 shadow-md hover:shadow-lg transition-all duration-200 opacity-0 group-hover:opacity-100 hover:scale-110"
              title="Edit Reporting Relationship"
            >
              <Edit3 className="h-3.5 w-3.5 text-gray-600 hover:text-primary-600" />
            </button>
          )}
          <div className="relative flex items-start gap-4">
            <div className="relative flex-shrink-0">
              {/* Glow effect */}
              <div className={`absolute inset-0 bg-gradient-to-br ${colors.bg} rounded-2xl blur-lg opacity-40 group-hover:opacity-70 transition-opacity duration-500`}></div>

              {/* Avatar */}
              <div className={`relative bg-gradient-to-br ${colors.bg} rounded-2xl ${compactMode ? 'p-3.5' : 'p-5'} text-white shadow-2xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                <User className={compactMode ? 'h-6 w-6' : 'h-8 w-8'} />
              </div>
            </div>
            <div className="relative flex-1 min-w-0">
              <h3 className={`font-bold text-gray-900 ${compactMode ? 'text-base' : 'text-xl'} group-hover:${colors.text} transition-colors duration-300 leading-tight`}>
                {employee.first_name_en} {employee.last_name_en}
              </h3>
              <div className="flex items-center gap-2 mt-1.5">
                <Briefcase className="h-3.5 w-3.5 text-gray-400" />
                <p className={`${compactMode ? 'text-xs' : 'text-sm'} text-gray-600 font-medium line-clamp-1`}>{employee.job_title_en}</p>
              </div>
              <div className="flex items-center flex-wrap gap-2 mt-3">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 rounded-lg text-xs font-bold shadow-sm">
                  <Badge className="h-3 w-3" />
                  {employee.employee_number}
                </span>
                {level === 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-yellow-100 via-yellow-200 to-amber-200 text-yellow-900 rounded-lg text-xs font-bold shadow-sm border border-yellow-300">
                    <Star className="h-3 w-3" />
                    <span>Executive</span>
                  </span>
                )}
                {employee.total_reports_count > 0 && (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 ${colors.badge} rounded-lg text-xs font-bold shadow-sm`}>
                    <TrendingUp className="h-3 w-3" />
                    <span>{employee.total_reports_count} Team</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {!compactMode && (
            <div className="relative mt-5 pt-4 border-t-2 border-gray-100 space-y-2.5">
            {employee.department_name && (
              <div className="flex items-center gap-2.5 text-xs text-gray-600 hover:text-gray-900 transition-colors group/item">
                <div className={`h-7 w-7 rounded-lg bg-gradient-to-br ${colors.light} flex items-center justify-center group-hover/item:scale-110 transition-transform duration-200 border border-gray-200`}>
                  <Building2 className="h-4 w-4" />
                </div>
                <span className="truncate font-semibold">{employee.department_name}</span>
              </div>
            )}
            {employee.email && (
              <div className="flex items-center gap-2.5 text-xs text-gray-600 hover:text-primary-600 transition-colors group/item">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center group-hover/item:scale-110 transition-transform duration-200 border border-primary-200">
                  <Mail className="h-4 w-4" />
                </div>
                <span className="truncate font-semibold">{employee.email}</span>
              </div>
            )}
            {employee.direct_reports_count > 0 && (
              <div className={`flex items-center gap-3 px-3.5 py-2.5 bg-gradient-to-r ${colors.light} rounded-xl border border-opacity-50 ${colors.border} shadow-sm group-hover:shadow-md transition-all duration-300`}>
                <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${colors.bg} flex items-center justify-center shadow-md`}>
                  <Users className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-gray-800">
                    {employee.direct_reports_count} Direct Report{employee.direct_reports_count !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {employee.total_reports_count} Total Team Members
                  </p>
                </div>
              </div>
            )}
            </div>
          )}

          {hasSubordinates && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className={`absolute -bottom-5 left-1/2 transform -translate-x-1/2 bg-gradient-to-br ${colors.bg} border-3 border-white rounded-full p-2.5 hover:scale-125 transition-all duration-300 shadow-2xl z-10 group/btn hover:shadow-3xl`}
            >
              {isExpanded ? (
                <ChevronDown className="h-5 w-5 text-white group-hover/btn:animate-bounce" />
              ) : (
                <ChevronRight className="h-5 w-5 text-white group-hover/btn:rotate-90 transition-transform duration-300" />
              )}
            </button>
          )}
        </div>

        {hasSubordinates && level < 10 && (
          <div className={`absolute top-full left-1/2 w-0.5 bg-gradient-to-b ${colors.bg} h-12 transform -translate-x-1/2 opacity-50`} />
        )}
      </div>

      {hasSubordinates && isExpanded && level < 10 && (
        <div className="mt-12 relative animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex gap-10 items-start justify-center">
            {directSubordinates.map((sub, index) => (
              <div key={sub.id} className="relative animate-in fade-in zoom-in-95 duration-300" style={{ animationDelay: `${index * 100}ms` }}>
                {index > 0 && (
                  <div className={`absolute top-0 right-full w-10 h-1 bg-gradient-to-r ${colors.bg} transform -translate-y-10 rounded-full opacity-60`} />
                )}
                {index < directSubordinates.length - 1 && (
                  <div className={`absolute top-0 left-full w-10 h-1 bg-gradient-to-l ${colors.bg} transform -translate-y-10 rounded-full opacity-60`} />
                )}
                <div className={`absolute top-0 left-1/2 w-1 bg-gradient-to-b ${colors.bg} h-10 transform -translate-x-1/2 -translate-y-10 rounded-full opacity-60`} />
                <OrgChartNode
                  employee={sub}
                  subordinates={subordinates}
                  level={level + 1}
                  onEmployeeClick={onEmployeeClick}
                  compactMode={compactMode}
                  highlightedId={highlightedId}
                  onEditManager={onEditManager}
                />
              </div>
            ))}
          </div>
          {directSubordinates.length > 1 && (
            <div
              className={`absolute top-0 bg-gradient-to-r ${colors.bg} h-1 transform -translate-y-10 rounded-full opacity-60`}
              style={{
                left: '50%',
                right: '50%',
                marginLeft: `-${(directSubordinates.length - 1) * 5}rem`,
                width: `${(directSubordinates.length - 1) * 10}rem`,
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}