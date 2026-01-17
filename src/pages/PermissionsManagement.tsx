import { useState } from 'react';
import { Shield, Users, Building2, FileText, Lock } from 'lucide-react';
import RolePermissionsConfig from '../components/permissions/RolePermissionsConfig';
import UserPermissionOverrides from '../components/permissions/UserPermissionOverrides';
import DepartmentIsolationManager from '../components/permissions/DepartmentIsolationManager';
import PermissionAuditLog from '../components/permissions/PermissionAuditLog';
import PermissionInheritanceRules from '../components/permissions/PermissionInheritanceRules';

type TabType = 'role_permissions' | 'user_overrides' | 'department_isolation' | 'inheritance' | 'audit_log';

export default function PermissionsManagement() {
  const [activeTab, setActiveTab] = useState<TabType>('role_permissions');

  const tabs = [
    { id: 'role_permissions' as TabType, label: 'Role Permissions', icon: Shield },
    { id: 'user_overrides' as TabType, label: 'User Overrides', icon: Users },
    { id: 'department_isolation' as TabType, label: 'Department Isolation', icon: Building2 },
    { id: 'inheritance' as TabType, label: 'Inheritance Rules', icon: Lock },
    { id: 'audit_log' as TabType, label: 'Audit Log', icon: FileText },
  ];

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Permissions Management</h1>
          <p className="text-gray-500 mt-2">
            Configure fine-grained permissions, department isolation, and access controls
          </p>
        </div>

        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm
                    ${activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="bg-white rounded-lg shadow">
          {activeTab === 'role_permissions' && <RolePermissionsConfig />}
          {activeTab === 'user_overrides' && <UserPermissionOverrides />}
          {activeTab === 'department_isolation' && <DepartmentIsolationManager />}
          {activeTab === 'inheritance' && <PermissionInheritanceRules />}
          {activeTab === 'audit_log' && <PermissionAuditLog />}
        </div>
      </div>
  );
}
