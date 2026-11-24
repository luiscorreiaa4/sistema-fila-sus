import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  Ban,
  CalendarDays,
  CalendarPlus,
  CalendarRange,
  CheckCircle2,
  ClipboardList,
  Lock,
  Search,
  Send,
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import {
  agendamentosApi,
  agendasApi,
  extrairMensagemErro,
  filaApi,
  profissionaisApi,
  servicosApi,
} from '../../services/api';
import type {
  AgendaDTO,
  AgendamentoDetalhadoDTO,
  PerfilAcesso,
  ProfissionalDTO,
  ServicoDTO,
  SituacaoAgenda,
  StatusAgendamento,
} from '../../types/api';
import {
  DIAS_SEMANA,
  LABELS_ORIGEM_MARCACAO,
  LABELS_SITUACAO_AGENDA,
  LABELS_STATUS_AGENDAMENTO,
  formatarData,
  formatarDataHora,
  hojeIsoMaceio,
  maskCpf,
  somenteDigitos,
} from '../../utils/formatters';
import { AgendaBuilderModal } from '../../components/agendas/AgendaBuilderModal';
import { AgendaClinicaView } from '../../components/agendas/AgendaClinicaView';
import { EmptyState } from '../../components/ui/EmptyState';
import { FormField, TextAreaInput, TextInput } from '../../components/ui/FormControls';
import { Modal } from '../../components/ui/Modal';
import { PillButton } from '../../components/ui/PillButton';
import { Skeleton } from '../../components/ui/Skeleton';
import { StatusBadge } from '../../components/ui/StatusBadge';

interface AgendasTabProps {
  unidadeId: string;
  perfil: PerfilAcesso;
}

function badgeAgenda(situacao: SituacaoAgenda) {
  switch (situacao) {
    case 'PUBLICADA':
      return <StatusBadge tone="success" dot>{LABELS_SITUACAO_AGENDA[situacao]}</StatusBadge>;
    case 'RASCUNHO':
      return <StatusBadge tone="neutral">{LABELS_SITUACAO_AGENDA[situacao]}</StatusBadge>;
    case 'BLOQUEADA':
      return <StatusBadge tone="warning">{LABELS_SITUACAO_AGENDA[situacao]}</StatusBadge>;
    case 'ENCERRADA':
      return <StatusBadge tone="danger">{LABELS_SITUACAO_AGENDA[situacao]}</StatusBadge>;
  }
}

function badgeStatusAg(status: StatusAgendamento) {
  switch (status) {
    case 'AGENDADO':
      return <StatusBadge tone="info">{LABELS_STATUS_AGENDAMENTO[status]}</StatusBadge>;
    case 'REALIZADO':
      return <StatusBadge tone="success">{LABELS_STATUS_AGENDAMENTO[status]}</StatusBadge>;
    case 'CANCELADO':
      return <StatusBadge tone="danger">{LABELS_STATUS_AGENDAMENTO[status]}</StatusBadge>;
    case 'NAO_REALIZADO':
      return <StatusBadge tone="warning">{LABELS_STATUS_AGENDAMENTO[status]}</StatusBadge>;
  }
}

export function AgendasTab({ unidadeId, perfil }: AgendasTabProps) {
  const toast = useToast();

  const podeGerirAgenda =
    perfil === 'ADMINISTRADOR' || perfil === 'PROFISSIONAL_SAUDE';
  const podeCancelarOuCheckin =
    perfil === 'ATENDENTE' || perfil === 'ADMINISTRADOR';

  const [subAba, setSubAba] = useState<'grade' | 'agendas' | 'agendamentos'>('grade');

  // Agendas
  const [agendas, setAgendas] = useState<AgendaDTO[]>([]);
  const [servicos, setServicos] = useState<ServicoDTO[]>([]);
  const [profissionais, setProfissionais] = useState<ProfissionalDTO[]>([]);
  const [loadingAgendas, setLoadingAgendas] = useState(true);
  const [alterandoAgendaId, setAlterandoAgendaId] = useState<string | null>(null);
  const [refreshGradeTrigger, setRefreshGradeTrigger] = useState(0);

  // Agendamentos da unidade
  const [agendamentos, setAgendamentos] = useState<AgendamentoDetalhadoDTO[]>([]);
  const [loadingAgendamentos, setLoadingAgendamentos] = useState(true);
  const [filtroData, setFiltroData] = useState(hojeIsoMaceio());
  const [filtroProtocolo, setFiltroProtocolo] = useState('');
  const [filtroCpf, setFiltroCpf] = useState('');

  // Modal de nova agenda
  const [modalAgenda, setModalAgenda] = useState(false);

  // Modal de cancelamento
  const [agCancelar, setAgCancelar] = useState<AgendamentoDetalhadoDTO | null>(null);
  const [motivoCancel, setMotivoCancel] = useState('');
  const [cancelando, setCancelando] = useState(false);

  const carregarAgendas = useCallback(async () => {
    if (!unidadeId) return;
    setLoadingAgendas(true);
    try {
      const [agRes, svRes] = await Promise.all([
        agendasApi.listar({ unidadeId }),
        servicosApi.listar({ incluirInativos: true }),
      ]);
      setAgendas(agRes.agendas);
      setServicos(svRes.servicos);

      if (perfil === 'ADMINISTRADOR') {
        const profRes = await profissionaisApi.listar({
          unidadeId,
          status: 'ATIVO',
        });
        setProfissionais(profRes.profissionais);
      }
    } catch (err) {
      toast.error('Erro ao carregar agendas', extrairMensagemErro(err));
    } finally {
      setLoadingAgendas(false);
    }
  }, [unidadeId, perfil, toast]);

  const carregarAgendamentos = useCallback(async () => {
    if (!unidadeId) return;
    setLoadingAgendamentos(true);
    try {
      const cpfDigitos = somenteDigitos(filtroCpf);
      const res = await agendamentosApi.porUnidade(unidadeId, {
        data: filtroData || undefined,
        protocolo: filtroProtocolo.trim() || undefined,
        cpf: cpfDigitos.length === 11 ? cpfDigitos : undefined,
      });
      setAgendamentos(res.agendamentos);
    } catch (err) {
      toast.error('Erro ao carregar agendamentos', extrairMensagemErro(err));
    } finally {
      setLoadingAgendamentos(false);
    }
  }, [unidadeId, filtroData, filtroProtocolo, filtroCpf, toast]);

  useEffect(() => {
    void carregarAgendas();
    void carregarAgendamentos();
  }, [carregarAgendas, carregarAgendamentos]);

  const nomeServico = (id: string) =>
    servicos.find((s) => s.id === id)?.nome ?? 'Serviço';

  const handleAlterarSituacaoAgenda = async (
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
        `Agenda ${LABELS_SITUACAO_AGENDA[res.agenda.situacao]}`,
        res.vagasCriadas > 0
          ? `${res.vagasCriadas} vagas geradas.`
          : undefined
      );
      await carregarAgendas();
      setRefreshGradeTrigger((v) => v + 1);
    } catch (err) {
      toast.error('Erro ao alterar situação', extrairMensagemErro(err));
    } finally {
      setAlterandoAgendaId(null);
    }
  };

  const handleCheckinRapido = async (protocolo: string) => {
    try {
      const res = await filaApi.checkin({ unidadeId, protocolo });
      toast.success(
        res.jaRegistrado ? 'Já estava na fila' : 'Check-in realizado.',
        `Senha ${res.entrada.senhaAtendimento}`
      );
      await carregarAgendamentos();
    } catch (err) {
      toast.error('Erro no check-in', extrairMensagemErro(err));
    }
  };

  const handleCancelarAgendamento = async (e: FormEvent) => {
    e.preventDefault();
    if (!agCancelar) return;
    if (motivoCancel.trim().length < 5) {
      toast.warning('Motivo obrigatório', 'Informe pelo menos 5 caracteres.');
      return;
    }
    setCancelando(true);
    try {
      await agendamentosApi.cancelar(agCancelar.id, motivoCancel.trim());
      toast.success('Agendamento cancelado');
      setAgCancelar(null);
      setMotivoCancel('');
      await carregarAgendamentos();
    } catch (err) {
      toast.error('Erro ao cancelar', extrairMensagemErro(err));
    } finally {
      setCancelando(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Sub-navegação em pílula */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-3">
        <div className="grid grid-cols-1 sm:inline-flex w-full sm:w-auto gap-1 rounded-2xl sm:rounded-full bg-white border border-[#E2E8F0] p-1.5 sm:p-1 shadow-pill">
          <button
            type="button"
            onClick={() => setSubAba('grade')}
            className={`w-full sm:w-auto inline-flex items-center justify-center sm:justify-start gap-2 rounded-xl sm:rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
              subAba === 'grade'
                ? 'bg-[#1E6BFF] text-white'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <CalendarRange className="h-3.5 w-3.5 shrink-0" />
            Calendário / Grade Clínica
          </button>
          <button
            type="button"
            onClick={() => setSubAba('agendas')}
            className={`w-full sm:w-auto inline-flex items-center justify-center sm:justify-start gap-2 rounded-xl sm:rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
              subAba === 'agendas'
                ? 'bg-[#1E6BFF] text-white'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
            Escalas ({agendas.length})
          </button>
          <button
            type="button"
            onClick={() => setSubAba('agendamentos')}
            className={`w-full sm:w-auto inline-flex items-center justify-center sm:justify-start gap-2 rounded-xl sm:rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
              subAba === 'agendamentos'
                ? 'bg-[#1E6BFF] text-white'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <ClipboardList className="h-3.5 w-3.5 shrink-0" />
            Agendamentos da unidade ({agendamentos.length})
          </button>
        </div>

        {(subAba === 'agendas' || subAba === 'grade') && podeGerirAgenda && (
          <PillButton
            size="sm"
            icon={<CalendarPlus className="h-3.5 w-3.5" />}
            onClick={() => setModalAgenda(true)}
            className="w-full sm:w-auto"
          >
            Nova agenda
          </PillButton>
        )}
      </div>

      {/* Sub-aba: calendário / grade clínica */}
      {subAba === 'grade' && (
        <AgendaClinicaView
          unidadeId={unidadeId}
          profissionaisOpcoes={profissionais}
          onAbrirNovaAgenda={podeGerirAgenda ? () => setModalAgenda(true) : undefined}
          refreshTrigger={refreshGradeTrigger}
        />
      )}

      {/* Sub-aba: agendas */}
      {subAba === 'agendas' && (
        <section className="space-y-4">
          {loadingAgendas ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-44 rounded-[24px]" />
              <Skeleton className="h-44 rounded-[24px]" />
            </div>
          ) : agendas.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="h-6 w-6" />}
              title="Nenhuma agenda cadastrada para esta unidade"
              description="Crie e publique uma agenda para liberar vagas de atendimento."
              actionLabel={podeGerirAgenda ? 'Criar primeira agenda' : undefined}
              onAction={podeGerirAgenda ? () => setModalAgenda(true) : undefined}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {agendas.map((ag) => {
                const ocupado = alterandoAgendaId === ag.id;
                const totalVagas = ag.totalVagas ?? 0;
                const vagasOcupadas = ag.vagasOcupadas ?? 0;
                const vagasLivres = ag.vagasDisponiveis ?? 0;
                const pct =
                  totalVagas > 0 ? Math.min(100, Math.round((vagasOcupadas / totalVagas) * 100)) : 0;

                return (
                  <article
                    key={ag.id}
                    className="rounded-[24px] bg-white border border-[#E2E8F0] p-5 shadow-soft flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-display text-base font-semibold text-[#0F172A]">
                            {ag.servicoNome ?? nomeServico(ag.servicoId)}
                          </h3>
                          <p className="text-xs text-[#64748B] mt-0.5">
                            {formatarData(ag.dataInicio)} até{' '}
                            {formatarData(ag.dataFim)} · {ag.capacidadePorHorario}{' '}
                            vaga(s)/horário
                          </p>
                          <p className="text-xs font-medium text-[#1E6BFF] mt-1">
                            {ag.profissionalNome
                              ? `${ag.profissionalNome}${ag.profissionalRegistro ? ` · ${ag.profissionalRegistro}` : ''}`
                              : 'Equipe da unidade (sem médico fixo)'}
                          </p>
                        </div>
                        {badgeAgenda(ag.situacao)}
                      </div>

                      {totalVagas > 0 && (
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
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )}

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

                    {podeGerirAgenda && ag.situacao !== 'ENCERRADA' && (
                      <div className="flex flex-wrap gap-2 pt-3 border-t border-[#E2E8F0]">
                        {ag.situacao !== 'PUBLICADA' && (
                          <PillButton
                            size="sm"
                            variant="primary"
                            hideIconCircle
                            loading={ocupado}
                            onClick={() =>
                              void handleAlterarSituacaoAgenda(ag.id, 'PUBLICADA')
                            }
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
                            onClick={() =>
                              void handleAlterarSituacaoAgenda(ag.id, 'BLOQUEADA')
                            }
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
                          onClick={() =>
                            void handleAlterarSituacaoAgenda(ag.id, 'ENCERRADA')
                          }
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

      {/* Sub-aba: agendamentos da unidade */}
      {subAba === 'agendamentos' && (
        <section className="rounded-[24px] sm:rounded-[28px] bg-white border border-[#E2E8F0] p-5 sm:p-6 shadow-soft space-y-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void carregarAgendamentos();
            }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end"
          >
            <FormField label="Data" htmlFor="filtro-ag-data">
              <TextInput
                id="filtro-ag-data"
                type="date"
                value={filtroData}
                onChange={(e) => setFiltroData(e.target.value)}
              />
            </FormField>

            <FormField label="Protocolo" htmlFor="filtro-ag-prot">
              <TextInput
                id="filtro-ag-prot"
                value={filtroProtocolo}
                onChange={(e) => setFiltroProtocolo(e.target.value.toUpperCase())}
                placeholder="SUS-..."
              />
            </FormField>

            <FormField label="CPF do paciente" htmlFor="filtro-ag-cpf">
              <TextInput
                id="filtro-ag-cpf"
                inputMode="numeric"
                value={filtroCpf}
                onChange={(e) => setFiltroCpf(maskCpf(e.target.value))}
                placeholder="000.000.000-00"
              />
            </FormField>

            <PillButton
              type="submit"
              icon={<Search className="h-3.5 w-3.5" />}
              className="w-full sm:w-auto"
            >
              Filtrar
            </PillButton>
          </form>

          {loadingAgendamentos ? (
            <Skeleton className="h-44 rounded-2xl" />
          ) : agendamentos.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="h-6 w-6" />}
              title="Nenhum agendamento encontrado"
              description="Ajuste a data ou os filtros de protocolo/CPF para visualizar outros registros."
              className="border-dashed bg-[#F8FAFC]"
            />
          ) : (
            <>
              <div className="md:hidden space-y-3">
                {agendamentos.map((ag) => (
                  <div
                    key={ag.id}
                    className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#1E6BFF]">
                          {formatarDataHora(ag.dataHoraAtendimento)}
                        </p>
                        <p className="mt-1 text-sm font-medium text-[#0F172A] break-words">
                          {ag.pacienteNomeExibicao ?? 'Paciente'}
                        </p>
                      </div>
                      {badgeStatusAg(ag.status)}
                    </div>

                    <div className="text-xs text-[#64748B] space-y-1">
                      <p>{ag.servicoNome}</p>
                      <p>
                        Protocolo:{' '}
                        <code className="font-semibold text-[#1E6BFF]">
                          {ag.protocolo}
                        </code>{' '}
                        · Senha {ag.senhaAtendimento}
                      </p>
                      <p>{LABELS_ORIGEM_MARCACAO[ag.origemMarcacao]}</p>
                    </div>

                    {podeCancelarOuCheckin && ag.status === 'AGENDADO' && (
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-[#E2E8F0]">
                        <button
                          type="button"
                          onClick={() => void handleCheckinRapido(ag.protocolo)}
                          className="inline-flex items-center gap-1 rounded-full bg-[#EFF4FB] px-3 py-1.5 text-xs font-semibold text-[#1E6BFF] hover:bg-[#DBEAFE]"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Check-in
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAgCancelar(ag);
                            setMotivoCancel('');
                          }}
                          className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] text-[11px] uppercase tracking-wider text-[#64748B]">
                      <th className="py-2.5 pr-4">Horário</th>
                      <th className="py-2.5 pr-4">Paciente</th>
                      <th className="py-2.5 pr-4">Serviço</th>
                      <th className="py-2.5 pr-4">Protocolo / senha</th>
                      <th className="py-2.5 pr-4">Situação</th>
                      {podeCancelarOuCheckin && (
                        <th className="py-2.5 text-right">Ações</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]/70 text-sm">
                    {agendamentos.map((ag) => (
                      <tr key={ag.id} className="hover:bg-[#F4F7FC]/70">
                        <td className="py-3 pr-4 text-xs font-medium text-[#0F172A]">
                          {formatarDataHora(ag.dataHoraAtendimento)}
                        </td>
                        <td className="py-3 pr-4">
                          <p className="font-medium text-[#0F172A]">
                            {ag.pacienteNomeExibicao ?? 'Paciente'}
                          </p>
                          <p className="text-[11px] text-[#64748B]">
                            {LABELS_ORIGEM_MARCACAO[ag.origemMarcacao]}
                          </p>
                        </td>
                        <td className="py-3 pr-4 text-xs text-[#64748B]">
                          {ag.servicoNome}
                        </td>
                        <td className="py-3 pr-4 text-xs">
                          <code className="font-semibold text-[#1E6BFF]">
                            {ag.protocolo}
                          </code>
                          <p className="text-[11px] text-[#64748B]">
                            Senha {ag.senhaAtendimento}
                          </p>
                        </td>
                        <td className="py-3 pr-4">{badgeStatusAg(ag.status)}</td>
                        {podeCancelarOuCheckin && (
                          <td className="py-3 text-right">
                            {ag.status === 'AGENDADO' && (
                              <div className="inline-flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => void handleCheckinRapido(ag.protocolo)}
                                  className="inline-flex items-center gap-1 rounded-full bg-[#EFF4FB] px-3 py-1 text-xs font-semibold text-[#1E6BFF] hover:bg-[#DBEAFE]"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Check-in
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAgCancelar(ag);
                                    setMotivoCancel('');
                                  }}
                                  className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                                >
                                  Cancelar
                                </button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}

      {/* Construtor inteligente de agenda */}
      <AgendaBuilderModal
        open={modalAgenda}
        onClose={() => setModalAgenda(false)}
        unidadeId={unidadeId}
        perfil={perfil}
        servicos={servicos}
        profissionais={profissionais}
        onSuccess={async () => {
          await carregarAgendas();
          setRefreshGradeTrigger((v) => v + 1);
        }}
      />

      {/* Modal de cancelamento de agendamento */}
      <Modal
        open={Boolean(agCancelar)}
        onClose={() => setAgCancelar(null)}
        title="Cancelar agendamento assistido"
        subtitle={
          agCancelar
            ? `Protocolo ${agCancelar.protocolo} · ${agCancelar.pacienteNomeExibicao ?? ''}`
            : undefined
        }
      >
        <form onSubmit={handleCancelarAgendamento} className="space-y-4">
          <FormField
            label="Motivo do cancelamento"
            htmlFor="op-motivo-cancel"
            required
          >
            <TextAreaInput
              id="op-motivo-cancel"
              value={motivoCancel}
              onChange={(e) => setMotivoCancel(e.target.value)}
              placeholder="Descreva o motivo (mínimo 5 caracteres)..."
            />
          </FormField>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3">
            <PillButton
              variant="ghost"
              hideIconCircle
              onClick={() => setAgCancelar(null)}
              className="w-full sm:w-auto"
            >
              Voltar
            </PillButton>
            <PillButton
              type="submit"
              variant="danger"
              loading={cancelando}
              className="w-full sm:w-auto"
            >
              Confirmar cancelamento
            </PillButton>
          </div>
        </form>
      </Modal>
    </div>
  );
}
