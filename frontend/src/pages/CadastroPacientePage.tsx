import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, HeartHandshake, ShieldCheck, Sparkles } from 'lucide-react';
import { getHomeRouteByPerfil, useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import type { PacienteDTO } from '../types/api';
import { PacienteCadastroForm } from '../components/forms/PacienteCadastroForm';
import { BrandVisualPanel } from '../components/layout/BrandVisualPanel';
import { Navbar } from '../components/layout/Navbar';

export function CadastroPacientePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { login } = useAuth();

  const handleSuccess = async (
    paciente: PacienteDTO,
    credenciais?: { cpf: string; senha: string }
  ) => {
    if (credenciais) {
      try {
        const resultado = await login({
          cpf: credenciais.cpf,
          senha: credenciais.senha,
          tipoUsuario: 'PACIENTE',
        });
        toast.success(
          'Cadastro concluído!',
          `Bem-vindo(a), ${resultado.usuario.nomeExibicao}.`
        );
        navigate(getHomeRouteByPerfil(resultado.perfil), { replace: true });
        return;
      } catch {
        // fallback para login caso a autenticação automática falhe
      }
    }

    toast.success(
      'Cadastro concluído',
      `Conta criada para ${paciente.nomeExibicao}. Faça login com seu CPF.`
    );
    navigate('/login', {
      replace: true,
      state: { cpfInicial: paciente.cpf },
    });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <Navbar variant="portal" />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-[32px] bg-white border border-[#E2E8F0] p-6 sm:p-10 shadow-soft grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Esquerda: Formulário Completo */}
          <div className="lg:col-span-7 space-y-6">
            <div>
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1E6BFF] hover:text-[#1554D9]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Voltar para o login
              </Link>

              <h1 className="mt-4 font-display text-3xl sm:text-4xl font-normal tracking-tight text-[#0F172A]">
                Autocadastro de cidadão
              </h1>
              <p className="mt-2 text-sm text-[#64748B]">
                Preencha seus dados civis e o Cartão Nacional de Saúde (CNS) para
                agendar consultas e acompanhar sua fila em tempo real.
              </p>
            </div>

            <PacienteCadastroForm mode="autocadastro" onSuccess={handleSuccess} />
          </div>

          {/* Direita: Painel Institucional */}
          <div className="lg:col-span-5 lg:sticky lg:top-24">
            <BrandVisualPanel
              headline="CPF e CNS são conferidos no cadastro."
              description="Seus dados servem para identificar sua vaga e aplicar a prioridade legal a idosos (60+) e pessoas com deficiência."
              badges={[
                {
                  icon: <Sparkles className="h-4 w-4" />,
                  title: 'CPF e CNS conferidos',
                  subtitle: 'Números verificados antes de salvar',
                },
                {
                  icon: <HeartHandshake className="h-4 w-4" />,
                  title: 'Nome social',
                  subtitle: 'Exibido nos atendimentos internos',
                },
                {
                  icon: <ShieldCheck className="h-4 w-4" />,
                  title: 'Privacidade',
                  subtitle: 'Seus dados nunca aparecem no painel da recepção',
                },
              ]}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
