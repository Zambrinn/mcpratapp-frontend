import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import {
  ClientsPage,
  DashboardPage,
  LoginPage,
  ProductsPage,
  RegisterPage,
  ReportsPage,
  SalesPage,
  UnauthorizedPage,
  UsersPage,
} from '@pages/index';
import { PrivateRoute } from '@components/PrivateRoute';
import { useAuth } from './context/AuthContext';
import { UserRole } from './types/index';

function DefaultRoute() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <DashboardPage />
                </PrivateRoute>
              }
            />

            <Route
              path="/clients"
              element={
                <PrivateRoute>
                  <ClientsPage />
                </PrivateRoute>
              }
            />

            <Route
              path="/products"
              element={
                <PrivateRoute>
                  <ProductsPage />
                </PrivateRoute>
              }
            />

            <Route
              path="/sales"
              element={
                <PrivateRoute>
                  <SalesPage />
                </PrivateRoute>
              }
            />

            <Route
              path="/reports"
              element={
                <PrivateRoute>
                  <ReportsPage />
                </PrivateRoute>
              }
            />

            <Route
              path="/users"
              element={
                <PrivateRoute requiredRole={UserRole.ADMIN}>
                  <UsersPage />
                </PrivateRoute>
              }
            />

            <Route path="/" element={<DefaultRoute />} />
            <Route path="*" element={<DefaultRoute />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
