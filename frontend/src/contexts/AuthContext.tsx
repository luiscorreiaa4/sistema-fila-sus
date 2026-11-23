import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  authApi,
  clearStoredToken,
  getStoredToken,
  setStoredToken,
} from '../services/api';
import type {
  LoginInput,
  PerfilAcesso,
  TipoUsuario,
  UsuarioAutenticado,
} from '../types/api';
import { useToast } from './ToastContext';

interface AuthState {
  usuario: UsuarioAutenticado | null;
  tipoUsuario: TipoUsuario | null;
  perfil: PerfilAcesso | null;
  isLoading: boolean;
}

interface LoginResult {
  perfil: PerfilAcesso;
  tipoUsuario: TipoUsuario;
  usuario: UsuarioAutenticado;
}

interface AuthContextValue extends AuthState {
  isAuthenticated: boolean;
  login: (input: LoginInput) => Promise<LoginResult>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function getHomeRouteByPerfil(perfil: PerfilAcesso): string {
  switch (perfil) {
    case 'PACIENTE':
      return '/paciente';
    case 'ATENDENTE':
    case 'PROFISSIONAL_SAUDE':
      return '/operacao';
    case 'ADMINISTRADOR':
      return '/admin';
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [state, setState] = useState<AuthState>({
    usuario: null,
    tipoUsuario: null,
    perfil: null,
    isLoading: Boolean(getStoredToken()),
  });

  const carregarSessao = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setState({
        usuario: null,
        tipoUsuario: null,
        perfil: null,
        isLoading: false,
      });
      return;
    }

    try {
      const me = await authApi.me();
      setState({
        usuario: me.usuario,
        tipoUsuario: me.tipoUsuario,
        perfil: me.usuario.perfil,
        isLoading: false,
      });
    } catch {
      clearStoredToken();
      setState({
        usuario: null,
        tipoUsuario: null,
        perfil: null,
        isLoading: false,
      });
    }
  }, []);

  useEffect(() => {
    void carregarSessao();
  }, [carregarSessao]);

  useEffect(() => {
    const handleUnauthorized = () => {
      clearStoredToken();
      setState({
        usuario: null,
        tipoUsuario: null,
        perfil: null,
        isLoading: false,
      });
      toast.warning(
        'Sessão encerrada',
        'Sua autenticação expirou. Faça login novamente para continuar.'
      );
    };

    window.addEventListener('fila-sus:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('fila-sus:unauthorized', handleUnauthorized);
    };
  }, [toast]);

  const login = useCallback(async (input: LoginInput): Promise<LoginResult> => {
    const loginRes = await authApi.login(input);
    setStoredToken(loginRes.token);

    try {
      const me = await authApi.me();
      setState({
        usuario: me.usuario,
        tipoUsuario: me.tipoUsuario,
        perfil: me.usuario.perfil,
        isLoading: false,
      });
      return {
        perfil: me.usuario.perfil,
        tipoUsuario: me.tipoUsuario,
        usuario: me.usuario,
      };
    } catch (erro) {
      clearStoredToken();
      setState({
        usuario: null,
        tipoUsuario: null,
        perfil: null,
        isLoading: false,
      });
      throw erro;
    }
  }, []);

  const logout = useCallback(() => {
    clearStoredToken();
    setState({
      usuario: null,
      tipoUsuario: null,
      perfil: null,
      isLoading: false,
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      isAuthenticated: Boolean(state.usuario && state.perfil),
      login,
      logout,
      refreshUser: carregarSessao,
    }),
    [state, login, logout, carregarSessao]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser utilizado dentro de AuthProvider');
  }
  return ctx;
}
