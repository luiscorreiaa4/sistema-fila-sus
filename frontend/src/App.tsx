import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { AdminPage } from './pages/AdminPage';
import { CadastroPacientePage } from './pages/CadastroPacientePage';
import { DashboardPage } from './pages/DashboardPage';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { OperacaoPage } from './pages/OperacaoPage';
import { PacientePage } from './pages/PacientePage';
import { PainelPublicoPage } from './pages/PainelPublicoPage';

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route
              path="/"
              element={
                <PublicOnlyRoute>
                  <LandingPage />
                </PublicOnlyRoute>
              }
            />
            <Route path="/painel" element={<PainelPublicoPage />} />
            <Route path="/painel/:unidadeId" element={<PainelPublicoPage />} />
            <Route
              path="/login"
              element={
                <PublicOnlyRoute>
                  <LoginPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/cadastro"
              element={
                <PublicOnlyRoute>
                  <CadastroPacientePage />
                </PublicOnlyRoute>
              }
            />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    'PACIENTE',
                    'ATENDENTE',
                    'PROFISSIONAL_SAUDE',
                    'ADMINISTRADOR',
                  ]}
                >
                  <DashboardPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/paciente"
              element={
                <ProtectedRoute allowedRoles={['PACIENTE']}>
                  <PacientePage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/operacao"
              element={
                <ProtectedRoute
                  allowedRoles={['ATENDENTE', 'PROFISSIONAL_SAUDE', 'ADMINISTRADOR']}
                >
                  <OperacaoPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['ADMINISTRADOR']}>
                  <AdminPage />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
