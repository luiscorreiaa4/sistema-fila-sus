import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  ChevronDown,
  LogIn,
  LogOut,
  Menu,
  Monitor,
  User,
  X,
} from 'lucide-react';
import { getHomeRouteByPerfil, useAuth } from '../../contexts/AuthContext';
import { LABELS_NIVEL_ACESSO } from '../../utils/formatters';
import { PillButton } from '../ui/PillButton';

interface NavbarProps {
  variant?: 'landing' | 'portal';
}

export function Navbar({ variant = 'landing' }: NavbarProps) {
  const { isAuthenticated, usuario, perfil, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const homeRoute = perfil ? getHomeRouteByPerfil(perfil) : '/login';
  const perfilLabel =
    perfil === 'PACIENTE'
      ? 'Cidadão'
      : perfil
        ? LABELS_NIVEL_ACESSO[perfil]
        : '';

  const navLinks =
    variant === 'landing'
      ? [
          { label: 'Como funciona', href: '/#como-funciona', isRoute: false },
          { label: 'Diferenciais', href: '/#diferenciais', isRoute: false },
          { label: 'Painel Público', href: '/painel', isRoute: true },
        ]
      : isAuthenticated && perfil
        ? [
            { label: 'Dashboard', href: '/dashboard', isRoute: true },
            { label: 'Painel Público', href: '/painel', isRoute: true },
            { label: 'Meu Portal', href: homeRoute, isRoute: true },
            ...(perfil === 'ADMINISTRADOR'
              ? [{ label: 'Operação', href: '/operacao', isRoute: true }]
              : []),
          ]
        : [
            { label: 'Início', href: '/', isRoute: true },
            { label: 'Painel Público', href: '/painel', isRoute: true },
          ];

  const handleLogout = () => {
    setShowUserMenu(false);
    setMobileMenuOpen(false);
    logout();
    navigate('/');
  };

  return (
    <header className="sticky top-3 sm:top-4 z-40 px-3 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl flex items-center justify-between gap-2 sm:gap-3 min-w-0">
        {/* Logo */}
        <Link
          to={isAuthenticated ? '/dashboard' : '/'}
          className="inline-flex shrink-0 items-center gap-2 sm:gap-2.5 rounded-full bg-white/90 backdrop-blur-md border border-[#E2E8F0] pl-1.5 sm:pl-2 pr-3 sm:pr-4 py-1.5 shadow-pill transition-colors hover:border-[#1E6BFF]/40"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cobalt-gradient text-white">
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </span>
          <span className="font-display text-sm font-semibold tracking-tight text-[#0F172A] whitespace-nowrap">
            Fila <span className="text-[#1E6BFF]">SUS</span>
          </span>
        </Link>

        {/* Pill central */}
        <nav
          aria-label="Navegação principal"
          className="hidden md:flex items-center gap-1 rounded-full bg-white/95 backdrop-blur-md border border-[#E2E8F0] p-1.5 shadow-pill"
        >
          {navLinks.map((item) => {
            const active = item.isRoute && location.pathname === item.href;
            return item.isRoute ? (
              <Link
                key={item.href}
                to={item.href}
                className={`rounded-full px-4 py-2 text-xs font-medium transition-colors ${
                  active
                    ? 'bg-[#EFF4FB] text-[#1E6BFF]'
                    : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F4F7FC]'
                }`}
              >
                {item.label}
              </Link>
            ) : (
              <a
                key={item.href}
                href={item.href}
                className="rounded-full px-4 py-2 text-xs font-medium text-[#64748B] hover:text-[#0F172A] hover:bg-[#F4F7FC] transition-colors"
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Ações circulares à direita */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 shrink-0">
          {/* Painel Rápido */}
          <Link
            to="/painel"
            title="Painel Público"
            aria-label="Abrir Painel Público"
            className="hidden sm:flex h-10 w-10 items-center justify-center rounded-full bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#1E6BFF] hover:border-[#1E6BFF]/40 shadow-pill transition-colors"
          >
            <Monitor className="h-4 w-4" />
          </Link>

          {/* Login / Perfil */}
          {isAuthenticated && usuario ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowUserMenu((v) => !v)}
                className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-white border border-[#E2E8F0] pl-1.5 pr-2.5 sm:pr-3 py-1.5 shadow-pill hover:border-[#1E6BFF]/40 transition-colors"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#EFF4FB] text-[#1E6BFF]">
                  <User className="h-3.5 w-3.5" />
                </span>
                <span className="hidden sm:block max-w-[130px] truncate text-xs font-medium text-[#0F172A]">
                  {usuario.nomeExibicao}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-[#64748B]" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-1.5rem)] rounded-[20px] bg-white border border-[#E2E8F0] p-2 shadow-soft z-50">
                  <div className="px-3 py-2 border-b border-[#E2E8F0]/70">
                    <p className="text-xs font-semibold text-[#0F172A] truncate">
                      {usuario.nomeExibicao}
                    </p>
                    <p className="text-[11px] text-[#1E6BFF] font-medium mt-0.5">
                      {perfilLabel}
                    </p>
                  </div>
                  <div className="py-1 space-y-0.5">
                    <Link
                      to={homeRoute}
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-[#0F172A] hover:bg-[#EFF4FB] hover:text-[#1E6BFF] transition-colors"
                    >
                      <User className="h-3.5 w-3.5" />
                      Acessar meu portal
                    </Link>
                    {perfil === 'ADMINISTRADOR' && (
                      <Link
                        to="/operacao"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-[#0F172A] hover:bg-[#EFF4FB] hover:text-[#1E6BFF] transition-colors"
                      >
                        <Activity className="h-3.5 w-3.5" />
                        Área operacional
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Sair da conta
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <PillButton
              to="/login"
              size="sm"
              variant="primary"
              icon={<LogIn className="h-3.5 w-3.5" />}
            >
              Entrar
            </PillButton>
          )}

          {/* Menu Mobile */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={mobileMenuOpen}
            className="md:hidden flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white border border-[#E2E8F0] text-[#0F172A] shadow-pill"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Drawer mobile */}
      {mobileMenuOpen && (
        <div className="md:hidden mx-auto max-w-7xl mt-2 rounded-[24px] bg-white border border-[#E2E8F0] p-3 shadow-soft space-y-1">
          {navLinks.map((item) =>
            item.isRoute ? (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block rounded-2xl px-4 py-2.5 text-sm font-medium transition-colors ${
                  location.pathname === item.href
                    ? 'bg-[#EFF4FB] text-[#1E6BFF]'
                    : 'text-[#0F172A] hover:bg-[#EFF4FB] hover:text-[#1E6BFF]'
                }`}
              >
                {item.label}
              </Link>
            ) : (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-2xl px-4 py-2.5 text-sm font-medium text-[#0F172A] hover:bg-[#EFF4FB] hover:text-[#1E6BFF]"
              >
                {item.label}
              </a>
            )
          )}

          <div className="pt-2 mt-2 border-t border-[#E2E8F0] space-y-1">
            {isAuthenticated && usuario ? (
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sair da conta
              </button>
            ) : (
              <Link
                to="/cadastro"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-2xl px-4 py-2.5 text-sm font-semibold text-[#1E6BFF] hover:bg-[#EFF4FB]"
              >
                Criar conta gratuita →
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
