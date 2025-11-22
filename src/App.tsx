import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CompanyProvider } from './contexts/CompanyContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Employees } from './pages/Employees';

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
                    <div className="text-center py-12">
                      <h2 className="text-2xl font-bold text-gray-900">Payroll Management</h2>
                      <p className="text-gray-600 mt-2">Module under development</p>
                    </div>
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/leave"
              element={
                <ProtectedRoute>
                  <Layout>
                    <div className="text-center py-12">
                      <h2 className="text-2xl font-bold text-gray-900">Leave Management</h2>
                      <p className="text-gray-600 mt-2">Module under development</p>
                    </div>
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/attendance"
              element={
                <ProtectedRoute>
                  <Layout>
                    <div className="text-center py-12">
                      <h2 className="text-2xl font-bold text-gray-900">Attendance Tracking</h2>
                      <p className="text-gray-600 mt-2">Module under development</p>
                    </div>
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/performance"
              element={
                <ProtectedRoute>
                  <Layout>
                    <div className="text-center py-12">
                      <h2 className="text-2xl font-bold text-gray-900">Performance Management</h2>
                      <p className="text-gray-600 mt-2">Module under development</p>
                    </div>
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/training"
              element={
                <ProtectedRoute>
                  <Layout>
                    <div className="text-center py-12">
                      <h2 className="text-2xl font-bold text-gray-900">Training Management</h2>
                      <p className="text-gray-600 mt-2">Module under development</p>
                    </div>
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/documents"
              element={
                <ProtectedRoute>
                  <Layout>
                    <div className="text-center py-12">
                      <h2 className="text-2xl font-bold text-gray-900">Document Management</h2>
                      <p className="text-gray-600 mt-2">Module under development</p>
                    </div>
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/compliance"
              element={
                <ProtectedRoute>
                  <Layout>
                    <div className="text-center py-12">
                      <h2 className="text-2xl font-bold text-gray-900">Compliance & Reporting</h2>
                      <p className="text-gray-600 mt-2">Module under development</p>
                    </div>
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Layout>
                    <div className="text-center py-12">
                      <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
                      <p className="text-gray-600 mt-2">Module under development</p>
                    </div>
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </CompanyProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
