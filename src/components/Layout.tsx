import { ReactNode } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
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
} from 'lucide-react';
import { useState } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, signOut } = useAuth();
  const { currentCompany, companies, setCurrentCompany } = useCompany();
  const navigate = useNavigate();
  const location = useLocation();
  const [showCompanyMenu, setShowCompanyMenu] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/employees', icon: Users, label: 'Employees' },
    { path: '/payroll', icon: DollarSign, label: 'Payroll' },
    { path: '/loans', icon: CreditCard, label: 'Loans' },
    { path: '/advances', icon: Receipt, label: 'Advances' },
    { path: '/leave', icon: Calendar, label: 'Leave' },
    { path: '/attendance', icon: Clock, label: 'Attendance' },
    { path: '/performance', icon: TrendingUp, label: 'Performance' },
    { path: '/training', icon: GraduationCap, label: 'Training' },
    { path: '/documents', icon: FileText, label: 'Documents' },
    { path: '/compliance', icon: BarChart3, label: 'Compliance' },
    { path: '/vehicles', icon: Car, label: 'Vehicles' },
    { path: '/gov-docs', icon: Briefcase, label: 'Gov Docs' },
    { path: '/real-estate', icon: Home, label: 'Real Estate' },
    { path: '/contracts', icon: Briefcase, label: 'Contracts' },
    { path: '/insurance', icon: Shield, label: 'Insurance' },
    { path: '/travel', icon: Plane, label: 'Travel' },
    { path: '/expenses', icon: Receipt, label: 'Expenses' },
    { path: '/visas', icon: CreditCard, label: 'Visas' },
    { path: '/gov-subscriptions', icon: Globe, label: 'Gov Subscriptions' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Building2 className="h-8 w-8 text-primary-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Saudi HR System</h1>
                {currentCompany && (
                  <div className="relative">
                    <button
                      onClick={() => setShowCompanyMenu(!showCompanyMenu)}
                      className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
                    >
                      {currentCompany.name_en}
                      <ChevronDown className="h-3 w-3" />
                    </button>
                    {showCompanyMenu && companies.length > 1 && (
                      <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                        {companies.map((company) => (
                          <button
                            key={company.id}
                            onClick={() => {
                              setCurrentCompany(company);
                              setShowCompanyMenu(false);
                            }}
                            className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${
                              company.id === currentCompany.id ? 'bg-primary-50 text-primary-700' : ''
                            }`}
                          >
                            {company.name_en}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">{user?.email}</span>
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
              >
                <LogOut className="h-5 w-5" />
                <span className="text-sm">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        <aside className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-4rem)]">
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${
                    isActive(item.path)
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
