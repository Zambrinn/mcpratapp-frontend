import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LoginPage, RegisterPage, UsersPage, UnauthorizedPage } from '@pages/index';
import { PrivateRoute } from '@components/PrivateRoute';
import { useAuth } from './context/AuthContext';
import { UserRole } from './types/index';

function DefaultRoute() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role === UserRole.ADMIN) {
    return <Navigate to="/users" replace />;
  }

  return <Navigate to="/unauthorized" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

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
    </BrowserRouter>
  );
}

export default App;
