import { useState, useEffect } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import {
  Target,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Filter,
  Download,
  MessageSquare,
  X
} from 'lucide-react';

interface Goal {
  id: string;
  employee_id: string;
  cycle_id: string | null;
  category_id: string | null;
  goal_title: string;
  description: string | null;
  goal_type: 'objective' | 'key_result' | 'kpi' | 'personal_development';
  parent_goal_id: string | null;
  target_value: number | null;
  current_value: number;
  unit_of_measure: string | null;
  weight_percentage: number | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'draft' | 'active' | 'on_track' | 'at_risk' | 'behind' | 'completed' | 'cancelled';
  start_date: string | null;
  due_date: string | null;
  completed_date: string | null;
  progress_percentage: number;
  notes: string | null;
  created_at: string;
  employee?: {
    first_name_en: string;
    last_name_en: string;
    employee_number: string;
  };
  category?: {
    category_name: string;
    color_code: string;
  };
}

interface GoalCategory {
  id: string;
  category_name: string;
  description: string | null;
  color_code: string | null;
  weight_percentage: number | null;
}

interface CheckIn {
  id: string;
  check_in_date: string;
  progress_percentage: number;
  status_update: string;
  current_value: number | null;
  blockers: string | null;
  support_needed: string | null;
  next_steps: string | null;
  created_by: string;
}

export function GoalsManagement() {
  const { currentCompany } = useCompany();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { language } = useLanguage();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [categories, setCategories] = useState<GoalCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [userRole, setUserRole] = useState<string>('');
  const [employeeId, setEmployeeId] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  const [formData, setFormData] = useState({
    goal_title: '',
    description: '',
    goal_type: 'objective' as Goal['goal_type'],
    category_id: '',
    target_value: '',
    unit_of_measure: '',
    weight_percentage: '',
    priority: 'medium' as Goal['priority'],
    start_date: '',
    due_date: '',
    notes: ''
  });

  const [checkInData, setCheckInData] = useState({
    progress_percentage: '',
    status_update: '',
    current_value: '',
    blockers: '',
    support_needed: '',
    next_steps: ''
  });

  useEffect(() => {
    if (currentCompany && user) {
      fetchUserRole();
      fetchCategories();
    }
  }, [currentCompany, user]);

  useEffect(() => {
    if (employeeId) {
      fetchGoals();
    }
  }, [employeeId, filterStatus, filterType]);

  const fetchUserRole = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role, employee_id')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setUserRole(data.role);
      if (data.employee_id) {
        setEmployeeId(data.employee_id);
      }
    } catch (error: any) {
      console.error('Error fetching user role:', error);
    }
  };

  const fetchCategories = async () => {
    if (!currentCompany) return;

    try {
      const { data, error } = await supabase
        .from('goal_categories')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('category_name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchGoals = async () => {
    if (!currentCompany) return;

    setLoading(true);
    try {
      let query = supabase
        .from('performance_goals')
        .select(`
          *,
          employee:employees(first_name_en, last_name_en, employee_number),
          category:goal_categories(category_name, color_code)
        `)
        .eq('company_id', currentCompany.id);

      if (userRole === 'employee' && employeeId) {
        query = query.eq('employee_id', employeeId);
      }

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      if (filterType !== 'all') {
        query = query.eq('goal_type', filterType);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      setGoals(data || []);
    } catch (error: any) {
      console.error('Error fetching goals:', error);
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCheckIns = async (goalId: string) => {
    try {
      const { data, error } = await supabase
        .from('goal_check_ins')
        .select('*')
        .eq('goal_id', goalId)
        .order('check_in_date', { ascending: false });

      if (error) throw error;
      setCheckIns(data || []);
    } catch (error: any) {
      console.error('Error fetching check-ins:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentCompany || !employeeId) return;

    try {
      const goalData = {
        company_id: currentCompany.id,
        employee_id: employeeId,
        goal_title: formData.goal_title,
        description: formData.description || null,
        goal_type: formData.goal_type,
        category_id: formData.category_id || null,
        target_value: formData.target_value ? parseFloat(formData.target_value) : null,
        unit_of_measure: formData.unit_of_measure || null,
        weight_percentage: formData.weight_percentage ? parseFloat(formData.weight_percentage) : null,
        priority: formData.priority,
        start_date: formData.start_date || null,
        due_date: formData.due_date || null,
        notes: formData.notes || null,
        status: 'active',
        created_by: employeeId
      };

      if (selectedGoal) {
        const { error } = await supabase
          .from('performance_goals')
          .update(goalData)
          .eq('id', selectedGoal.id);

        if (error) throw error;
        showToast(
          language === 'ar' ? 'تم تحديث الهدف بنجاح' : 'Goal updated successfully',
          'success'
        );
      } else {
        const { error } = await supabase
          .from('performance_goals')
          .insert([goalData]);

        if (error) throw error;
        showToast(
          language === 'ar' ? 'تم إنشاء الهدف بنجاح' : 'Goal created successfully',
          'success'
        );
      }

      setShowModal(false);
      resetForm();
      fetchGoals();
    } catch (error: any) {
      console.error('Error saving goal:', error);
      showToast(error.message, 'error');
    }
  };

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedGoal || !employeeId) return;

    try {
      const checkInRecord = {
        goal_id: selectedGoal.id,
        check_in_date: new Date().toISOString().split('T')[0],
        progress_percentage: parseInt(checkInData.progress_percentage),
        status_update: checkInData.status_update,
        current_value: checkInData.current_value ? parseFloat(checkInData.current_value) : null,
        blockers: checkInData.blockers || null,
        support_needed: checkInData.support_needed || null,
        next_steps: checkInData.next_steps || null,
        created_by: employeeId
      };

      const { error: checkInError } = await supabase
        .from('goal_check_ins')
        .insert([checkInRecord]);

      if (checkInError) throw checkInError;

      const { error: goalError } = await supabase
        .from('performance_goals')
        .update({
          progress_percentage: parseInt(checkInData.progress_percentage),
          current_value: checkInData.current_value ? parseFloat(checkInData.current_value) : selectedGoal.current_value,
          status: parseInt(checkInData.progress_percentage) >= 100 ? 'completed' :
                  parseInt(checkInData.progress_percentage) >= 75 ? 'on_track' :
                  parseInt(checkInData.progress_percentage) >= 50 ? 'active' : 'at_risk'
        })
        .eq('id', selectedGoal.id);

      if (goalError) throw goalError;

      showToast(
        language === 'ar' ? 'تم تسجيل التحديث بنجاح' : 'Check-in recorded successfully',
        'success'
      );

      setShowCheckInModal(false);
      resetCheckInForm();
      fetchGoals();
    } catch (error: any) {
      console.error('Error recording check-in:', error);
      showToast(error.message, 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا الهدف؟' : 'Are you sure you want to delete this goal?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('performance_goals')
        .delete()
        .eq('id', id);

      if (error) throw error;

      showToast(
        language === 'ar' ? 'تم حذف الهدف بنجاح' : 'Goal deleted successfully',
        'success'
      );
      fetchGoals();
    } catch (error: any) {
      console.error('Error deleting goal:', error);
      showToast(error.message, 'error');
    }
  };

  const openEditModal = (goal: Goal) => {
    setSelectedGoal(goal);
    setFormData({
      goal_title: goal.goal_title,
      description: goal.description || '',
      goal_type: goal.goal_type,
      category_id: goal.category_id || '',
      target_value: goal.target_value?.toString() || '',
      unit_of_measure: goal.unit_of_measure || '',
      weight_percentage: goal.weight_percentage?.toString() || '',
      priority: goal.priority,
      start_date: goal.start_date || '',
      due_date: goal.due_date || '',
      notes: goal.notes || ''
    });
    setShowModal(true);
  };

  const openCheckInModal = (goal: Goal) => {
    setSelectedGoal(goal);
    fetchCheckIns(goal.id);
    setCheckInData({
      progress_percentage: goal.progress_percentage.toString(),
      status_update: '',
      current_value: goal.current_value.toString(),
      blockers: '',
      support_needed: '',
      next_steps: ''
    });
    setShowCheckInModal(true);
  };

  const resetForm = () => {
    setSelectedGoal(null);
    setFormData({
      goal_title: '',
      description: '',
      goal_type: 'objective',
      category_id: '',
      target_value: '',
      unit_of_measure: '',
      weight_percentage: '',
      priority: 'medium',
      start_date: '',
      due_date: '',
      notes: ''
    });
  };

  const resetCheckInForm = () => {
    setCheckInData({
      progress_percentage: '',
      status_update: '',
      current_value: '',
      blockers: '',
      support_needed: '',
      next_steps: ''
    });
  };

  const getStatusBadge = (status: Goal['status']) => {
    const statusConfig = {
      draft: { color: 'gray', text: language === 'ar' ? 'مسودة' : 'Draft', icon: Clock },
      active: { color: 'blue', text: language === 'ar' ? 'نشط' : 'Active', icon: Clock },
      on_track: { color: 'green', text: language === 'ar' ? 'على المسار' : 'On Track', icon: CheckCircle },
      at_risk: { color: 'yellow', text: language === 'ar' ? 'في خطر' : 'At Risk', icon: AlertTriangle },
      behind: { color: 'red', text: language === 'ar' ? 'متأخر' : 'Behind', icon: AlertTriangle },
      completed: { color: 'green', text: language === 'ar' ? 'مكتمل' : 'Completed', icon: CheckCircle },
      cancelled: { color: 'gray', text: language === 'ar' ? 'ملغي' : 'Cancelled', icon: X }
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${config.color}-100 text-${config.color}-800`}>
        <Icon className="h-3 w-3 mr-1 rtl:mr-0 rtl:ml-1" />
        {config.text}
      </span>
    );
  };

  const getPriorityBadge = (priority: Goal['priority']) => {
    const priorityConfig = {
      low: { color: 'gray', text: language === 'ar' ? 'منخفض' : 'Low' },
      medium: { color: 'blue', text: language === 'ar' ? 'متوسط' : 'Medium' },
      high: { color: 'orange', text: language === 'ar' ? 'عالي' : 'High' },
      critical: { color: 'red', text: language === 'ar' ? 'حرج' : 'Critical' }
    };

    const config = priorityConfig[priority];

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${config.color}-100 text-${config.color}-800`}>
        {config.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {language === 'ar' ? 'إدارة الأهداف' : 'Goals Management'}
          </h2>
          <p className="text-gray-600 mt-1">
            {language === 'ar' ? 'إدارة وتتبع أهداف الموظفين' : 'Manage and track employee goals'}
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2" />
          {language === 'ar' ? 'هدف جديد' : 'New Goal'}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center space-x-4 rtl:space-x-reverse">
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <Filter className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">
              {language === 'ar' ? 'تصفية:' : 'Filter:'}
            </span>
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="all">{language === 'ar' ? 'كل الحالات' : 'All Status'}</option>
            <option value="active">{language === 'ar' ? 'نشط' : 'Active'}</option>
            <option value="on_track">{language === 'ar' ? 'على المسار' : 'On Track'}</option>
            <option value="at_risk">{language === 'ar' ? 'في خطر' : 'At Risk'}</option>
            <option value="completed">{language === 'ar' ? 'مكتمل' : 'Completed'}</option>
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="all">{language === 'ar' ? 'كل الأنواع' : 'All Types'}</option>
            <option value="objective">{language === 'ar' ? 'هدف' : 'Objective'}</option>
            <option value="key_result">{language === 'ar' ? 'نتيجة رئيسية' : 'Key Result'}</option>
            <option value="kpi">{language === 'ar' ? 'مؤشر أداء' : 'KPI'}</option>
            <option value="personal_development">{language === 'ar' ? 'تطوير شخصي' : 'Personal Development'}</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {goals.map((goal) => (
          <div key={goal.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {goal.goal_title}
                </h3>
                <div className="flex items-center space-x-2 rtl:space-x-reverse mb-2">
                  {getStatusBadge(goal.status)}
                  {getPriorityBadge(goal.priority)}
                </div>
                {goal.category && (
                  <span
                    className="inline-block px-2 py-1 rounded text-xs font-medium"
                    style={{
                      backgroundColor: `${goal.category.color_code}20`,
                      color: goal.category.color_code
                    }}
                  >
                    {goal.category.category_name}
                  </span>
                )}
              </div>
            </div>

            {goal.description && (
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {goal.description}
              </p>
            )}

            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{language === 'ar' ? 'التقدم' : 'Progress'}</span>
                <span className="font-semibold text-gray-900">{goal.progress_percentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    goal.progress_percentage >= 75 ? 'bg-green-600' :
                    goal.progress_percentage >= 50 ? 'bg-blue-600' :
                    goal.progress_percentage >= 25 ? 'bg-yellow-600' : 'bg-red-600'
                  }`}
                  style={{ width: `${goal.progress_percentage}%` }}
                />
              </div>

              {goal.target_value && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{language === 'ar' ? 'الهدف' : 'Target'}</span>
                  <span className="font-semibold text-gray-900">
                    {goal.current_value} / {goal.target_value} {goal.unit_of_measure}
                  </span>
                </div>
              )}

              {goal.due_date && (
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2" />
                  <span>{new Date(goal.due_date).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2 rtl:space-x-reverse pt-4 border-t border-gray-200">
              <button
                onClick={() => openCheckInModal(goal)}
                className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm font-medium"
              >
                <TrendingUp className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2" />
                {language === 'ar' ? 'تحديث' : 'Update'}
              </button>
              <button
                onClick={() => openEditModal(goal)}
                className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                <Edit2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDelete(goal.id)}
                className="px-3 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {goals.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Target className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {language === 'ar' ? 'لا توجد أهداف' : 'No goals'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {language === 'ar' ? 'ابدأ بإنشاء هدف جديد' : 'Get started by creating a new goal'}
          </p>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">
                {selectedGoal
                  ? (language === 'ar' ? 'تعديل الهدف' : 'Edit Goal')
                  : (language === 'ar' ? 'هدف جديد' : 'New Goal')}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {language === 'ar' ? 'عنوان الهدف' : 'Goal Title'} *
                </label>
                <input
                  type="text"
                  value={formData.goal_title}
                  onChange={(e) => setFormData({ ...formData, goal_title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {language === 'ar' ? 'الوصف' : 'Description'}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {language === 'ar' ? 'النوع' : 'Type'} *
                  </label>
                  <select
                    value={formData.goal_type}
                    onChange={(e) => setFormData({ ...formData, goal_type: e.target.value as Goal['goal_type'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="objective">{language === 'ar' ? 'هدف' : 'Objective'}</option>
                    <option value="key_result">{language === 'ar' ? 'نتيجة رئيسية' : 'Key Result'}</option>
                    <option value="kpi">{language === 'ar' ? 'مؤشر أداء' : 'KPI'}</option>
                    <option value="personal_development">{language === 'ar' ? 'تطوير شخصي' : 'Personal Development'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {language === 'ar' ? 'الأولوية' : 'Priority'} *
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as Goal['priority'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="low">{language === 'ar' ? 'منخفض' : 'Low'}</option>
                    <option value="medium">{language === 'ar' ? 'متوسط' : 'Medium'}</option>
                    <option value="high">{language === 'ar' ? 'عالي' : 'High'}</option>
                    <option value="critical">{language === 'ar' ? 'حرج' : 'Critical'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {language === 'ar' ? 'الفئة' : 'Category'}
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{language === 'ar' ? 'بدون فئة' : 'No Category'}</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.category_name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {language === 'ar' ? 'القيمة المستهدفة' : 'Target Value'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.target_value}
                    onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {language === 'ar' ? 'وحدة القياس' : 'Unit'}
                  </label>
                  <input
                    type="text"
                    value={formData.unit_of_measure}
                    onChange={(e) => setFormData({ ...formData, unit_of_measure: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder={language === 'ar' ? 'مثال: %، عدد' : 'e.g., %, count'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {language === 'ar' ? 'الوزن %' : 'Weight %'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.weight_percentage}
                    onChange={(e) => setFormData({ ...formData, weight_percentage: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {language === 'ar' ? 'تاريخ البدء' : 'Start Date'}
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {language === 'ar' ? 'تاريخ الاستحقاق' : 'Due Date'}
                  </label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {language === 'ar' ? 'ملاحظات' : 'Notes'}
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              </div>

              <div className="flex justify-end space-x-3 rtl:space-x-reverse pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {selectedGoal
                    ? (language === 'ar' ? 'تحديث' : 'Update')
                    : (language === 'ar' ? 'إنشاء' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCheckInModal && selectedGoal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">
                {language === 'ar' ? 'تحديث التقدم' : 'Progress Update'}
              </h3>
              <p className="text-sm text-gray-600 mt-1">{selectedGoal.goal_title}</p>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-4">
                    {language === 'ar' ? 'تحديث جديد' : 'New Update'}
                  </h4>
                  <form onSubmit={handleCheckIn} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {language === 'ar' ? 'نسبة التقدم %' : 'Progress %'} *
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={checkInData.progress_percentage}
                        onChange={(e) => setCheckInData({ ...checkInData, progress_percentage: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    {selectedGoal.target_value && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {language === 'ar' ? 'القيمة الحالية' : 'Current Value'}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={checkInData.current_value}
                          onChange={(e) => setCheckInData({ ...checkInData, current_value: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {language === 'ar' ? 'ملخص التقدم' : 'Status Update'} *
                      </label>
                      <textarea
                        value={checkInData.status_update}
                        onChange={(e) => setCheckInData({ ...checkInData, status_update: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        rows={3}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {language === 'ar' ? 'العوائق' : 'Blockers'}
                      </label>
                      <textarea
                        value={checkInData.blockers}
                        onChange={(e) => setCheckInData({ ...checkInData, blockers: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        rows={2}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {language === 'ar' ? 'الدعم المطلوب' : 'Support Needed'}
                      </label>
                      <textarea
                        value={checkInData.support_needed}
                        onChange={(e) => setCheckInData({ ...checkInData, support_needed: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        rows={2}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {language === 'ar' ? 'الخطوات التالية' : 'Next Steps'}
                      </label>
                      <textarea
                        value={checkInData.next_steps}
                        onChange={(e) => setCheckInData({ ...checkInData, next_steps: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        rows={2}
                      />
                    </div>

                    <div className="flex justify-end space-x-3 rtl:space-x-reverse pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setShowCheckInModal(false);
                          resetCheckInForm();
                        }}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                      >
                        {language === 'ar' ? 'إلغاء' : 'Cancel'}
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        {language === 'ar' ? 'حفظ التحديث' : 'Save Update'}
                      </button>
                    </div>
                  </form>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-4">
                    {language === 'ar' ? 'سجل التحديثات' : 'Update History'}
                  </h4>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {checkIns.map((checkIn) => (
                      <div key={checkIn.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900">
                            {new Date(checkIn.check_in_date).toLocaleDateString()}
                          </span>
                          <span className="text-sm font-bold text-blue-600">
                            {checkIn.progress_percentage}%
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{checkIn.status_update}</p>
                        {checkIn.blockers && (
                          <p className="text-xs text-red-600 mb-1">
                            <strong>{language === 'ar' ? 'عوائق:' : 'Blockers:'}</strong> {checkIn.blockers}
                          </p>
                        )}
                        {checkIn.support_needed && (
                          <p className="text-xs text-yellow-600 mb-1">
                            <strong>{language === 'ar' ? 'دعم مطلوب:' : 'Support:'}</strong> {checkIn.support_needed}
                          </p>
                        )}
                        {checkIn.next_steps && (
                          <p className="text-xs text-green-600">
                            <strong>{language === 'ar' ? 'خطوات تالية:' : 'Next:'}</strong> {checkIn.next_steps}
                          </p>
                        )}
                      </div>
                    ))}

                    {checkIns.length === 0 && (
                      <div className="text-center py-8 text-gray-500 text-sm">
                        {language === 'ar' ? 'لا توجد تحديثات سابقة' : 'No previous updates'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
