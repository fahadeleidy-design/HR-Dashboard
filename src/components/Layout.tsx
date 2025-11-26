import { ReactNode } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { useLanguage } from '@/contexts/LanguageContext';
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
} from 'lucide-react';
import { useState } from 'react';
import { NotificationCenter } from './NotificationCenter';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, signOut } = useAuth();
  const { currentCompany, companies, setCurrentCompany } = useCompany();
  const { language, setLanguage, t, isRTL } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [showCompanyMenu, setShowCompanyMenu] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navSections = [
    {
      title: t.nav.coreHR,
      items: [
        { path: '/', icon: LayoutDashboard, label: t.nav.dashboard },
        { path: '/employees', icon: Users, label: t.nav.employees },
        { path: '/org-chart', icon: TrendingUp, label: t.nav.orgChart },
        { path: '/handbook', icon: BookOpen, label: t.nav.handbook },
        { path: '/attendance', icon: Clock, label: t.nav.attendance },
        { path: '/leave', icon: Calendar, label: t.nav.leave },
      ]
    },
    {
      title: t.nav.payrollFinance,
      items: [
        { path: '/payroll', icon: DollarSign, label: t.nav.payroll },
        { path: '/loans', icon: CreditCard, label: t.nav.loans },
        { path: '/advances', icon: Receipt, label: t.nav.advances },
        { path: '/expenses', icon: Receipt, label: t.nav.expenses },
        { path: '/end-of-service', icon: Calculator, label: t.nav.endOfService },
      ]
    },
    {
      title: t.nav.talentManagement,
      items: [
        { path: '/performance', icon: TrendingUp, label: t.nav.performance },
        { path: '/training', icon: GraduationCap, label: t.nav.training },
        { path: '/documents', icon: FileText, label: t.nav.documents },
      ]
    },
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
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
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
                  {currentCompany && (
                    <div className="relative">
                      <button
                        onClick={() => setShowCompanyMenu(!showCompanyMenu)}
                        className={`text-xs sm:text-sm text-gray-600 hover:text-primary-600 flex items-center gap-1 transition-all duration-200 hover:scale-105 ${isRTL ? 'flex-row-reverse' : ''}`}
                      >
                        <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="max-w-[200px] truncate font-medium">{language === 'ar' && currentCompany.name_ar ? currentCompany.name_ar : currentCompany.name_en}</span>
                        <ChevronDown className={`h-3 w-3 flex-shrink-0 transition-transform ${showCompanyMenu ? 'rotate-180' : ''}`} />
                      </button>
                      {showCompanyMenu && companies.length > 1 && (
                        <div className={`absolute top-full ${isRTL ? 'right-0' : 'left-0'} mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden`}>
                          <div className="p-2 bg-gray-50 border-b border-gray-200">
                            <p className={`text-xs font-semibold text-gray-500 uppercase tracking-wide px-2 ${isRTL ? 'text-right' : 'text-left'}`}>{t.common.switchCompany}</p>
                          </div>
                          {companies.map((company) => (
                            <button
                              key={company.id}
                              onClick={() => {
                                setCurrentCompany(company);
                                setShowCompanyMenu(false);
                              }}
                              className={`w-full ${isRTL ? 'text-right' : 'text-left'} px-4 py-3 hover:bg-gray-50 transition-colors ${
                                company.id === currentCompany.id
                                  ? `bg-primary-50 text-primary-700 font-medium ${isRTL ? 'border-r-4' : 'border-l-4'} border-primary-600`
                                  : `${isRTL ? 'border-r-4' : 'border-l-4'} border-transparent`
                              }`}
                            >
                              <p className="font-medium">{language === 'ar' && company.name_ar ? company.name_ar : company.name_en}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{language === 'ar' ? company.name_en : company.name_ar}</p>
                            </button>
                          ))}
                        </div>
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
            fixed lg:static top-16 bottom-0 ${isRTL ? 'right-0' : 'left-0'} z-30
            w-72 bg-gradient-to-b from-white to-gray-50 ${isRTL ? 'border-l' : 'border-r'} border-gray-200
            transition-transform duration-300 ease-in-out
            overflow-y-auto shadow-2xl lg:shadow-none
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
            className="fixed inset-0 bg-gradient-to-br from-black/50 to-black/30 z-20 lg:hidden backdrop-blur-sm animate-in fade-in duration-200"
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
