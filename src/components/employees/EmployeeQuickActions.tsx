import { useState, useRef, useEffect } from 'react';
import { MoreVertical, Edit, Trash2, Eye, Mail, Phone, FileText, Calendar, Award, AlertTriangle, UserCheck, UserX, Clock, Archive, Copy, Send, Download, MessageSquare, History, Briefcase, DollarSign, Building2 } from 'lucide-react';
import { Employee } from '@/types/database';

interface EmployeeQuickActionsProps {
  employee: Employee;
  onView: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onStatusChange?: (status: 'active' | 'on_leave' | 'terminated') => void;
  onSendEmail?: () => void;
  onViewPayroll?: () => void;
  onViewDocuments?: () => void;
  onViewHistory?: () => void;
  onAddNote?: () => void;
}

export function EmployeeQuickActions({
  employee,
  onView,
  onEdit,
  onDelete,
  onStatusChange,
  onSendEmail,
  onViewPayroll,
  onViewDocuments,
  onViewHistory,
  onAddNote
}: EmployeeQuickActionsProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (showMenu && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuWidth = 224;
      const menuHeight = 400;
      const padding = 8;

      let left = rect.right - menuWidth;
      let top = rect.bottom + padding;

      if (left < padding) {
        left = rect.left;
      }

      if (top + menuHeight > window.innerHeight) {
        top = rect.top - menuHeight - padding;
      }

      if (top < 0) {
        top = padding;
      }

      setMenuPosition({ top, left });
    }
  }, [showMenu]);

  const actions = [
    {
      icon: Eye,
      label: 'View Details',
      action: () => {
        onView();
        setShowMenu(false);
      },
      color: 'text-blue-600',
      bgHover: 'hover:bg-blue-50'
    },
    {
      icon: Edit,
      label: 'Edit Employee',
      action: () => {
        if (onEdit) onEdit();
        setShowMenu(false);
      },
      color: 'text-gray-700',
      bgHover: 'hover:bg-gray-50',
      hidden: !onEdit
    },
    {
      icon: Mail,
      label: 'Send Email',
      action: () => {
        if (onSendEmail) onSendEmail();
        setShowMenu(false);
      },
      color: 'text-gray-700',
      bgHover: 'hover:bg-gray-50',
      disabled: !employee.email
    },
    {
      icon: Phone,
      label: 'Call',
      action: () => {
        if (employee.phone) window.open(`tel:${employee.phone}`);
        setShowMenu(false);
      },
      color: 'text-gray-700',
      bgHover: 'hover:bg-gray-50',
      disabled: !employee.phone
    },
    {
      icon: MessageSquare,
      label: 'Add Note',
      action: () => {
        if (onAddNote) onAddNote();
        setShowMenu(false);
      },
      color: 'text-gray-700',
      bgHover: 'hover:bg-gray-50'
    },
    { divider: true },
    {
      icon: DollarSign,
      label: 'View Payroll',
      action: () => {
        if (onViewPayroll) onViewPayroll();
        setShowMenu(false);
      },
      color: 'text-gray-700',
      bgHover: 'hover:bg-gray-50'
    },
    {
      icon: FileText,
      label: 'View Documents',
      action: () => {
        if (onViewDocuments) onViewDocuments();
        setShowMenu(false);
      },
      color: 'text-gray-700',
      bgHover: 'hover:bg-gray-50'
    },
    {
      icon: History,
      label: 'View History',
      action: () => {
        if (onViewHistory) onViewHistory();
        setShowMenu(false);
      },
      color: 'text-gray-700',
      bgHover: 'hover:bg-gray-50'
    },
    { divider: true },
    {
      icon: UserCheck,
      label: 'Set Active',
      action: () => {
        if (onStatusChange) onStatusChange('active');
        setShowMenu(false);
      },
      color: 'text-green-600',
      bgHover: 'hover:bg-green-50',
      hidden: !onStatusChange || employee.status === 'active'
    },
    {
      icon: Clock,
      label: 'Set On Leave',
      action: () => {
        if (onStatusChange) onStatusChange('on_leave');
        setShowMenu(false);
      },
      color: 'text-yellow-600',
      bgHover: 'hover:bg-yellow-50',
      hidden: !onStatusChange || employee.status === 'on_leave'
    },
    {
      icon: UserX,
      label: 'Terminate',
      action: () => {
        if (onStatusChange) onStatusChange('terminated');
        setShowMenu(false);
      },
      color: 'text-orange-600',
      bgHover: 'hover:bg-orange-50',
      hidden: !onStatusChange || employee.status === 'terminated'
    },
    { divider: true },
    {
      icon: Download,
      label: 'Export Data',
      action: () => {
        setShowMenu(false);
      },
      color: 'text-gray-700',
      bgHover: 'hover:bg-gray-50'
    },
    {
      icon: Copy,
      label: 'Duplicate',
      action: () => {
        setShowMenu(false);
      },
      color: 'text-gray-700',
      bgHover: 'hover:bg-gray-50'
    },
    { divider: true },
    {
      icon: Trash2,
      label: 'Delete',
      action: () => {
        if (onDelete) onDelete();
        setShowMenu(false);
      },
      hidden: !onDelete,
      color: 'text-red-600',
      bgHover: 'hover:bg-red-50'
    }
  ];

  return (
    <>
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          setShowMenu(!showMenu);
        }}
        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <MoreVertical className="h-4 w-4 text-gray-600" />
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div
            className="fixed w-56 bg-white border border-gray-200 rounded-lg shadow-xl z-50 py-1 max-h-96 overflow-y-auto"
            style={{
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`
            }}
          >
            {actions.map((action, index) => {
              if (action.divider) {
                return <div key={`divider-${index}`} className="border-t border-gray-200 my-1" />;
              }

              if (action.hidden) return null;

              const Icon = action.icon;
              return (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    action.action();
                  }}
                  disabled={action.disabled}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-sm ${action.color} ${action.bgHover} transition-colors text-left ${
                    action.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{action.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
