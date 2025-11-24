import { User, ChevronDown, ChevronRight, Mail, Phone, Building2, Users, Crown, Star } from 'lucide-react';
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
  };
  subordinates: any[];
  level: number;
  onEmployeeClick: (employee: any) => void;
}

export function OrgChartNode({ employee, subordinates, level, onEmployeeClick }: OrgChartNodeProps) {
  const [isExpanded, setIsExpanded] = useState(level < 2);
  const [isHovered, setIsHovered] = useState(false);

  const directSubordinates = subordinates.filter(s => s.manager_id === employee.id);
  const hasSubordinates = directSubordinates.length > 0;

  const levelColors = [
    { bg: 'from-red-500 to-red-600', border: 'border-red-300', light: 'from-red-50 to-red-100', glow: 'shadow-red-200' },
    { bg: 'from-blue-500 to-blue-600', border: 'border-blue-300', light: 'from-blue-50 to-blue-100', glow: 'shadow-blue-200' },
    { bg: 'from-green-500 to-green-600', border: 'border-green-300', light: 'from-green-50 to-green-100', glow: 'shadow-green-200' },
    { bg: 'from-purple-500 to-purple-600', border: 'border-purple-300', light: 'from-purple-50 to-purple-100', glow: 'shadow-purple-200' },
    { bg: 'from-orange-500 to-orange-600', border: 'border-orange-300', light: 'from-orange-50 to-orange-100', glow: 'shadow-orange-200' },
  ];

  const colorIndex = Math.min(level, levelColors.length - 1);
  const colors = levelColors[colorIndex];

  return (
    <div className="flex flex-col items-center animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="relative group">
        <div
          className={`relative bg-white rounded-xl shadow-lg border-2 ${colors.border} p-5 cursor-pointer hover:shadow-2xl ${colors.glow} transition-all duration-300 transform hover:scale-110 w-80 overflow-hidden`}
          onClick={() => onEmployeeClick(employee)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Background gradient overlay on hover */}
          <div className={`absolute inset-0 bg-gradient-to-br ${colors.light} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`}></div>

          {/* Top level badge */}
          {level === 0 && (
            <div className="absolute top-2 right-2 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full p-1.5 shadow-lg animate-pulse">
              <Crown className="h-4 w-4 text-white" />
            </div>
          )}
          <div className="relative flex items-start gap-4">
            <div className="relative flex-shrink-0">
              {/* Glow effect */}
              <div className={`absolute inset-0 bg-gradient-to-br ${colors.bg} rounded-full blur-md opacity-40 group-hover:opacity-60 transition-opacity`}></div>

              {/* Avatar */}
              <div className={`relative bg-gradient-to-br ${colors.bg} rounded-full p-4 text-white shadow-xl group-hover:scale-110 transition-transform duration-300`}>
                <User className="h-7 w-7" />
              </div>
            </div>
            <div className="relative flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 truncate text-lg group-hover:text-primary-700 transition-colors">
                {employee.first_name_en} {employee.last_name_en}
              </h3>
              <p className="text-sm text-gray-600 truncate mt-1 font-medium">{employee.job_title_en}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-semibold">
                  {employee.employee_number}
                </span>
                {level === 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 rounded text-xs font-semibold">
                    <Star className="h-3 w-3" />
                    <span>Executive</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="relative mt-4 pt-4 border-t-2 border-gray-200 space-y-2">
            {employee.department_name && (
              <div className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-900 transition-colors">
                <div className="h-6 w-6 rounded-md bg-gray-100 flex items-center justify-center group-hover:bg-primary-100 transition-colors">
                  <Building2 className="h-3.5 w-3.5" />
                </div>
                <span className="truncate font-medium">{employee.department_name}</span>
              </div>
            )}
            {employee.email && (
              <div className="flex items-center gap-2 text-xs text-gray-600 hover:text-primary-600 transition-colors">
                <div className="h-6 w-6 rounded-md bg-gray-100 flex items-center justify-center group-hover:bg-primary-100 transition-colors">
                  <Mail className="h-3.5 w-3.5" />
                </div>
                <span className="truncate font-medium">{employee.email}</span>
              </div>
            )}
            {employee.direct_reports_count > 0 && (
              <div className={`flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r ${colors.light} rounded-lg mt-2`}>
                <div className={`h-6 w-6 rounded-md bg-gradient-to-br ${colors.bg} flex items-center justify-center shadow-sm`}>
                  <Users className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-xs font-bold text-gray-800">
                  {employee.direct_reports_count} Direct Report{employee.direct_reports_count !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>

          {hasSubordinates && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className={`absolute -bottom-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-br ${colors.bg} border-2 border-white rounded-full p-2 hover:scale-125 transition-all duration-200 shadow-lg z-10 group/btn`}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-white group-hover/btn:animate-bounce" />
              ) : (
                <ChevronRight className="h-4 w-4 text-white" />
              )}
            </button>
          )}
        </div>

        {hasSubordinates && level < 10 && (
          <div className={`absolute top-full left-1/2 w-1 bg-gradient-to-b ${colors.bg} h-10 transform -translate-x-1/2 rounded-full opacity-60`} />
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