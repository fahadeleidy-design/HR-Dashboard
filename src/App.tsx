import { lazy, Suspense, ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CompanyProvider } from './contexts/CompanyContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ToastProvider } from './contexts/ToastContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PageLoadingFallback } from './components/PageLoadingFallback';

const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword').then(m => ({ default: m.ForgotPassword })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Employees = lazy(() => import('./pages/Employees').then(m => ({ default: m.Employees })));
const Payroll = lazy(() => import('./pages/Payroll').then(m => ({ default: m.Payroll })));
const Leave = lazy(() => import('./pages/Leave').then(m => ({ default: m.Leave })));
const Attendance = lazy(() => import('./pages/Attendance').then(m => ({ default: m.Attendance })));
const Performance = lazy(() => import('./pages/Performance').then(m => ({ default: m.Performance })));
const Training = lazy(() => import('./pages/Training').then(m => ({ default: m.Training })));
const Documents = lazy(() => import('./pages/Documents').then(m => ({ default: m.Documents })));
const Nitaqat = lazy(() => import('./pages/Nitaqat').then(m => ({ default: m.Nitaqat })));
const GOSI = lazy(() => import('./pages/GOSI').then(m => ({ default: m.GOSI })));
const Vehicles = lazy(() => import('./pages/Vehicles').then(m => ({ default: m.Vehicles })));
const GovernmentalDocs = lazy(() => import('./pages/GovernmentalDocs').then(m => ({ default: m.GovernmentalDocs })));
const RealEstate = lazy(() => import('./pages/RealEstate').then(m => ({ default: m.RealEstate })));
const Contracts = lazy(() => import('./pages/Contracts').then(m => ({ default: m.Contracts })));
const Insurance = lazy(() => import('./pages/Insurance').then(m => ({ default: m.Insurance })));
const Travel = lazy(() => import('./pages/Travel').then(m => ({ default: m.Travel })));
const Expenses = lazy(() => import('./pages/Expenses').then(m => ({ default: m.Expenses })));
const Visas = lazy(() => import('./pages/Visas').then(m => ({ default: m.Visas })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Loans = lazy(() => import('./pages/Loans').then(m => ({ default: m.Loans })));
const Advances = lazy(() => import('./pages/Advances').then(m => ({ default: m.Advances })));
const GovSubscriptions = lazy(() => import('./pages/GovSubscriptions').then(m => ({ default: m.GovSubscriptions })));
const EndOfService = lazy(() => import('./pages/EndOfService').then(m => ({ default: m.EndOfService })));
const AuditLog = lazy(() => import('./pages/AuditLog').then(m => ({ default: m.AuditLog })));
const OrgChart = lazy(() => import('./pages/OrgChart').then(m => ({ default: m.OrgChart })));
const EmployeeHandbook = lazy(() => import('./pages/EmployeeHandbook').then(m => ({ default: m.EmployeeHandbook })));
const EmployeeContracts = lazy(() => import('./pages/EmployeeContracts').then(m => ({ default: m.EmployeeContracts })));
const ComplianceDashboard = lazy(() => import('./pages/ComplianceDashboard').then(m => ({ default: m.ComplianceDashboard })));
const SalaryScale = lazy(() => import('./pages/SalaryScale').then(m => ({ default: m.SalaryScale })));
const Recruitment = lazy(() => import('./pages/Recruitment').then(m => ({ default: m.Recruitment })));
const PendingRequests = lazy(() => import('./pages/PendingRequests').then(m => ({ default: m.PendingRequests })));
const ManagerAssignment = lazy(() => import('./components/ManagerAssignment'));
const TenantAdministration = lazy(() => import('./pages/TenantAdministration'));
const TenantConfiguration = lazy(() => import('./pages/TenantConfiguration'));
const CrossCompanyAnalytics = lazy(() => import('./pages/CrossCompanyAnalytics'));
const PermissionsManagement = lazy(() => import('./pages/PermissionsManagement'));
const WorkflowManagement = lazy(() => import('./pages/WorkflowManagement'));
const GlobalHR = lazy(() => import('./pages/GlobalHR'));
const SkillsManagement = lazy(() => import('./pages/SkillsManagement'));
const Penalties = lazy(() => import('./pages/Penalties'));
const FinanceDashboard = lazy(() => import('./pages/FinanceDashboard').then(m => ({ default: m.FinanceDashboard })));
const FinanceReports = lazy(() => import('./pages/FinanceReports').then(m => ({ default: m.FinanceReports })));
const BudgetManagement = lazy(() => import('./pages/BudgetManagement').then(m => ({ default: m.BudgetManagement })));
const PaymentReconciliation = lazy(() => import('./pages/PaymentReconciliation').then(m => ({ default: m.PaymentReconciliation })));
const PeriodClose = lazy(() => import('./pages/PeriodClose').then(m => ({ default: m.PeriodClose })));
const GovernanceReporting = lazy(() => import('./pages/GovernanceReporting'));
const PayrollV2 = lazy(() => import('./pages/PayrollV2'));
const RecruitmentV2 = lazy(() => import('./pages/RecruitmentV2'));
const PerformanceV2 = lazy(() => import('./pages/PerformanceV2'));
const CompensationBenefits = lazy(() => import('./pages/CompensationBenefits'));
const TalentManagement = lazy(() => import('./pages/TalentManagement'));
const WorkforceAnalytics = lazy(() => import('./pages/WorkforceAnalytics'));
const OrganizationalManagement = lazy(() => import('./pages/OrganizationalManagement'));
const AIFeatures = lazy(() => import('./pages/AIFeatures'));

function ProtectedPage({ children, allowedRoles }: { children: ReactNode; allowedRoles?: string[] }) {
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <Layout>
        <ErrorBoundary>
          <Suspense fallback={<PageLoadingFallback />}>
            {children}
          </Suspense>
        </ErrorBoundary>
      </Layout>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <CompanyProvider>
            <ToastProvider>
              <ErrorBoundary>
                <Suspense fallback={<PageLoadingFallback />}>
                  <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/" element={<ProtectedPage><Dashboard /></ProtectedPage>} />
                    <Route path="/employees" element={<ProtectedPage><Employees /></ProtectedPage>} />
                    <Route path="/org-chart" element={<ProtectedPage><OrgChart /></ProtectedPage>} />
                    <Route path="/handbook" element={<ProtectedPage><EmployeeHandbook /></ProtectedPage>} />
                    <Route path="/payroll" element={<ProtectedPage><Payroll /></ProtectedPage>} />
                    <Route path="/payroll-v2" element={<ProtectedPage allowedRoles={['super_admin', 'admin', 'hr', 'finance']}><PayrollV2 /></ProtectedPage>} />
                    <Route path="/leave" element={<ProtectedPage><Leave /></ProtectedPage>} />
                    <Route path="/pending-requests" element={<ProtectedPage><PendingRequests /></ProtectedPage>} />
                    <Route path="/attendance" element={<ProtectedPage><Attendance /></ProtectedPage>} />
                    <Route path="/performance" element={<ProtectedPage><Performance /></ProtectedPage>} />
                    <Route path="/performance-v2" element={<ProtectedPage allowedRoles={['super_admin', 'admin', 'hr', 'manager']}><PerformanceV2 /></ProtectedPage>} />
                    <Route path="/recruitment-v2" element={<ProtectedPage allowedRoles={['super_admin', 'admin', 'hr']}><RecruitmentV2 /></ProtectedPage>} />
                    <Route path="/compensation" element={<ProtectedPage allowedRoles={['super_admin', 'admin', 'hr', 'finance']}><CompensationBenefits /></ProtectedPage>} />
                    <Route path="/talent-management" element={<ProtectedPage allowedRoles={['super_admin', 'admin', 'hr', 'manager']}><TalentManagement /></ProtectedPage>} />
                    <Route path="/workforce-analytics" element={<ProtectedPage allowedRoles={['super_admin', 'admin', 'hr', 'finance']}><WorkforceAnalytics /></ProtectedPage>} />
                    <Route path="/org-management" element={<ProtectedPage allowedRoles={['super_admin', 'admin', 'hr']}><OrganizationalManagement /></ProtectedPage>} />
                    <Route path="/training" element={<ProtectedPage><Training /></ProtectedPage>} />
                    <Route path="/documents" element={<ProtectedPage><Documents /></ProtectedPage>} />
                    <Route path="/nitaqat" element={<ProtectedPage allowedRoles={['hr', 'finance', 'super_admin']}><Nitaqat /></ProtectedPage>} />
                    <Route path="/gosi" element={<ProtectedPage allowedRoles={['hr', 'finance', 'super_admin']}><GOSI /></ProtectedPage>} />
                    <Route path="/vehicles" element={<ProtectedPage allowedRoles={['hr', 'finance', 'super_admin']}><Vehicles /></ProtectedPage>} />
                    <Route path="/gov-docs" element={<ProtectedPage allowedRoles={['hr', 'finance', 'super_admin']}><GovernmentalDocs /></ProtectedPage>} />
                    <Route path="/real-estate" element={<ProtectedPage allowedRoles={['hr', 'finance', 'super_admin']}><RealEstate /></ProtectedPage>} />
                    <Route path="/contracts" element={<ProtectedPage allowedRoles={['hr', 'finance', 'super_admin']}><Contracts /></ProtectedPage>} />
                    <Route path="/employee-contracts" element={<ProtectedPage allowedRoles={['hr', 'finance', 'super_admin']}><EmployeeContracts /></ProtectedPage>} />
                    <Route path="/insurance" element={<ProtectedPage allowedRoles={['hr', 'finance', 'super_admin']}><Insurance /></ProtectedPage>} />
                    <Route path="/travel" element={<ProtectedPage><Travel /></ProtectedPage>} />
                    <Route path="/expenses" element={<ProtectedPage><Expenses /></ProtectedPage>} />
                    <Route path="/visas" element={<ProtectedPage allowedRoles={['hr', 'finance', 'super_admin']}><Visas /></ProtectedPage>} />
                    <Route path="/loans" element={<ProtectedPage><Loans /></ProtectedPage>} />
                    <Route path="/advances" element={<ProtectedPage><Advances /></ProtectedPage>} />
                    <Route path="/gov-subscriptions" element={<ProtectedPage allowedRoles={['hr', 'finance', 'super_admin']}><GovSubscriptions /></ProtectedPage>} />
                    <Route path="/end-of-service" element={<ProtectedPage allowedRoles={['hr', 'finance', 'super_admin']}><EndOfService /></ProtectedPage>} />
                    <Route path="/audit-log" element={<ProtectedPage allowedRoles={['super_admin', 'hr', 'finance']}><AuditLog /></ProtectedPage>} />
                    <Route path="/compliance" element={<ProtectedPage allowedRoles={['hr', 'finance', 'super_admin']}><ComplianceDashboard /></ProtectedPage>} />
                    <Route path="/salary-scale" element={<ProtectedPage allowedRoles={['hr', 'finance', 'super_admin']}><SalaryScale /></ProtectedPage>} />
                    <Route path="/recruitment" element={<ProtectedPage allowedRoles={['hr', 'finance', 'super_admin']}><Recruitment /></ProtectedPage>} />
                    <Route path="/managers" element={<ProtectedPage allowedRoles={['hr', 'finance', 'super_admin']}><ManagerAssignment /></ProtectedPage>} />
                    <Route path="/tenant-administration" element={<ProtectedPage allowedRoles={['super_admin']}><TenantAdministration /></ProtectedPage>} />
                    <Route path="/tenant-configuration" element={<ProtectedPage allowedRoles={['super_admin', 'admin']}><TenantConfiguration /></ProtectedPage>} />
                    <Route path="/cross-company-analytics" element={<ProtectedPage allowedRoles={['super_admin', 'hr', 'finance']}><CrossCompanyAnalytics /></ProtectedPage>} />
                    <Route path="/permissions" element={<ProtectedPage allowedRoles={['super_admin', 'admin', 'hr_admin']}><PermissionsManagement /></ProtectedPage>} />
                    <Route path="/workflow" element={<ProtectedPage allowedRoles={['super_admin', 'admin', 'hr_manager', 'hr', 'finance']}><WorkflowManagement /></ProtectedPage>} />
                    <Route path="/global-hr" element={<ProtectedPage allowedRoles={['super_admin', 'admin', 'hr_manager', 'hr', 'finance']}><GlobalHR /></ProtectedPage>} />
                    <Route path="/skills" element={<ProtectedPage><SkillsManagement /></ProtectedPage>} />
                    <Route path="/penalties" element={<ProtectedPage allowedRoles={['hr', 'finance', 'admin', 'super_admin']}><Penalties /></ProtectedPage>} />
                    <Route path="/finance-dashboard" element={<ProtectedPage allowedRoles={['finance', 'hr', 'super_admin']}><FinanceDashboard /></ProtectedPage>} />
                    <Route path="/finance-reports" element={<ProtectedPage allowedRoles={['finance', 'hr', 'super_admin']}><FinanceReports /></ProtectedPage>} />
                    <Route path="/budgets" element={<ProtectedPage allowedRoles={['finance', 'hr', 'super_admin']}><BudgetManagement /></ProtectedPage>} />
                    <Route path="/payment-reconciliation" element={<ProtectedPage allowedRoles={['finance', 'hr', 'super_admin']}><PaymentReconciliation /></ProtectedPage>} />
                    <Route path="/period-close" element={<ProtectedPage allowedRoles={['finance', 'hr', 'super_admin']}><PeriodClose /></ProtectedPage>} />
                    <Route path="/governance-reports" element={<ProtectedPage allowedRoles={['super_admin', 'admin', 'hr', 'finance', 'compliance']}><GovernanceReporting /></ProtectedPage>} />
                    <Route path="/ai-features" element={<ProtectedPage allowedRoles={['super_admin', 'admin', 'hr', 'hr_admin', 'hr_manager', 'finance', 'manager']}><AIFeatures /></ProtectedPage>} />
                    <Route path="/settings" element={<ProtectedPage allowedRoles={['super_admin', 'hr', 'finance']}><Settings /></ProtectedPage>} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </ErrorBoundary>
            </ToastProvider>
          </CompanyProvider>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}

export default App;
