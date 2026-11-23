import { useEffect, useRef, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getHomeRouteByPerfil, useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import type { PerfilAcesso } from '../types/api';

interface ProtectedRouteProps {
  allowedRoles: PerfilAcesso[];
  children: ReactNode;
}

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { isLoading, isAuthenticated, perfil } = useAuth();
  const location = useLocation();
  const toast = useToast();
  const warnedRef = useRef(false);

  const semPermissao =
    !isLoading && isAuthenticated && perfil !== null && !allowedRoles.includes(perfil);

  useEffect(() => {
    if (semPermissao && !warnedRef.current) {
      warnedRef.current = true;
      toast.info(
        'Área restrita',
        'Você foi redirecionado para o portal correspondente ao seu perfil.'
      );
    }
  }, [semPermissao, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-[28px] bg-white border border-[#E2E8F0] p-8 shadow-soft space-y-4">
          <div className="h-4 w-32 rounded-full bg-[#EFF4FB] animate-pulse" />
          <div className="h-8 w-3/4 rounded-2xl bg-[#EFF4FB] animate-pulse" />
          <div className="h-24 w-full rounded-2xl bg-[#EFF4FB] animate-pulse" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !perfil) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!allowedRoles.includes(perfil)) {
    return <Navigate to={getHomeRouteByPerfil(perfil)} replace />;
  }

  return <>{children}</>;
}
