import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/lib/supabase';
import { Shield, Plus, Trash2, AlertCircle, CheckCircle, X } from 'lucide-react';

interface Employee {
  id: string;
  employee_number: string;
  first_name_en: string;
  last_name_en: string;
}

interface UserRole {
  id: string;
  user_id: string;
  employee_id: string | null;
  role: 'super_admin' | 'hr' | 'finance' | 'employee';
  employee_number: string | null;
  first_name_en: string | null;
  last_name_en: string | null;
  email: string | null;
  created_at: string;
}

interface User {
  id: string;
  email: string;
}

const ROLES = [
  {
    value: 'super_admin',
    label: 'Super Admin',
    description: 'Full system access, can manage all settings and approve all operations',
    color: 'red'
  },
  {
    value: 'hr',
    label: 'HR',
    description: 'Employee management, attendance, leave, performance, compliance',
    color: 'blue'
  },
  {
    value: 'finance',
    label: 'Finance',
    description: 'Payroll, loans, advances, expenses, approve financial operations',
    color: 'green'
  },
  {
    value: 'employee',
    label: 'Employee',
    description: 'View own data only, submit leave requests',
    color: 'gray'
  }
];

export function UserRoleManagement() {
  const { currentCompany } = useCompany();
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({
    email: '',
    employee_id: '',
    role: 'employee' as 'super_admin' | 'hr' | 'finance' | 'employee'
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    if (currentCompany) {
      loadUserRoles();
      loadEmployees();
    }
  }, [currentCompany]);

  const loadUserRoles = async () => {
    if (!currentCompany) return;

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/user-management`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'list_users',
            companyId: currentCompany.id,
          }),
        }
      );

      const result = await response.json();

      if (result.success && result.data) {
        setUserRoles(result.data as any);
      } else {
        throw new Error(result.error || 'Failed to load user roles');
      }
    } catch (error: any) {
      console.error('Failed to load user roles:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to load user roles' });
    }
    setLoading(false);
  };

  const loadEmployees = async () => {
    if (!currentCompany) return;

    const { data } = await supabase
      .from('employees')
      .select('id, employee_number, first_name_en, last_name_en')
      .eq('company_id', currentCompany.id)
      .eq('status', 'active')
      .order('first_name_en');

    if (data) {
      setEmployees(data);
    }
  };

  const handleAddRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany) return;

    setSaving(true);
    setMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Create user and assign role via edge function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/user-management`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'create_user',
            email: form.email,
            companyId: currentCompany.id,
            employeeId: form.employee_id || null,
            role: form.role,
          }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create user');
      }

      setMessage({ type: 'success', text: 'User role added successfully!' });
      setShowAddForm(false);
      setForm({ email: '', employee_id: '', role: 'employee' });
      loadUserRoles();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to add user role' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('Are you sure you want to remove this user role?')) return;

    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('id', roleId);

    if (!error) {
      setMessage({ type: 'success', text: 'User role removed successfully!' });
      loadUserRoles();
    } else {
      setMessage({ type: 'error', text: 'Failed to remove user role' });
    }
  };

  const getRoleBadge = (role: string) => {
    const roleInfo = ROLES.find(r => r.value === role);
    if (!roleInfo) return null;

    const colors = {
      red: 'bg-red-100 text-red-800',
      blue: 'bg-blue-100 text-blue-800',
      green: 'bg-green-100 text-green-800',
      gray: 'bg-gray-100 text-gray-800'
    };

    return (
      <span className={`px-3 py-1 text-xs font-medium rounded-full ${colors[roleInfo.color as keyof typeof colors]}`}>
        {roleInfo.label}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary-600" />
              User Role Management
            </h2>
            <p className="text-sm text-gray-600 mt-1">Manage user access and permissions</p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            {showAddForm ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            {showAddForm ? 'Cancel' : 'Add User Role'}
          </button>
        </div>
      </div>

      {message && (
        <div className={`mx-6 mt-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex gap-2">
            {message.type === 'success' ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600" />
            )}
            <p className={`text-sm ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
              {message.text}
            </p>
          </div>
        </div>
      )}

      {showAddForm && (
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <form onSubmit={handleAddRole} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  User Email *
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">If user doesn't exist, they will be created</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Link to Employee (Optional)
                </label>
                <select
                  value={form.employee_id}
                  onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">No employee link</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.employee_number} - {emp.first_name_en} {emp.last_name_en}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {ROLES.map((role) => (
                    <label
                      key={role.value}
                      className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        form.role === role.value
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={role.value}
                        checked={form.role === role.value}
                        onChange={(e) => setForm({ ...form, role: e.target.value as any })}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{role.label}</div>
                        <div className="text-sm text-gray-600 mt-1">{role.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Adding...' : 'Add User Role'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Loading...</td>
              </tr>
            ) : userRoles.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  <Shield className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  No user roles configured
                </td>
              </tr>
            ) : (
              userRoles.map((userRole) => {
                const roleInfo = ROLES.find(r => r.value === userRole.role);
                return (
                  <tr key={userRole.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{userRole.email || 'Unknown'}</div>
                    </td>
                    <td className="px-6 py-4">
                      {userRole.employee_number ? (
                        <div>
                          <div className="text-sm text-gray-900">{userRole.first_name_en} {userRole.last_name_en}</div>
                          <div className="text-xs text-gray-500">{userRole.employee_number}</div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Not linked</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {getRoleBadge(userRole.role)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 max-w-xs">{roleInfo?.description}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteRole(userRole.id)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                        title="Remove role"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="p-4 bg-blue-50 border-t border-blue-200">
        <div className="flex gap-2">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Role Hierarchy & Permissions:</p>
            <ul className="space-y-1 ml-4 list-disc">
              <li><strong>Super Admin:</strong> Complete system control, manage all users and settings</li>
              <li><strong>HR:</strong> Manage employees, attendance, leave, compliance, create payroll</li>
              <li><strong>Finance:</strong> Approve payroll, manage financial operations, loans, advances</li>
              <li><strong>Employee:</strong> View personal data only, submit leave requests</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}