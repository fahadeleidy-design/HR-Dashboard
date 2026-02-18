import { ReactNode, useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import {
  LayoutDashboard,
  Users,
  DollarSign,
  Calendar,
  Clock,
  TrendingUp,
  GraduationCap,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  Building2,
  ChevronDown,
  Car,
  Briefcase,
  Home,
  Shield,
  Plane,
  Receipt,
  CreditCard,
  Globe,
  Menu,
  X,
  Calculator,
  ScrollText,
  BookOpen,
  UserPlus,
  Languages,
  UserCheck,
  CheckCircle,
  AlertTriangle,
  Banknote,
  PieChart,
  Lock,
  Wallet,
  Brain,
} from 'lucide-react';
import { NotificationCenter } from './NotificationCenter';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, signOut, userRole } = useAuth();
  const { currentCompany, companies, setCurrentCompany, isConsolidatedView, setConsolidatedView } = useCompany();
  const { language, setLanguage, t, isRTL } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [showCompanyMenu, setShowCompanyMenu] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>({});

  const isPrivilegedUser = ['super_admin', 'hr', 'finance'].includes(userRole?.role || '');

  useEffect(() => {
    if (!['finance', 'hr', 'super_admin'].includes(userRole?.role || '')) return;
    const cIds = isConsolidatedView ? companies.map(c => c.id) : currentCompany ? [currentCompany.id] : [];
    if (cIds.length === 0) return;

    const fetchBadges = async () => {
      const [loansRes, advancesRes, expensesRes, penaltiesRes] = await Promise.all([
        supabase.from('loans').select('id', { count: 'exact', head: true }).in('company_id', cIds).eq('status', 'hr_approved'),
        supabase.from('advances').select('id', { count: 'exact', head: true }).in('company_id', cIds).eq('status', 'hr_approved'),
        supabase.from('expense_claims').select('id', { count: 'exact', head: true }).in('company_id', cIds).eq('approval_status', 'submitted'),
        supabase.from('penalties').select('id', { count: 'exact', head: true }).in('company_id', cIds).eq('status', 'pending_finance'),
      ]);
      setBadgeCounts({
        '/loans': loansRes.count || 0,
        '/advances': advancesRes.count || 0,
        '/expenses': expensesRes.count || 0,
        '/penalties': penaltiesRes.count || 0,
      });
    };
    fetchBadges();
    const interval = setInterval(fetchBadges, 60000);
    return () => clearInterval(interval);
  }, [userRole?.role, currentCompany?.id, isConsolidatedView, companies]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const isEmployee = userRole?.role === 'employee';
  const isFinanceUser = userRole?.role === 'finance';
  const canApprovePendingRequests = ['manager', 'hr', 'finance', 'admin', 'super_admin'].includes(userRole?.role || '');
  const hasFullAccess = ['super_admin', 'hr', 'finance', 'admin'].includes(userRole?.role || '');

  const navSections = [
    {
      title: t.nav.coreHR,
      items: [
        { path: '/', icon: LayoutDashboard, label: t.nav.dashboard },
        { path: '/employees', icon: Users, label: t.nav.employees },
        ...(hasFullAccess || !isEmployee ? [
          { path: '/recruitment', icon: UserPlus, label: t.nav.recruitment || 'Recruitment' },
          { path: '/managers', icon: UserCheck, label: t.nav.managers || 'Manager Assignment' },
          { path: '/salary-scale', icon: DollarSign, label: t.nav.salaryScale || 'Salary Scale' },
        ] : []),
        { path: '/org-chart', icon: TrendingUp, label: t.nav.orgChart },
        { path: '/handbook', icon: BookOpen, label: t.nav.handbook },
        { path: '/attendance', icon: Clock, label: t.nav.attendance },
        { path: '/leave', icon: Calendar, label: t.nav.leave },
        ...(canApprovePendingRequests ? [
          { path: '/pending-requests', icon: CheckCircle, label: 'Pending Requests' },
        ] : []),
      ]
    },
    {
      title: t.nav.payrollFinance,
      items: [
        ...(isFinanceUser || userRole?.role === 'hr' ? [
          { path: '/finance-dashboard', icon: Wallet, label: language === 'ar' ? 'لوحة التحكم المالية' : 'Finance Dashboard' },
        ] : []),
        { path: '/payroll', icon: DollarSign, label: t.nav.payroll },
        { path: '/loans', icon: CreditCard, label: t.nav.loans },
        { path: '/advances', icon: Receipt, label: t.nav.advances },
        { path: '/expenses', icon: Receipt, label: t.nav.expenses },
        ...(hasFullAccess || !isEmployee ? [
          { path: '/penalties', icon: AlertTriangle, label: language === 'ar' ? 'الجزاءات' : 'Penalties' },
          { path: '/end-of-service', icon: Calculator, label: t.nav.endOfService },
        ] : []),
        ...(isFinanceUser || ['hr', 'super_admin'].includes(userRole?.role || '') ? [
          { path: '/finance-reports', icon: PieChart, label: language === 'ar' ? 'التقارير المالية' : 'Finance Reports' },
          { path: '/budgets', icon: Banknote, label: language === 'ar' ? 'إدارة الميزانية' : 'Budgets' },
          { path: '/payment-reconciliation', icon: CheckCircle, label: language === 'ar' ? 'المطابقة البنكية' : 'Bank Reconciliation' },
          { path: '/period-close', icon: Lock, label: language === 'ar' ? 'إغلاق الفترة' : 'Period Close' },
        ] : []),
      ]
    },
    {
      title: t.nav.talentManagement,
      items: [
        { path: '/performance', icon: TrendingUp, label: t.nav.performance },
        { path: '/training', icon: GraduationCap, label: t.nav.training },
        { path: '/documents', icon: FileText, label: t.nav.documents },
        { path: '/workforce-analytics', icon: BarChart3, label: language === 'ar' ? 'تحليلات القوى العاملة' : 'Workforce Analytics' },
        ...(hasFullAccess || !isEmployee ? [
          { path: '/talent-management', icon: TrendingUp, label: language === 'ar' ? 'إدارة المواهب' : 'Talent Management' },
          { path: '/org-management', icon: Building2, label: language === 'ar' ? 'الإدارة التنظيمية' : 'Org Management' },
          { path: '/ai-features', icon: Brain, label: language === 'ar' ? 'الذكاء الاصطناعي' : 'AI Intelligence' },
        ] : []),
      ]
    },
    ...(hasFullAccess || !isEmployee ? [
      {
        title: t.nav.complianceGov,
        items: [
          { path: '/nitaqat', icon: BarChart3, label: t.nav.nitaqat },
          { path: '/gosi', icon: DollarSign, label: t.nav.gosi },
          { path: '/visas', icon: CreditCard, label: t.nav.visas },
          { path: '/gov-subscriptions', icon: Globe, label: t.nav.govSubscriptions },
          { path: '/gov-docs', icon: Briefcase, label: t.nav.govDocs },
        ]
      },
      {
        title: t.nav.operations,
        items: [
          { path: '/travel', icon: Plane, label: t.nav.travel },
          { path: '/vehicles', icon: Car, label: t.nav.vehicles },
          { path: '/real-estate', icon: Home, label: t.nav.realEstate },
          { path: '/contracts', icon: Briefcase, label: t.nav.contracts },
          { path: '/insurance', icon: Shield, label: t.nav.insurance },
        ]
      },
      {
        title: t.nav.system,
        items: [
          { path: '/audit-log', icon: ScrollText, label: t.nav.auditLog },
          { path: '/settings', icon: Settings, label: t.nav.settings },
        ]
      }
    ] : [])
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
      <nav className="bg-white/80 backdrop-blur-xl shadow-sm border-b border-gray-200/50 sticky top-0 z-40">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`flex justify-between items-center h-16 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-4' : 'space-x-4'}`}>
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg hover:bg-gradient-to-r hover:from-primary-50 hover:to-blue-50 hover:text-primary-600 transition-all duration-200 hover:scale-105 hover:shadow-sm"
                title={sidebarOpen ? (language === 'ar' ? 'إخفاء القائمة' : 'Hide Menu') : (language === 'ar' ? 'إظهار القائمة' : 'Show Menu')}
              >
                {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>

              <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-3' : 'space-x-3'}`}>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary-600 to-primary-400 rounded-lg blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
                  <img
                    src="/image.png"
                    alt="Special Offices Company"
                    className="relative h-10 sm:h-12 w-auto object-contain"
                  />
                </div>
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">{t.common.appTitle}</h1>
                  {companies.length > 0 && (
                    <div className="relative">
                      <button
                        onClick={() => setShowCompanyMenu(!showCompanyMenu)}
                        className={`text-xs sm:text-sm text-gray-600 flex items-center gap-1 hover:text-primary-600 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
                      >
                        <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="max-w-[200px] truncate font-medium">
                          {isConsolidatedView
                            ? (language === 'ar' ? 'العرض الموحد' : 'Consolidated View')
                            : (currentCompany ? (language === 'ar' && currentCompany.name_ar ? currentCompany.name_ar : currentCompany.name_en) : '')
                          }
                        </span>
                        {(companies.length > 1 || isPrivilegedUser) && <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" />}
                      </button>
                      {showCompanyMenu && (companies.length > 1 || isPrivilegedUser) && (
                        <>
                          <div
                            className="fixed inset-0 z-30"
                            onClick={() => setShowCompanyMenu(false)}
                          />
                          <div className={`absolute ${isRTL ? 'left-0' : 'right-0'} mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-40 max-h-80 overflow-y-auto`}>
                            {isPrivilegedUser && (
                              <>
                                <button
                                  onClick={() => {
                                    setConsolidatedView();
                                    setShowCompanyMenu(false);
                                  }}
                                  className={`w-full px-4 py-3 text-sm hover:bg-primary-50 transition-colors ${isRTL ? 'text-right' : 'text-left'} ${
                                    isConsolidatedView ? 'bg-primary-50 text-primary-700 font-semibold border-b-2 border-primary-500' : 'text-gray-700'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <Building2 className="h-5 w-5 flex-shrink-0 text-primary-600" />
                                    <div>
                                      <div className="font-bold text-primary-700">{language === 'ar' ? 'العرض الموحد' : 'Consolidated View'}</div>
                                      <div className="text-xs text-gray-500">{language === 'ar' ? 'جميع الشركات' : 'All Companies'}</div>
                                    </div>
                                  </div>
                                </button>
                                <div className="border-t border-gray-200 my-2"></div>
                              </>
                            )}
                            {companies.map((company) => (
                              <button
                                key={company.id}
                                onClick={() => {
                                  setCurrentCompany(company);
                                  setShowCompanyMenu(false);
                                }}
                                className={`w-full px-4 py-2 text-sm hover:bg-primary-50 transition-colors ${isRTL ? 'text-right' : 'text-left'} ${
                                  !isConsolidatedView && currentCompany?.id === company.id ? 'bg-primary-50 text-primary-700 font-semibold' : 'text-gray-700'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <Building2 className="h-4 w-4 flex-shrink-0" />
                                  <div>
                                    <div className="font-medium">{language === 'ar' && company.name_ar ? company.name_ar : company.name_en}</div>
                                    <div className="text-xs text-gray-500">{company.commercial_registration}</div>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-2 sm:space-x-4' : 'space-x-2 sm:space-x-4'}`}>
              <button
                onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
                className={`flex items-center ${isRTL ? 'space-x-reverse space-x-2' : 'space-x-2'} px-3 py-2 text-gray-700 hover:bg-gradient-to-r hover:from-primary-50 hover:to-blue-50 hover:text-primary-600 rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-sm`}
                title={language === 'en' ? 'Switch to Arabic' : 'التبديل إلى الإنجليزية'}
              >
                <Languages className="h-5 w-5" />
                <span className="text-sm font-medium">{language === 'en' ? 'العربية' : 'English'}</span>
              </button>
              <div className={`hidden sm:flex items-center ${isRTL ? 'space-x-reverse space-x-2' : 'space-x-2'} px-3 py-2 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200 hover:border-primary-300 transition-all duration-200`}>
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary-600 to-primary-700 rounded-full blur opacity-20"></div>
                  <div className="relative h-8 w-8 bg-gradient-to-br from-primary-600 to-primary-700 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-lg">
                    {user?.email?.charAt(0).toUpperCase()}
                  </div>
                </div>
                <span className="text-sm text-gray-700 max-w-[150px] truncate font-medium">{user?.email}</span>
              </div>
              <NotificationCenter />
              <button
                onClick={handleSignOut}
                className={`flex items-center ${isRTL ? 'space-x-reverse space-x-2' : 'space-x-2'} px-3 py-2 text-gray-700 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 hover:text-red-600 rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-sm`}
              >
                <LogOut className="h-5 w-5" />
                <span className="text-sm hidden sm:inline font-medium">{t.auth.signOut}</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className={`flex ${isRTL ? 'flex-row-reverse' : ''} flex-1 overflow-hidden`}>
        <aside
          className={`
            sidebar-nav
            fixed top-16 bottom-0 ${isRTL ? 'right-0' : 'left-0'} z-30
            w-72 bg-gradient-to-b from-white to-gray-50 ${isRTL ? 'border-l' : 'border-r'} border-gray-200
            transition-transform duration-300 ease-in-out
            overflow-y-auto shadow-2xl
            ${sidebarOpen ? 'translate-x-0' : isRTL ? 'sidebar-hidden-rtl' : 'sidebar-hidden-ltr'}
          `}
        >
          <nav className="p-4 space-y-6 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-50/20 via-transparent to-blue-50/20 pointer-events-none"></div>
            <div className="relative">
            {navSections.map((section) => (
              <div key={section.title}>
                <h3 className={`px-3 mb-3 text-xs font-bold text-gray-600 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'} flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="h-0.5 w-6 bg-gradient-to-r from-primary-500 to-transparent rounded-full"></div>
                  {section.title}
                </h3>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setSidebarOpen(false)}
                        className={`
                          group flex items-center ${isRTL ? 'flex-row-reverse' : ''} gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative overflow-hidden
                          ${
                            active
                              ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg shadow-primary-200 scale-105'
                              : 'text-gray-700 hover:bg-white hover:shadow-md hover:scale-102 hover:-translate-y-0.5'
                          }
                        `}
                      >
                        {!active && (
                          <div className="absolute inset-0 bg-gradient-to-r from-primary-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                        )}
                        <Icon className={`relative h-5 w-5 transition-transform group-hover:scale-110 group-hover:rotate-3 ${active ? 'text-white' : 'text-gray-400 group-hover:text-primary-600'}`} />
                        <span className={`relative font-medium text-sm ${active ? 'text-white' : 'group-hover:text-primary-700'} flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>{item.label}</span>
                        {(badgeCounts[item.path] || 0) > 0 && (
                          <span className={`relative min-w-[20px] h-5 px-1.5 flex items-center justify-center text-[10px] font-bold rounded-full ${
                            active ? 'bg-white text-primary-700' : 'bg-red-500 text-white'
                          }`}>
                            {badgeCounts[item.path]}
                          </span>
                        )}
                        {active && (
                          <div className={`absolute ${isRTL ? 'left-0' : 'right-0'} top-1/2 -translate-y-1/2 h-8 w-1 bg-white rounded-full shadow-lg`}></div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
            </div>
          </nav>
        </aside>

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-gradient-to-br from-black/50 to-black/30 z-20 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-[1920px] mx-auto w-full">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
