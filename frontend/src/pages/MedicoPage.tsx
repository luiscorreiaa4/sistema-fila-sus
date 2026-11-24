import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Ban,
  Building2,
  CalendarDays,
  CalendarPlus,
  Lock,
  Monitor,
  Radio,
  Send,
  Shield,
  Stethoscope,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  agendasApi,
  extrairMensagemErro,
  profissionaisApi,
  servicosApi,
  unidadesApi,
} from '../services/api';
import {
  isProfissional,
  type AgendaDTO,
  type ProfissionalDTO,
  type ServicoDTO,
  type SituacaoAgenda,
  type UnidadeSaudeDTO,
} from '../types/api';
import {
  DIAS_SEMANA,
  LABELS_CATEGORIA_SERVICO,
  LABELS_SITUACAO_AGENDA,
  formatarData,
} from '../utils/formatters';
import { AgendaBuilderModal } from '../components/agendas/AgendaBuilderModal';
import { AgendaClinicaView } from '../components/agendas/AgendaClinicaView';
import { Navbar } from '../components/layout/Navbar';
import { EmptyState } from '../components/ui/EmptyState';
import { PillButton } from '../components/ui/PillButton';
import { Skeleton } from '../components/ui/Skeleton';
import { StatusBadge } from '../components/ui/StatusBadge';
import { FilaTab } from './operacao/FilaTab';

type TabMedico = 'agenda' | 'consultorio' | 'escalas';

function badgeAgenda(situacao: SituacaoAgenda) {
  switch (situacao) {
    case 'PUBLICADA':
      return (
        <StatusBadge tone="success" dot>
          {LABELS_SITUACAO_AGENDA[situacao]}
        </StatusBadge>
      );
    case 'RASCUNHO':
      return <StatusBadge tone="neutral">{LABELS_SITUACAO_AGENDA[situacao]}</StatusBadge>;
    case 'BLOQUEADA':
      return <StatusBadge tone="warning">{LABELS_SITUACAO_AGENDA[situacao]}</StatusBadge>;
    case 'ENCERRADA':
      return <StatusBadge tone="danger">{LABELS_SITUACAO_AGENDA[situacao]}</StatusBadge>;
  }
}

export function MedicoPage() {
  const { usuario, tipoUsuario, perfil } = useAuth();
  const toast = useToast();

  const [tab, setTab] = useState<TabMedico>('agenda');
  const [unidades, setUnidades] = useState<UnidadeSaudeDTO[]>([]);
  const [unidadeId, setUnidadeId] = useState('');
  const [loadingUnidades, setLoadingUnidades] = useState(true);

  const [servicos, setServicos] = useState<ServicoDTO[]>([]);
  const [profissionais, setProfissionais] = useState<ProfissionalDTO[]>([]);
  const [agendas, setAgendas] = useState<AgendaDTO[]>([]);
  const [loadingEscalas, setLoadingEscalas] = useState(false);
  const [alterandoAgendaId, setAlterandoAgendaId] = useState<string | null>(null);
  const [modalNovaAgenda, setModalNovaAgenda] = useState(false);
  const [refreshGradeTrigger, setRefreshGradeTrigger] = useState(0);

  const ehProfissionalSaude =
    isProfissional(usuario, tipoUsuario) && usuario.nivelAcesso === 'PROFISSIONAL_SAUDE';
  const ehAdministrador = perfil === 'ADMINISTRADOR';

  const registroConselho = useMemo(() => {
    if (!isProfissional(usuario, tipoUsuario)) return null;
    if (usuario.conselhoProfissional && usuario.numeroRegistro && usuario.ufRegistro) {
      return `${usuario.conselhoProfissional} ${usuario.numeroRegistro}/${usuario.ufRegistro}`;
    }
    if (usuario.conselhoProfissional && usuario.numeroRegistro) {
      return `${usuario.conselhoProfissional} ${usuario.numeroRegistro}`;
    }
    return null;
  }, [usuario, tipoUsuario]);

  useEffect(() => {
    let ativo = true;
    const carregarBase = async () => {
      setLoadingUnidades(true);
      try {
        const [uRes, sRes] = await Promise.all([
          unidadesApi.listar({ status: 'ATIVA' }),
          servicosApi.listar({ incluirInativos: true }),
        ]);
        if (!ativo) return;

        let permitidas = uRes.unidades;
        if (isProfissional(usuario, tipoUsuario) && usuario.nivelAcesso !== 'ADMINISTRADOR') {
          permitidas = uRes.unidades.filter((u) =>
            usuario.unidadesVinculadas.includes(u.id)
          );
        }

        setUnidades(permitidas);
        setServicos(sRes.servicos);
        if (permitidas.length > 0) {
          setUnidadeId((prev) =>
            prev && permitidas.some((u) => u.id === prev) ? prev : permitidas[0].id
          );
        }
      } catch (err) {
        toast.error('Erro ao carregar unidades', extrairMensagemErro(err));
      } finally {
        if (ativo) setLoadingUnidades(false);
      }
    };
    void carregarBase();
    return () => {
      ativo = false;
    };
  }, [usuario, tipoUsuario, toast]);

  const carregarEscalasEProfissionais = useCallback(async () => {
    if (!unidadeId) return;
    setLoadingEscalas(true);
    try {
      const [agRes, profRes] = await Promise.all([
        agendasApi.listar({
          unidadeId,
          profissionalId: ehProfissionalSaude && usuario ? usuario.id : undefined,
        }),
        ehAdministrador
          ? profissionaisApi.listar({ unidadeId, status: 'ATIVO' })
          : Promise.resolve({ profissionais: [] as ProfissionalDTO[] }),
      ]);
      setAgendas(agRes.agendas);
      if (ehAdministrador) {
        setProfissionais(
          profRes.profissionais.filter((p) => p.nivelAcesso === 'PROFISSIONAL_SAUDE')
        );
      }
    } catch (err) {
      toast.error('Erro ao carregar escalas', extrairMensagemErro(err));
    } finally {
      setLoadingEscalas(false);
    }
  }, [unidadeId, ehProfissionalSaude, ehAdministrador, usuario, toast]);

  useEffect(() => {
    void carregarEscalasEProfissionais();
  }, [carregarEscalasEProfissionais]);

  const handleAlterarSituacao = async (
    id: string,
    situacao: 'PUBLICADA' | 'BLOQUEADA' | 'ENCERRADA'
  ) => {
    setAlterandoAgendaId(id);
    try {
      const res =
        situacao === 'PUBLICADA'
          ? await agendasApi.publicar(id)
          : await agendasApi.alterarSituacao(id, situacao);
      toast.success(
        `Escala ${LABELS_SITUACAO_AGENDA[res.agenda.situacao]}`,
        res.vagasCriadas > 0 ? `${res.vagasCriadas} vagas geradas.` : undefined
      );
      await carregarEscalasEProfissionais();
      setRefreshGradeTrigger((v) => v + 1);
    } catch (err) {
      toast.error('Erro ao atualizar escala', extrairMensagemErro(err));
    } finally {
      setAlterandoAgendaId(null);
    }
  };

  const unidadeAtual = useMemo(
    () => unidades.find((u) => u.id === unidadeId) ?? null,
    [unidades, unidadeId]
  );

  const tabs: Array<{ id: TabMedico; label: string; icon: typeof CalendarDays }> = [
    { id: 'agenda', label: 'Minha Agenda', icon: CalendarDays },
    { id: 'consultorio', label: 'Meu Consultório (Fila)', icon: Radio },
    { id: 'escalas', label: `Minhas Escalas (${agendas.length})`, icon: CalendarPlus },
  ];

  if (!perfil || (perfil !== 'PROFISSIONAL_SAUDE' && perfil !== 'ADMINISTRADOR')) {
    return null;
  }

  return (
    <div className="min-h-screen overflow-x-clip bg-[#F8FAFC] text-[#0F172A] pb-16">
      <Navbar variant="portal" />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Cabeçalho Clínico */}
        <section className="rounded-[24px] sm:rounded-[28px] bg-white border border-[#E2E8F0] p-5 sm:p-6 shadow-soft space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone="info" dot>
                  Portal Médico
                </StatusBadge>
                {registroConselho && (
                  <StatusBadge tone="neutral">{registroConselho}</StatusBadge>
                )}
                {isProfissional(usuario, tipoUsuario) &&
                  usuario.especialidades.map((esp) => (
                    <StatusBadge key={esp} tone="success">
                      {esp}
                    </StatusBadge>
                  ))}
              </div>

              <h1 className="mt-2 font-display text-2xl sm:text-3xl font-normal tracking-tight text-[#0F172A] break-words">
                Olá, {usuario?.nomeExibicao}
              </h1>
              <p className="mt-1 text-xs text-[#64748B]">
                Visualize suas consultas marcadas, horários livres, gerencie suas escalas e
                chame os pacientes do consultório.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto min-w-0">
              {/* Seletor de unidade */}
              <div className="w-full sm:w-auto min-w-0 inline-flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2">
                <Building2 className="h-4 w-4 shrink-0 text-[#1E6BFF]" />
                <select
                  aria-label="Unidade de atuação"
                  disabled={loadingUnidades || unidades.length === 0}
                  value={unidadeId}
                  onChange={(e) => setUnidadeId(e.target.value)}
                  className="w-full min-w-0 bg-transparent text-xs font-semibold text-[#0F172A] focus:outline-none sm:max-w-[240px]"
                >
                  {unidades.length === 0 ? (
                    <option value="">Sem unidades vinculadas</option>
                  ) : (
                    unidades.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nome}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {unidadeId && (
                <Link
                  to={`/painel/${unidadeId}`}
                  className="inline-flex items-center gap-2 rounded-full bg-[#EFF4FB] border border-[#DBEAFE] px-4 py-2 text-xs font-semibold text-[#1E6BFF] hover:bg-[#DBEAFE] transition-colors"
                >
                  <Monitor className="h-3.5 w-3.5" />
                  Painel TV
                </Link>
              )}

              {ehAdministrador && (
                <Link
                  to="/admin"
                  className="inline-flex items-center gap-2 rounded-full bg-white border border-[#E2E8F0] px-4 py-2 text-xs font-semibold text-[#0F172A] hover:bg-[#F4F7FC] transition-colors"
                >
                  <Shield className="h-3.5 w-3.5 text-[#1E6BFF]" />
                  Painel Admin
                </Link>
              )}

              {unidadeId && (
                <PillButton
                  size="sm"
                  icon={<CalendarPlus className="h-3.5 w-3.5" />}
                  onClick={() => setModalNovaAgenda(true)}
                  className="w-full sm:w-auto"
                >
                  Abrir Novos Horários
                </PillButton>
              )}
            </div>
          </div>

          {/* Navegação em abas */}
          <div className="grid grid-cols-1 sm:inline-flex w-full sm:w-fit items-center gap-1.5 rounded-2xl sm:rounded-full bg-[#EFF4FB] p-1.5 border border-[#DBEAFE]">
            {tabs.map((item) => {
              const Icon = item.icon;
              const ativo = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`w-full sm:w-auto inline-flex items-center justify-center sm:justify-start gap-2 rounded-xl sm:rounded-full px-4 py-2.5 sm:py-2 text-xs font-semibold transition-all ${
                    ativo
                      ? 'bg-[#1E6BFF] text-white shadow-sm'
                      : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Conteúdo da aba ativa */}
        {loadingUnidades ? (
          <Skeleton className="h-80 rounded-[28px]" />
        ) : !unidadeId ? (
          <EmptyState
            icon={<Building2 className="h-6 w-6" />}
            title="Nenhuma unidade de saúde vinculada"
            description="Solicite ao administrador a vinculação do seu cadastro a uma unidade ativa."
          />
        ) : (
          <>
            {tab === 'agenda' && (
              <AgendaClinicaView
                unidadeId={unidadeId}
                profissionalIdFixo={ehProfissionalSaude && usuario ? usuario.id : undefined}
                profissionaisOpcoes={ehAdministrador ? profissionais : undefined}
                onAbrirConsultorioFila={() => setTab('consultorio')}
                onAbrirNovaAgenda={() => setModalNovaAgenda(true)}
                refreshTrigger={refreshGradeTrigger}
              />
            )}

            {tab === 'consultorio' && <FilaTab unidadeId={unidadeId} />}

            {tab === 'escalas' && (
              <section className="space-y-4">
                {loadingEscalas ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Skeleton className="h-48 rounded-[24px]" />
                    <Skeleton className="h-48 rounded-[24px]" />
                  </div>
                ) : agendas.length === 0 ? (
                  <EmptyState
                    icon={<Stethoscope className="h-6 w-6" />}
                    title="Nenhuma escala cadastrada nesta unidade"
                    description="Abra novos horários para liberar vagas no portal do cidadão e visualizar seu calendário clínico."
                    actionLabel="Abrir Novos Horários"
                    onAction={() => setModalNovaAgenda(true)}
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {agendas.map((ag) => {
                      const ocupado = alterandoAgendaId === ag.id;
                      const totalVagas = ag.totalVagas ?? 0;
                      const vagasOcupadas = ag.vagasOcupadas ?? 0;
                      const vagasLivres = ag.vagasDisponiveis ?? 0;
                      const percentual =
                        totalVagas > 0 ? Math.min(100, Math.round((vagasOcupadas / totalVagas) * 100)) : 0;

                      return (
                        <article
                          key={ag.id}
                          className="rounded-[24px] bg-white border border-[#E2E8F0] p-5 shadow-soft flex flex-col justify-between gap-4"
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {ag.categoria && (
                                    <StatusBadge tone="info">
                                      {LABELS_CATEGORIA_SERVICO[ag.categoria]}
                                    </StatusBadge>
                                  )}
                                  {ag.especialidade && (
                                    <span className="text-[11px] font-medium text-[#64748B]">
                                      {ag.especialidade}
                                    </span>
                                  )}
                                </div>
                                <h3 className="mt-1.5 font-display text-base font-semibold text-[#0F172A]">
                                  {ag.servicoNome ?? 'Serviço clínico'}
                                </h3>
                                <p className="text-xs text-[#64748B] mt-0.5">
                                  {formatarData(ag.dataInicio)} até {formatarData(ag.dataFim)} ·{' '}
                                  {ag.capacidadePorHorario} vaga(s)/horário
                                </p>
                                {ag.profissionalNome && (
                                  <p className="text-xs font-medium text-[#1E6BFF] mt-1">
                                    {ag.profissionalNome}
                                    {ag.profissionalRegistro ? ` · ${ag.profissionalRegistro}` : ''}
                                  </p>
                                )}
                              </div>
                              {badgeAgenda(ag.situacao)}
                            </div>

                            {/* Barra de ocupação */}
                            <div className="rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] p-3 space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-[#64748B]">
                                  <strong className="text-[#0F172A]">{vagasOcupadas}</strong> de{' '}
                                  {totalVagas} vagas marcadas
                                </span>
                                <span className="font-semibold text-emerald-700">
                                  {vagasLivres} livre(s)
                                </span>
                              </div>
                              <div className="h-2 w-full rounded-full bg-[#E2E8F0] overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-[#1E6BFF] transition-all"
                                  style={{ width: `${percentual}%` }}
                                />
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                              {ag.diasHorarios.map((d) => (
                                <span
                                  key={d.diaSemana}
                                  className="rounded-full bg-[#EFF4FB] px-2.5 py-1 text-[11px] font-medium text-[#1E6BFF]"
                                >
                                  {DIAS_SEMANA.find((ds) => ds.valor === d.diaSemana)?.curto}:{' '}
                                  {d.horarios.join(', ')}
                                </span>
                              ))}
                            </div>
                          </div>

                          {ag.situacao !== 'ENCERRADA' && (
                            <div className="flex flex-wrap gap-2 pt-3 border-t border-[#E2E8F0]">
                              {ag.situacao !== 'PUBLICADA' && (
                                <PillButton
                                  size="sm"
                                  variant="primary"
                                  hideIconCircle
                                  loading={ocupado}
                                  onClick={() => void handleAlterarSituacao(ag.id, 'PUBLICADA')}
                                >
                                  <Send className="h-3.5 w-3.5" />
                                  Publicar
                                </PillButton>
                              )}
                              {ag.situacao !== 'BLOQUEADA' && (
                                <PillButton
                                  size="sm"
                                  variant="ghost"
                                  hideIconCircle
                                  disabled={ocupado}
                                  onClick={() => void handleAlterarSituacao(ag.id, 'BLOQUEADA')}
                                >
                                  <Lock className="h-3.5 w-3.5" />
                                  Bloquear
                                </PillButton>
                              )}
                              <PillButton
                                size="sm"
                                variant="danger"
                                hideIconCircle
                                disabled={ocupado}
                                onClick={() => void handleAlterarSituacao(ag.id, 'ENCERRADA')}
                              >
                                <Ban className="h-3.5 w-3.5" />
                                Encerrar
                              </PillButton>
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>

      {unidadeId && (
        <AgendaBuilderModal
          open={modalNovaAgenda}
          onClose={() => setModalNovaAgenda(false)}
          unidadeId={unidadeId}
          unidadeNome={unidadeAtual?.nome}
          perfil={perfil}
          servicos={servicos}
          profissionais={profissionais}
          onSuccess={async () => {
            await carregarEscalasEProfissionais();
            setRefreshGradeTrigger((v) => v + 1);
          }}
        />
      )}
    </div>
  );
}
