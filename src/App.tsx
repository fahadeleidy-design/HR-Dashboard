import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CompanyProvider } from './contexts/CompanyContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Employees } from './pages/Employees';
import { Payroll } from './pages/Payroll';
import { Leave } from './pages/Leave';
import { Attendance } from './pages/Attendance';
import { Performance } from './pages/Performance';
import { Training } from './pages/Training';
import { Documents } from './pages/Documents';
import { Nitaqat } from './pages/Nitaqat';
import { GOSI } from './pages/GOSI';
import { Vehicles } from './pages/Vehicles';
import { GovernmentalDocs } from './pages/GovernmentalDocs';
import { RealEstate } from './pages/RealEstate';
import { Contracts } from './pages/Contracts';
import { Insurance } from './pages/Insurance';
import { Travel } from './pages/Travel';
import { Expenses } from './pages/Expenses';
import { Visas } from './pages/Visas';
import { Settings } from './pages/Settings';
import { Loans } from './pages/Loans';
import { Advances } from './pages/Advances';
import { GovSubscriptions } from './pages/GovSubscriptions';
import { EndOfService } from './pages/EndOfService';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CompanyProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/employees"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Employees />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/payroll"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Payroll />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/leave"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Leave />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/attendance"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Attendance />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/performance"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Performance />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/training"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Training />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/documents"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Documents />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/nitaqat"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Nitaqat />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/gosi"
              element={
                <ProtectedRoute>
                  <Layout>
                    <GOSI />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route path="/vehicles" element={<ProtectedRoute><Layout><Vehicles /></Layout></ProtectedRoute>} />
            <Route path="/gov-docs" element={<ProtectedRoute><Layout><GovernmentalDocs /></Layout></ProtectedRoute>} />
            <Route path="/real-estate" element={<ProtectedRoute><Layout><RealEstate /></Layout></ProtectedRoute>} />
            <Route path="/contracts" element={<ProtectedRoute><Layout><Contracts /></Layout></ProtectedRoute>} />
            <Route path="/insurance" element={<ProtectedRoute><Layout><Insurance /></Layout></ProtectedRoute>} />
            <Route path="/travel" element={<ProtectedRoute><Layout><Travel /></Layout></ProtectedRoute>} />
            <Route path="/expenses" element={<ProtectedRoute><Layout><Expenses /></Layout></ProtectedRoute>} />
            <Route path="/visas" element={<ProtectedRoute><Layout><Visas /></Layout></ProtectedRoute>} />
            <Route path="/loans" element={<ProtectedRoute><Layout><Loans /></Layout></ProtectedRoute>} />
            <Route path="/advances" element={<ProtectedRoute><Layout><Advances /></Layout></ProtectedRoute>} />
            <Route path="/gov-subscriptions" element={<ProtectedRoute><Layout><GovSubscriptions /></Layout></ProtectedRoute>} />
            <Route path="/end-of-service" element={<ProtectedRoute><Layout><EndOfService /></Layout></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </CompanyProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
