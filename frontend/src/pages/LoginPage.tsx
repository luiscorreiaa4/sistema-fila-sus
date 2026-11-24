import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
  Stethoscope,
  UserCheck,
  Users,
} from 'lucide-react';
import { getHomeRouteByPerfil, useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { ApiError, extrairMensagemErro } from '../services/api';
import type { TipoUsuario } from '../types/api';
import { maskCpf, somenteDigitos } from '../utils/formatters';
import { BrandVisualPanel } from '../components/layout/BrandVisualPanel';
import { Navbar } from '../components/layout/Navbar';
import { FormField, TextInput } from '../components/ui/FormControls';
import { PillButton } from '../components/ui/PillButton';

export function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state as {
    cpfInicial?: string;
    from?: { pathname: string };
  } | null;

  const [tipoUsuario, setTipoUsuario] = useState<TipoUsuario>('PACIENTE');
  const [cpf, setCpf] = useState(
    state?.cpfInicial ? maskCpf(state.cpfInicial) : ''
  );
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [bloqueado, setBloqueado] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErro(null);
    setBloqueado(false);

    const cpfDigitos = somenteDigitos(cpf);
    if (cpfDigitos.length !== 11) {
      setErro('Informe um CPF válido com 11 dígitos.');
      return;
    }
    if (!senha) {
      setErro('Informe sua senha de acesso.');
      return;
    }

    setLoading(true);
    try {
      const resultado = await login({
        cpf: cpfDigitos,
        senha,
        tipoUsuario,
      });
      toast.success(
        'Acesso liberado',
        `Bem-vindo(a), ${resultado.usuario.nomeExibicao}`
      );
      const destino = getHomeRouteByPerfil(resultado.perfil);
      navigate(destino, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 423) {
        setBloqueado(true);
      }
      setErro(extrairMensagemErro(err, 'CPF ou senha inválidos'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen overflow-x-clip bg-[#F8FAFC] text-[#0F172A]">
      <Navbar variant="portal" />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="rounded-[24px] sm:rounded-[32px] bg-white border border-[#E2E8F0] p-5 sm:p-10 shadow-soft grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-stretch">
          {/* Esquerda: Formulário Minimalista */}
          <div className="min-w-0 flex flex-col justify-center py-2 sm:px-4">
            <h1 className="font-display text-2xl sm:text-4xl font-normal tracking-tight text-[#0F172A] break-words">
              Entrar no Sistema Fila SUS
            </h1>
            <p className="mt-2 text-sm text-[#64748B]">
              Escolha o tipo de acesso e informe seu CPF e senha para continuar.
            </p>

            {/* Seletor Pill de Tipo de Usuário */}
            <div
              role="tablist"
              aria-label="Tipo de usuário"
              className="mt-6 grid grid-cols-2 gap-1.5 rounded-2xl sm:rounded-full bg-[#EFF4FB] p-1.5 border border-[#DBEAFE]"
            >
              <button
                type="button"
                role="tab"
                aria-selected={tipoUsuario === 'PACIENTE'}
                onClick={() => setTipoUsuario('PACIENTE')}
                className={`min-w-0 inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl sm:rounded-full px-2.5 sm:px-4 py-2.5 text-[11px] sm:text-xs font-semibold text-center leading-tight transition-all ${
                  tipoUsuario === 'PACIENTE'
                    ? 'bg-[#1E6BFF] text-white shadow-sm'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                <Users className="h-3.5 w-3.5 shrink-0" />
                <span>Cidadão / Paciente</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={tipoUsuario === 'PROFISSIONAL'}
                onClick={() => setTipoUsuario('PROFISSIONAL')}
                className={`min-w-0 inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl sm:rounded-full px-2.5 sm:px-4 py-2.5 text-[11px] sm:text-xs font-semibold text-center leading-tight transition-all ${
                  tipoUsuario === 'PROFISSIONAL'
                    ? 'bg-[#1E6BFF] text-white shadow-sm'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                <Stethoscope className="h-3.5 w-3.5 shrink-0" />
                <span>Equipe / Profissional</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
              {erro && (
                <div
                  role="alert"
                  className={`rounded-2xl border px-4 py-3 text-xs leading-relaxed ${
                    bloqueado
                      ? 'border-amber-300 bg-amber-50 text-amber-800'
                      : 'border-red-200 bg-red-50 text-red-700'
                  }`}
                >
                  <p className="font-semibold">
                    {bloqueado
                      ? 'Conta temporariamente bloqueada'
                      : 'Falha na autenticação'}
                  </p>
                  <p className="mt-0.5">{erro}</p>
                </div>
              )}

              <FormField label="CPF" htmlFor="login-cpf" required>
                <TextInput
                  id="login-cpf"
                  inputMode="numeric"
                  autoComplete="username"
                  value={cpf}
                  onChange={(e) => setCpf(maskCpf(e.target.value))}
                  placeholder="000.000.000-00"
                />
              </FormField>

              <FormField label="Senha" htmlFor="login-senha" required>
                <div className="relative">
                  <TextInput
                    id="login-senha"
                    type={mostrarSenha ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Digite sua senha"
                    className="pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha((v) => !v)}
                    aria-label="Mostrar ou ocultar senha"
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A]"
                  >
                    {mostrarSenha ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </FormField>

              <div className="pt-2">
                <PillButton
                  type="submit"
                  size="lg"
                  fullWidth
                  loading={loading}
                >
                  Entrar no Portal
                </PillButton>
              </div>
            </form>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-2 text-xs text-[#64748B]">
              <span>Ainda não possui cadastro no portal?</span>
              <Link
                to="/cadastro"
                className="font-semibold text-[#1E6BFF] hover:text-[#1554D9]"
              >
                Realizar autocadastro de cidadão →
              </Link>
            </div>
          </div>

          {/* Direita: Painel Azul Cobalto */}
          <div className="min-w-0 flex">
            <BrandVisualPanel
              className="w-full"
              headline="Um único portal conectado às unidades de saúde."
              description="Cidadãos acessam sua fila e seus agendamentos. Atendentes, profissionais e administradores trabalham apenas nas unidades a que estão vinculados."
              badges={[
                {
                  icon: <Lock className="h-4 w-4" />,
                  title: 'Proteção contra tentativas repetidas',
                  subtitle: 'Bloqueio após 5 tentativas inválidas',
                },
                {
                  icon: <ShieldCheck className="h-4 w-4" />,
                  title: 'Acesso por perfil',
                  subtitle: 'Permissões conferidas pelo servidor',
                },
                {
                  icon: <UserCheck className="h-4 w-4" />,
                  title: 'Cidadão e equipe',
                  subtitle: 'O mesmo CPF pode operar nos dois perfis',
                },
              ]}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
