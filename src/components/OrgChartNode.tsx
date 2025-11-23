import { User, ChevronDown, ChevronRight, Mail, Phone, Building2, Users } from 'lucide-react';
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

  const directSubordinates = subordinates.filter(s => s.manager_id === employee.id);
  const hasSubordinates = directSubordinates.length > 0;

  const levelColors = [
    'bg-gradient-to-br from-red-500 to-red-600',
    'bg-gradient-to-br from-blue-500 to-blue-600',
    'bg-gradient-to-br from-green-500 to-green-600',
    'bg-gradient-to-br from-purple-500 to-purple-600',
    'bg-gradient-to-br from-orange-500 to-orange-600',
  ];

  const borderColors = [
    'border-red-300',
    'border-blue-300',
    'border-green-300',
    'border-purple-300',
    'border-orange-300',
  ];

  const colorIndex = Math.min(level, levelColors.length - 1);

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <div
          className={`bg-white rounded-lg shadow-lg border-2 ${borderColors[colorIndex]} p-4 cursor-pointer hover:shadow-xl transition-all duration-200 transform hover:scale-105 w-72`}
          onClick={() => onEmployeeClick(employee)}
        >
          <div className="flex items-start gap-3">
            <div className={`${levelColors[colorIndex]} rounded-full p-3 text-white flex-shrink-0`}>
              <User className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">
                {employee.first_name_en} {employee.last_name_en}
              </h3>
              <p className="text-sm text-gray-600 truncate">{employee.job_title_en}</p>
              <p className="text-xs text-gray-500 mt-1">{employee.employee_number}</p>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-gray-200 space-y-1">
            {employee.department_name && (
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Building2 className="h-3 w-3" />
                <span className="truncate">{employee.department_name}</span>
              </div>
            )}
            {employee.email && (
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Mail className="h-3 w-3" />
                <span className="truncate">{employee.email}</span>
              </div>
            )}
            {employee.direct_reports_count > 0 && (
              <div className="flex items-center gap-2 text-xs font-medium text-primary-600">
                <Users className="h-3 w-3" />
                <span>{employee.direct_reports_count} Direct Report{employee.direct_reports_count !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>

          {hasSubordinates && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-white border-2 border-gray-300 rounded-full p-1 hover:bg-gray-50 transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-600" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-600" />
              )}
            </button>
          )}
        </div>

        {hasSubordinates && level < 10 && (
          <div className="absolute top-full left-1/2 w-0.5 bg-gray-300 h-8 transform -translate-x-1/2" />
        )}
      </div>

      {hasSubordinates && isExpanded && level < 10 && (
        <div className="mt-8 relative">
          <div className="flex gap-8 items-start justify-center">
            {directSubordinates.map((sub, index) => (
              <div key={sub.id} className="relative">
                {index > 0 && (
                  <div className="absolute top-0 right-full w-8 h-0.5 bg-gray-300 transform -translate-y-8" />
                )}
                {index < directSubordinates.length - 1 && (
                  <div className="absolute top-0 left-full w-8 h-0.5 bg-gray-300 transform -translate-y-8" />
                )}
                <div className="absolute top-0 left-1/2 w-0.5 bg-gray-300 h-8 transform -translate-x-1/2 -translate-y-8" />
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
              className="absolute top-0 bg-gray-300 h-0.5 transform -translate-y-8"
              style={{
                left: '50%',
                right: '50%',
                marginLeft: `-${(directSubordinates.length - 1) * 4}rem`,
                width: `${(directSubordinates.length - 1) * 8}rem`,
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}