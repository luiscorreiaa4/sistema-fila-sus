import { Link } from 'react-router-dom';
import {
  CalendarClock,
  CheckCircle2,
  HeartHandshake,
  Monitor,
  ShieldCheck,
  Sparkles,
  UserPlus,
} from 'lucide-react';
import { BrandVisualPanel } from '../components/layout/BrandVisualPanel';
import { Navbar } from '../components/layout/Navbar';
import { PillButton } from '../components/ui/PillButton';

export function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-clip bg-[#F8FAFC] text-[#0F172A] flex flex-col">
      <Navbar variant="landing" />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 pb-16 space-y-12 sm:space-y-14">
        {/* Hero */}
        <section className="rounded-[24px] sm:rounded-[32px] bg-white border border-[#E2E8F0] p-5 sm:p-10 lg:p-12 shadow-soft">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
            {/* Esquerda */}
            <div className="min-w-0 lg:col-span-7 flex flex-col justify-between py-2">
              <div>
                <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-[#EFF4FB] border border-[#DBEAFE] px-3.5 py-1.5 text-xs font-medium text-[#1E6BFF]">
                  <Sparkles className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Transparência nas Filas do SUS · Maceió</span>
                </div>

                <h1 className="hero-title mt-6 text-[30px] sm:text-5xl lg:text-[54px] text-[#0F172A] break-words">
                  Atendimento público com{' '}
                  <span className="text-[#1E6BFF]">previsibilidade e respeito</span>.
                </h1>

                <p className="mt-5 max-w-xl text-sm sm:text-base text-[#64748B] leading-relaxed">
                  Agende consultas e exames pelo celular, acompanhe sua posição
                  na fila presencial em tempo real e confira o painel de
                  chamadas sem expor seus dados pessoais.
                </p>

                <div className="mt-8 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
                  <PillButton
                    to="/cadastro"
                    size="lg"
                    variant="primary"
                    className="w-full sm:w-auto"
                  >
                    Criar conta gratuita
                  </PillButton>
                  <PillButton
                    to="/login"
                    size="lg"
                    variant="secondary"
                    hideIconCircle
                    className="w-full sm:w-auto"
                  >
                    Entrar no Portal
                  </PillButton>
                  <Link
                    to="/painel"
                    className="inline-flex items-center justify-center sm:justify-start gap-1.5 px-3 py-2 text-sm font-medium text-[#64748B] hover:text-[#1E6BFF] transition-colors"
                  >
                    <Monitor className="h-4 w-4 shrink-0" />
                    Abrir Painel Público →
                  </Link>
                </div>
              </div>

              {/* Strip compacta de diferenciais */}
              <div className="mt-10 pt-7 border-t border-[#E2E8F0] grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="space-y-1">
                  <p className="font-display text-lg font-semibold text-[#0F172A]">
                    100% gratuito
                  </p>
                  <p className="text-xs text-[#64748B] leading-relaxed">
                    Acesso aberto ao cidadão com CPF e Cartão Nacional de Saúde.
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="font-display text-lg font-semibold text-[#0F172A]">
                    Privacidade LGPD
                  </p>
                  <p className="text-xs text-[#64748B] leading-relaxed">
                    Os painéis de TV exibem apenas senha, sala e horário.
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="font-display text-lg font-semibold text-[#1E6BFF]">
                    Prioridade legal
                  </p>
                  <p className="text-xs text-[#64748B] leading-relaxed">
                    Idosos 60+ e PcD identificados automaticamente no check-in.
                  </p>
                </div>
              </div>
            </div>

            {/* Direita (Painel Azul Cobalto) */}
            <div className="min-w-0 lg:col-span-5 flex">
              <BrandVisualPanel
                className="w-full"
                headline="Informações claras para o cidadão."
                description="A prioridade legal é calculada automaticamente no check-in. O painel público não mostra dados pessoais."
                badges={[
                  {
                    icon: <ShieldCheck className="h-4 w-4" />,
                    title: 'Painel público',
                    subtitle: 'Mostra apenas senha, guichê e horário',
                  },
                  {
                    icon: <CalendarClock className="h-4 w-4" />,
                    title: 'Fila em tempo real',
                    subtitle: 'Sua posição e quantas pessoas estão à frente, pelo celular',
                  },
                  {
                    icon: <HeartHandshake className="h-4 w-4" />,
                    title: 'Prioridade legal',
                    subtitle: 'Idosos 60+ e pessoas com deficiência',
                  },
                ]}
              />
            </div>
          </div>
        </section>

        {/* Como funciona */}
        <section id="como-funciona" className="scroll-mt-24 space-y-6">
          <div className="max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#1E6BFF]">
              Simples do início ao fim
            </span>
            <h2 className="mt-2 font-display text-2xl sm:text-3xl font-normal tracking-tight text-[#0F172A]">
              Como funciona o atendimento
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <article className="rounded-[24px] bg-white border border-[#E2E8F0] p-6 shadow-soft flex flex-col justify-between gap-4">
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EFF4FB] text-[#1E6BFF]">
                  <UserPlus className="h-5 w-5" />
                </span>
                <span className="font-display text-xs font-semibold text-[#64748B]">
                  01
                </span>
              </div>
              <div>
                <h3 className="font-display text-lg font-medium text-[#0F172A]">
                  Autocadastro rápido
                </h3>
                <p className="mt-1.5 text-xs text-[#64748B] leading-relaxed">
                  Informe seu CPF, Cartão SUS e endereço com validação imediata
                  para acessar o portal do cidadão.
                </p>
              </div>
            </article>

            <article className="rounded-[24px] bg-white border border-[#E2E8F0] p-6 shadow-soft flex flex-col justify-between gap-4">
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EFF4FB] text-[#1E6BFF]">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
                <span className="font-display text-xs font-semibold text-[#64748B]">
                  02
                </span>
              </div>
              <div>
                <h3 className="font-display text-lg font-medium text-[#0F172A]">
                  Agendamento online
                </h3>
                <p className="mt-1.5 text-xs text-[#64748B] leading-relaxed">
                  Escolha unidade, especialidade e horário disponível e receba
                  seu protocolo de confirmação na hora.
                </p>
              </div>
            </article>

            <article className="rounded-[24px] bg-white border border-[#E2E8F0] p-6 shadow-soft flex flex-col justify-between gap-4">
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EFF4FB] text-[#1E6BFF]">
                  <Monitor className="h-5 w-5" />
                </span>
                <span className="font-display text-xs font-semibold text-[#64748B]">
                  03
                </span>
              </div>
              <div>
                <h3 className="font-display text-lg font-medium text-[#0F172A]">
                  Fila transparente
                </h3>
                <p className="mt-1.5 text-xs text-[#64748B] leading-relaxed">
                  No dia da consulta, faça o check-in na recepção e acompanhe
                  chamadas e guichês pelo painel público.
                </p>
              </div>
            </article>
          </div>
        </section>

        {/* Banner de destaque */}
        <section
          id="diferenciais"
          className="scroll-mt-24 relative overflow-hidden rounded-[28px] bg-cobalt-gradient p-7 sm:p-10 text-white shadow-cobalt"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-20 -right-16 h-64 w-64 rounded-full bg-white/15 blur-3xl"
          />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-xl">
              <h2 className="font-display text-2xl sm:text-3xl font-normal tracking-tight">
                Acompanhe as chamadas das recepções agora mesmo
              </h2>
              <p className="mt-2 text-sm text-white/80 leading-relaxed">
                O Painel Público pode ser consultado a qualquer momento, sem
                precisar de login, exibindo apenas a senha, o guichê e o horário.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 shrink-0">
              <PillButton
                to="/painel"
                variant="white"
                size="lg"
                className="w-full sm:w-auto"
              >
                Ver Painel Público
              </PillButton>
              <Link
                to="/cadastro"
                className="inline-flex items-center justify-center rounded-full glass-on-cobalt px-5 py-3 text-xs font-semibold text-white hover:bg-white/25 transition-colors"
              >
                Criar conta
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#E2E8F0] bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 md:grid-cols-12 gap-8 text-xs text-[#64748B]">
          <div className="md:col-span-5 space-y-2.5">
            <div className="inline-flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-cobalt-gradient text-white">
                <svg
                  viewBox="0 0 24 24"
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
              <span className="font-display text-sm font-semibold text-[#0F172A]">
                Sistema Fila <span className="text-[#1E6BFF]">SUS</span>
              </span>
            </div>
            <p className="max-w-sm leading-relaxed">
              Plataforma acadêmica de transparência e gestão de filas públicas
              de saúde — Projeto Integrador CESMAC.
            </p>
          </div>

          <div className="md:col-span-3 space-y-2">
            <p className="font-semibold text-[#0F172A]">Acesso rápido</p>
            <ul className="space-y-1.5">
              <li>
                <Link to="/painel" className="hover:text-[#1E6BFF] transition-colors">
                  Painel Público de Chamadas
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-[#1E6BFF] transition-colors">
                  Entrar no Portal
                </Link>
              </li>
              <li>
                <Link to="/cadastro" className="hover:text-[#1E6BFF] transition-colors">
                  Autocadastro de Cidadão
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-4 space-y-2">
            <p className="font-semibold text-[#0F172A]">Compromisso LGPD</p>
            <p className="leading-relaxed">
              Nenhum dado pessoal (nome, CPF ou Cartão SUS) é exibido nos
              painéis públicos de chamada.
            </p>
          </div>
        </div>

        <div className="border-t border-[#E2E8F0] bg-[#F8FAFC]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-[#64748B]">
            <span>© 2026 Sistema Fila SUS · CESMAC</span>
            <span>Transparência, acessibilidade e prioridade legal</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
