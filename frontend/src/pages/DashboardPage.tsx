import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  CalendarClock,
  Clock,
  MapPin,
  Monitor,
  Phone,
  Scissors,
  Sparkles,
  Stethoscope,
  Syringe,
} from 'lucide-react';
import { getHomeRouteByPerfil, useAuth } from '../contexts/AuthContext';
import { agendasApi, servicosApi, unidadesApi } from '../services/api';
import type {
  CategoriaServico,
  ServicoDTO,
  UnidadeSaudeDTO,
  VagaDisponivelDTO,
} from '../types/api';
import {
  LABELS_CATEGORIA_SERVICO,
  LABELS_MODO_ACESSO,
  LABELS_NIVEL_ACESSO,
  formatarDataCurta,
  formatarHora,
} from '../utils/formatters';
import { Navbar } from '../components/layout/Navbar';
import { EmptyState } from '../components/ui/EmptyState';
import { NumberedCard } from '../components/ui/NumberedCard';
import { PillButton } from '../components/ui/PillButton';
import { CardSkeleton, Skeleton } from '../components/ui/Skeleton';
import { StatusBadge } from '../components/ui/StatusBadge';

function iconeCategoria(categoria: CategoriaServico) {
  switch (categoria) {
    case 'CONSULTA':
      return <Stethoscope className="h-5 w-5" />;
    case 'PROCEDIMENTO':
      return <Syringe className="h-5 w-5" />;
    case 'CIRURGIA':
      return <Scissors className="h-5 w-5" />;
  }
}

export function DashboardPage() {
  const { usuario, perfil } = useAuth();

  const [unidades, setUnidades] = useState<UnidadeSaudeDTO[]>([]);
  const [servicos, setServicos] = useState<ServicoDTO[]>([]);
  const [vagas, setVagas] = useState<VagaDisponivelDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [erroCarga, setErroCarga] = useState<string | null>(null);

  const [categoriaFiltro, setCategoriaFiltro] = useState<
    CategoriaServico | 'TODAS'
  >('TODAS');
  const [unidadeFiltro, setUnidadeFiltro] = useState<string>('TODAS');
  const [servicoFiltro, setServicoFiltro] = useState<string>('TODOS');

  useEffect(() => {
    let ativo = true;
    const carregar = async () => {
      setLoading(true);
      setErroCarga(null);
      try {
        const [resUnidades, resServicos, resVagas] = await Promise.all([
          unidadesApi.listar({ status: 'ATIVA' }),
          servicosApi.listar(),
          agendasApi.listarDisponiveis(),
        ]);
        if (!ativo) return;
        setUnidades(resUnidades.unidades);
        setServicos(resServicos.servicos);
        setVagas(resVagas.vagas);
      } catch {
        if (ativo) {
          setErroCarga(
            'Não foi possível carregar os dados da rede SUS. Verifique se o servidor está em execução na porta 3333.'
          );
        }
      } finally {
        if (ativo) setLoading(false);
      }
    };
    void carregar();
    return () => {
      ativo = false;
    };
  }, []);

  const servicosFiltrados = useMemo(() => {
    if (categoriaFiltro === 'TODAS') return servicos;
    return servicos.filter((s) => s.categoria === categoriaFiltro);
  }, [servicos, categoriaFiltro]);

  const vagasFiltradas = useMemo(() => {
    return vagas.filter((v) => {
      if (unidadeFiltro !== 'TODAS' && v.unidadeId !== unidadeFiltro) {
        return false;
      }
      if (servicoFiltro !== 'TODOS' && v.servicoId !== servicoFiltro) {
        return false;
      }
      return true;
    });
  }, [vagas, unidadeFiltro, servicoFiltro]);

  const totalVagasAbertas = useMemo(
    () => vagas.reduce((acc, item) => acc + item.vagasDisponiveis, 0),
    [vagas]
  );

  const homeRoute = perfil ? getHomeRouteByPerfil(perfil) : '/login';
  const destinoAgendar =
    perfil === 'PACIENTE' ? '/paciente?aba=agendar' : homeRoute;
  const labelPerfil =
    perfil === 'PACIENTE'
      ? 'Cidadão'
      : perfil
        ? LABELS_NIVEL_ACESSO[perfil]
        : '';

  return (
    <div className="min-h-screen overflow-x-clip bg-[#F8FAFC] text-[#0F172A]">
      <Navbar variant="portal" />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 pb-20 space-y-12">
        {erroCarga && (
          <div className="rounded-[20px] border border-amber-200 bg-amber-50 px-5 py-3.5 text-sm text-amber-800">
            {erroCarga}
          </div>
        )}

        {/* Cabeçalho do Dashboard + KPIs */}
        <section className="rounded-[24px] sm:rounded-[32px] bg-white border border-[#E2E8F0] p-5 sm:p-10 shadow-soft space-y-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="min-w-0">
              <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-[#EFF4FB] border border-[#DBEAFE] px-3.5 py-1.5 text-xs font-medium text-[#1E6BFF]">
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Dashboard da Rede SUS · {labelPerfil}</span>
              </div>

              <h1 className="mt-4 font-display text-2xl sm:text-4xl font-normal tracking-tight text-[#0F172A] break-words">
                Olá, <span className="text-[#1E6BFF]">{usuario?.nomeExibicao}</span>
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-[#64748B] leading-relaxed">
                Consulte os serviços ofertados, unidades ativas e horários
                disponíveis na rede pública ou acesse diretamente o seu portal.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0">
              <PillButton
                to={homeRoute}
                size="lg"
                variant="primary"
                className="w-full sm:w-auto"
              >
                Ir para Meu Portal
              </PillButton>
              <PillButton
                to="/painel"
                size="lg"
                variant="secondary"
                hideIconCircle
                className="w-full sm:w-auto"
              >
                <Monitor className="h-4 w-4 shrink-0" />
                Painel Público
              </PillButton>
            </div>
          </div>

          <div className="pt-6 border-t border-[#E2E8F0] grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              {loading ? (
                <Skeleton className="h-10 w-20" />
              ) : (
                <p className="kpi-number text-4xl sm:text-[42px] text-[#0F172A]">
                  {String(unidades.length).padStart(2, '0')}
                </p>
              )}
              <p className="mt-2 text-xs text-[#64748B] leading-relaxed">
                Unidades ativas com painel público
              </p>
            </div>

            <div>
              {loading ? (
                <Skeleton className="h-10 w-20" />
              ) : (
                <p className="kpi-number text-4xl sm:text-[42px] text-[#0F172A]">
                  {String(servicos.length).padStart(2, '0')}
                </p>
              )}
              <p className="mt-2 text-xs text-[#64748B] leading-relaxed">
                Serviços e especialidades disponíveis para marcação
              </p>
            </div>

            <div>
              {loading ? (
                <Skeleton className="h-10 w-24" />
              ) : (
                <p className="kpi-number text-4xl sm:text-[42px] text-[#1E6BFF]">
                  {totalVagasAbertas}
                </p>
              )}
              <p className="mt-2 text-xs text-[#64748B] leading-relaxed">
                Vagas abertas em {vagas.length} horários publicados agora
              </p>
            </div>
          </div>
        </section>

        {/* Serviços */}
        <section id="servicos" className="scroll-mt-24 space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#1E6BFF]">
                Catálogo de serviços
              </span>
              <h2 className="mt-2 font-display text-2xl sm:text-3xl font-normal tracking-tight text-[#0F172A]">
                Serviços disponíveis na rede
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-[#64748B]">
                Consulte especialidades ativas, modalidade de acesso e orientações
                de preparo antes de confirmar seu horário.
              </p>
            </div>

            {/* Filtro por categoria - Mobile-first (2 colunas no smartphone, pill no desktop) */}
            <div className="grid grid-cols-2 sm:inline-flex w-full sm:w-auto items-center gap-1.5 rounded-2xl sm:rounded-full bg-white border border-[#E2E8F0] p-1.5 shadow-pill">
              {(
                [
                  { id: 'TODAS', label: 'Todos' },
                  { id: 'CONSULTA', label: 'Consultas' },
                  { id: 'PROCEDIMENTO', label: 'Procedimentos' },
                  { id: 'CIRURGIA', label: 'Cirurgias' },
                ] as const
              ).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoriaFiltro(cat.id)}
                  className={`w-full sm:w-auto text-center rounded-xl sm:rounded-full px-4 py-2 sm:py-1.5 text-xs font-medium transition-colors ${
                    categoriaFiltro === cat.id
                      ? 'bg-[#1E6BFF] text-white'
                      : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#EFF4FB]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {servicosFiltrados.map((servico, idx) => (
                <NumberedCard
                  key={servico.id}
                  index={idx + 1}
                  icon={iconeCategoria(servico.categoria)}
                  title={servico.nome}
                  description={
                    servico.orientacoesPreparo ||
                    `Especialidade ${servico.especialidade}. Leve documento com foto e o Cartão SUS.`
                  }
                  badge={
                    <StatusBadge tone="info">
                      {LABELS_CATEGORIA_SERVICO[servico.categoria]}
                    </StatusBadge>
                  }
                  actionLabel={
                    perfil === 'PACIENTE' ? 'Agendar serviço' : 'Ver no portal'
                  }
                  actionTo={
                    perfil === 'PACIENTE'
                      ? `/paciente?aba=agendar&servicoId=${servico.id}`
                      : homeRoute
                  }
                  rightMeta={
                    <span className="inline-flex items-center gap-1 font-medium text-[#0F172A]">
                      {servico.especialidade} · {LABELS_MODO_ACESSO[servico.modoAcesso]}
                    </span>
                  }
                />
              ))}
            </div>
          )}
        </section>

        {/* Unidades */}
        <section id="unidades" className="scroll-mt-24 space-y-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#1E6BFF]">
              Rede de atendimento
            </span>
            <h2 className="mt-2 font-display text-2xl sm:text-3xl font-normal tracking-tight text-[#0F172A]">
              Unidades de saúde ativas
            </h2>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : unidades.length === 0 ? (
            <EmptyState
              icon={<Building2 className="h-6 w-6" />}
              title="Nenhuma unidade ativa encontrada"
              description="As unidades cadastradas pelo administrador aparecerão aqui automaticamente."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {unidades.map((u, idx) => (
                <NumberedCard
                  key={u.id}
                  index={idx + 1}
                  icon={<Building2 className="h-5 w-5" />}
                  title={u.nome}
                  badge={
                    <StatusBadge tone="success" dot>
                      Ativa
                    </StatusBadge>
                  }
                  actionLabel="Ver Painel Público"
                  actionTo={`/painel/${u.id}`}
                  rightMeta={u.cnes ? `CNES ${u.cnes}` : u.endereco.municipio}
                >
                  <div className="space-y-2 text-xs text-[#64748B]">
                    <p className="flex items-start gap-2">
                      <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[#1E6BFF]" />
                      <span>
                        {u.endereco.logradouro}, {u.endereco.numero},{' '}
                        {u.endereco.bairro}, {u.endereco.municipio}/{u.endereco.estado}
                      </span>
                    </p>
                    {u.telefone && (
                      <p className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 shrink-0 text-[#1E6BFF]" />
                        <span>{u.telefone}</span>
                      </p>
                    )}
                  </div>
                </NumberedCard>
              ))}
            </div>
          )}
        </section>

        {/* Agendas / Vagas Disponíveis */}
        <section id="agendas" className="scroll-mt-24 space-y-6">
          <div className="rounded-[28px] bg-white border border-[#E2E8F0] p-6 sm:p-8 shadow-soft space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#1E6BFF]">
                  Agenda aberta
                </span>
                <h2 className="mt-1.5 font-display text-2xl sm:text-3xl font-normal tracking-tight text-[#0F172A]">
                  Horários e vagas disponíveis
                </h2>
              </div>

              <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
                <select
                  aria-label="Filtrar vagas por unidade"
                  value={unidadeFiltro}
                  onChange={(e) => setUnidadeFiltro(e.target.value)}
                  className="rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2 text-xs font-medium text-[#0F172A] focus:border-[#1E6BFF] focus:outline-none"
                >
                  <option value="TODAS">Todas as unidades</option>
                  {unidades.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome}
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Filtrar vagas por serviço"
                  value={servicoFiltro}
                  onChange={(e) => setServicoFiltro(e.target.value)}
                  className="rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2 text-xs font-medium text-[#0F172A] focus:border-[#1E6BFF] focus:outline-none"
                >
                  <option value="TODOS">Todos os serviços</option>
                  {servicos.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Skeleton className="h-32 rounded-[20px]" />
                <Skeleton className="h-32 rounded-[20px]" />
                <Skeleton className="h-32 rounded-[20px]" />
              </div>
            ) : vagasFiltradas.length === 0 ? (
              <EmptyState
                icon={<CalendarClock className="h-6 w-6" />}
                title="Nenhuma vaga aberta para os filtros selecionados"
                description="Altere os filtros de unidade/serviço ou aguarde a publicação de novas agendas pela equipe da unidade."
                className="border-dashed bg-[#F8FAFC]"
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {vagasFiltradas.slice(0, 9).map((vaga) => (
                  <div
                    key={vaga.id}
                    className="min-w-0 rounded-[20px] border border-[#E2E8F0] bg-[#F8FAFC]/60 p-5 flex flex-col justify-between hover:bg-white hover:border-[#1E6BFF]/35 hover:shadow-soft transition-all"
                  >
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <StatusBadge tone="info">
                          {formatarDataCurta(vaga.dataHoraInicio)} ·{' '}
                          {formatarHora(vaga.dataHoraInicio)}
                        </StatusBadge>
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-full px-2.5 py-0.5">
                          {vaga.vagasDisponiveis}{' '}
                          {vaga.vagasDisponiveis === 1 ? 'vaga' : 'vagas'}
                        </span>
                      </div>

                      <h3 className="mt-3 font-display text-base font-medium text-[#0F172A]">
                        {vaga.servicoNome}
                      </h3>
                      <p className="mt-1 text-xs text-[#64748B]">
                        {vaga.unidadeNome}
                      </p>
                      {vaga.profissionalNome && (
                        <p className="mt-1 text-xs text-[#64748B]">
                          Profissional: {vaga.profissionalNome}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#E2E8F0]/70 flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 text-[11px] text-[#64748B]">
                        <Clock className="h-3 w-3" />
                        {vaga.especialidade}
                      </span>
                      <Link
                        to={
                          perfil === 'PACIENTE'
                            ? `/paciente?aba=agendar&unidadeId=${vaga.unidadeId}&servicoId=${vaga.servicoId}`
                            : homeRoute
                        }
                        className="text-xs font-semibold text-[#1E6BFF] hover:text-[#1554D9]"
                      >
                        {perfil === 'PACIENTE' ? 'Agendar horário →' : 'Acessar portal →'}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {vagasFiltradas.length > 9 && (
              <div className="flex justify-center pt-2">
                <PillButton to={destinoAgendar} variant="secondary">
                  Ver todos os {vagasFiltradas.length} horários no Portal
                </PillButton>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
