import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  Ban,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  ClipboardList,
  Lock,
  Plus,
  Search,
  Send,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
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
  ConfiguracaoDiaHorario,
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
  somarDiasIso,
  somenteDigitos,
} from '../../utils/formatters';
import { EmptyState } from '../../components/ui/EmptyState';
import { FormField, SelectInput, TextAreaInput, TextInput } from '../../components/ui/FormControls';
import { Modal } from '../../components/ui/Modal';
import { PillButton } from '../../components/ui/PillButton';
import { Skeleton } from '../../components/ui/Skeleton';
import { StatusBadge } from '../../components/ui/StatusBadge';

interface AgendasTabProps {
  unidadeId: string;
  perfil: PerfilAcesso;
}

const HORARIOS_SUGERIDOS = [
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
];

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
  const { usuario } = useAuth();
  const toast = useToast();

  const podeGerirAgenda =
    perfil === 'ADMINISTRADOR' || perfil === 'PROFISSIONAL_SAUDE';
  const podeCancelarOuCheckin =
    perfil === 'ATENDENTE' || perfil === 'ADMINISTRADOR';

  const [subAba, setSubAba] = useState<'agendas' | 'agendamentos'>('agendas');

  // Agendas
  const [agendas, setAgendas] = useState<AgendaDTO[]>([]);
  const [servicos, setServicos] = useState<ServicoDTO[]>([]);
  const [profissionais, setProfissionais] = useState<ProfissionalDTO[]>([]);
  const [loadingAgendas, setLoadingAgendas] = useState(true);
  const [alterandoAgendaId, setAlterandoAgendaId] = useState<string | null>(null);

  // Agendamentos da Unidade
  const [agendamentos, setAgendamentos] = useState<AgendamentoDetalhadoDTO[]>([]);
  const [loadingAgendamentos, setLoadingAgendamentos] = useState(true);
  const [filtroData, setFiltroData] = useState(hojeIsoMaceio());
  const [filtroProtocolo, setFiltroProtocolo] = useState('');
  const [filtroCpf, setFiltroCpf] = useState('');

  // Modal Nova Agenda
  const [modalAgenda, setModalAgenda] = useState(false);
  const [servicoId, setServicoId] = useState('');
  const [profissionalId, setProfissionalId] = useState('');
  const [dataInicio, setDataInicio] = useState(hojeIsoMaceio());
  const [dataFim, setDataFim] = useState(() => somarDiasIso(hojeIsoMaceio(), 14));
  const [diasSelecionados, setDiasSelecionados] = useState<number[]>([1, 2, 3, 4, 5]);
  const [horariosSelecionados, setHorariosSelecionados] = useState<string[]>([
    '08:00',
    '09:00',
    '10:00',
    '14:00',
  ]);
  const [horarioCustom, setHorarioCustom] = useState('');
  const [capacidadePorHorario, setCapacidadePorHorario] = useState(4);
  const [publicarAoCriar, setPublicarAoCriar] = useState(true);
  const [criandoAgenda, setCriandoAgenda] = useState(false);

  // Modal Cancelamento
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
      if (!servicoId) {
        const primeiroAtivo = svRes.servicos.find((s) => s.status === 'ATIVO');
        if (primeiroAtivo) setServicoId(primeiroAtivo.id);
      }

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
  }, [unidadeId, perfil, servicoId, toast]);

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
          ? `${res.vagasCriadas} vagas materializadas.`
          : undefined
      );
      await carregarAgendas();
    } catch (err) {
      toast.error('Erro ao alterar situação', extrairMensagemErro(err));
    } finally {
      setAlterandoAgendaId(null);
    }
  };

  const adicionarHorarioCustom = () => {
    const limpo = horarioCustom.trim();
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(limpo)) {
      toast.warning('Horário inválido', 'Use o formato HH:mm (ex.: 13:30).');
      return;
    }
    if (!horariosSelecionados.includes(limpo)) {
      setHorariosSelecionados((prev) => [...prev, limpo].sort());
    }
    setHorarioCustom('');
  };

  const handleCriarAgenda = async (e: FormEvent) => {
    e.preventDefault();
    if (!servicoId) {
      toast.warning('Serviço obrigatório', 'Selecione um serviço ativo.');
      return;
    }
    if (diasSelecionados.length === 0) {
      toast.warning('Dias obrigatórios', 'Selecione ao menos um dia da semana.');
      return;
    }
    if (horariosSelecionados.length === 0) {
      toast.warning('Horários obrigatórios', 'Selecione ao menos um horário.');
      return;
    }

    const diasHorarios: ConfiguracaoDiaHorario[] = diasSelecionados
      .slice()
      .sort((a, b) => a - b)
      .map((diaSemana) => ({
        diaSemana,
        horarios: horariosSelecionados.slice().sort(),
      }));

    setCriandoAgenda(true);
    try {
      const res = await agendasApi.criar({
        unidadeId,
        servicoId,
        profissionalId: profissionalId || null,
        dataInicio,
        dataFim,
        diasHorarios,
        capacidadePorHorario: Number(capacidadePorHorario),
        publicar: publicarAoCriar,
      });
      toast.success(
        publicarAoCriar ? 'Agenda criada e publicada!' : 'Agenda salva como rascunho!',
        res.vagasCriadas > 0
          ? `${res.vagasCriadas} vagas geradas para agendamento.`
          : undefined
      );
      setModalAgenda(false);
      await carregarAgendas();
    } catch (err) {
      toast.error('Erro ao criar agenda', extrairMensagemErro(err));
    } finally {
      setCriandoAgenda(false);
    }
  };

  const handleCheckinRapido = async (protocolo: string) => {
    try {
      const res = await filaApi.checkin({ unidadeId, protocolo });
      toast.success(
        res.jaRegistrado ? 'Já estava na fila' : 'Check-in realizado!',
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full bg-white border border-[#E2E8F0] p-1 shadow-pill">
          <button
            type="button"
            onClick={() => setSubAba('agendas')}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
              subAba === 'agendas'
                ? 'bg-[#1E6BFF] text-white'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Agendas ({agendas.length})
          </button>
          <button
            type="button"
            onClick={() => setSubAba('agendamentos')}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
              subAba === 'agendamentos'
                ? 'bg-[#1E6BFF] text-white'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <ClipboardList className="h-3.5 w-3.5" />
            Agendamentos da Unidade ({agendamentos.length})
          </button>
        </div>

        {subAba === 'agendas' && podeGerirAgenda && (
          <PillButton
            size="sm"
            icon={<CalendarPlus className="h-3.5 w-3.5" />}
            onClick={() => setModalAgenda(true)}
          >
            Nova Agenda
          </PillButton>
        )}
      </div>

      {/* ================================================================
          SUB-ABA: AGENDAS
      ================================================================ */}
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
              description="Crie e publique uma agenda periódica para disponibilizar vagas de atendimento."
              actionLabel={podeGerirAgenda ? 'Criar Primeira Agenda' : undefined}
              onAction={podeGerirAgenda ? () => setModalAgenda(true) : undefined}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {agendas.map((ag) => {
                const ocupado = alterandoAgendaId === ag.id;
                return (
                  <article
                    key={ag.id}
                    className="rounded-[24px] bg-white border border-[#E2E8F0] p-5 shadow-soft flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-display text-base font-semibold text-[#0F172A]">
                            {nomeServico(ag.servicoId)}
                          </h3>
                          <p className="text-xs text-[#64748B] mt-0.5">
                            {formatarData(ag.dataInicio)} até{' '}
                            {formatarData(ag.dataFim)} · {ag.capacidadePorHorario}{' '}
                            vaga(s)/horário
                          </p>
                        </div>
                        {badgeAgenda(ag.situacao)}
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

      {/* ================================================================
          SUB-ABA: AGENDAMENTOS DA UNIDADE
      ================================================================ */}
      {subAba === 'agendamentos' && (
        <section className="rounded-[28px] bg-white border border-[#E2E8F0] p-6 shadow-soft space-y-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void carregarAgendamentos();
            }}
            className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
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

            <FormField label="CPF do Paciente" htmlFor="filtro-ag-cpf">
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
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[11px] uppercase tracking-wider text-[#64748B]">
                    <th className="py-2.5 pr-4">Horário</th>
                    <th className="py-2.5 pr-4">Paciente</th>
                    <th className="py-2.5 pr-4">Serviço</th>
                    <th className="py-2.5 pr-4">Protocolo / Senha</th>
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
          )}
        </section>
      )}

      {/* Modal Criar Agenda */}
      <Modal
        open={modalAgenda}
        onClose={() => setModalAgenda(false)}
        title="Nova Agenda de Atendimento"
        subtitle="Defina período, dias da semana, horários e capacidade por vaga."
        size="lg"
      >
        <form onSubmit={handleCriarAgenda} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Serviço" htmlFor="ag-new-servico" required>
              <SelectInput
                id="ag-new-servico"
                value={servicoId}
                onChange={(e) => setServicoId(e.target.value)}
              >
                <option value="">Selecione...</option>
                {servicos
                  .filter((s) => s.status === 'ATIVO')
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome} ({s.especialidade})
                    </option>
                  ))}
              </SelectInput>
            </FormField>

            <FormField
              label="Profissional (opcional)"
              htmlFor="ag-new-prof"
              hint={
                perfil === 'PROFISSIONAL_SAUDE'
                  ? 'Vincule a si mesmo ou deixe aberto para a equipe.'
                  : undefined
              }
            >
              <SelectInput
                id="ag-new-prof"
                value={profissionalId}
                onChange={(e) => setProfissionalId(e.target.value)}
              >
                <option value="">Sem profissional específico</option>
                {perfil === 'ADMINISTRADOR'
                  ? profissionais.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nomeExibicao}
                      </option>
                    ))
                  : usuario && (
                      <option value={usuario.id}>
                        {usuario.nomeExibicao} (Eu mesmo)
                      </option>
                    )}
              </SelectInput>
            </FormField>

            <FormField label="Data início" htmlFor="ag-new-ini" required>
              <TextInput
                id="ag-new-ini"
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </FormField>

            <FormField label="Data fim" htmlFor="ag-new-fim" required>
              <TextInput
                id="ag-new-fim"
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </FormField>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-[#0F172A]">
              Dias da semana <span className="text-[#1E6BFF]">*</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {DIAS_SEMANA.map((dia) => {
                const ativo = diasSelecionados.includes(dia.valor);
                return (
                  <button
                    key={dia.valor}
                    type="button"
                    onClick={() =>
                      setDiasSelecionados((prev) =>
                        prev.includes(dia.valor)
                          ? prev.filter((x) => x !== dia.valor)
                          : [...prev, dia.valor]
                      )
                    }
                    className={`rounded-full px-3.5 py-1.5 text-xs font-medium border transition-colors ${
                      ativo
                        ? 'bg-[#1E6BFF] text-white border-[#1E6BFF]'
                        : 'bg-white text-[#64748B] border-[#E2E8F0]'
                    }`}
                  >
                    {dia.curto}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2.5">
            <p className="text-xs font-medium text-[#0F172A]">
              Horários de atendimento <span className="text-[#1E6BFF]">*</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {Array.from(
                new Set([...HORARIOS_SUGERIDOS, ...horariosSelecionados])
              )
                .sort()
                .map((h) => {
                  const ativo = horariosSelecionados.includes(h);
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() =>
                        setHorariosSelecionados((prev) =>
                          prev.includes(h)
                            ? prev.filter((x) => x !== h)
                            : [...prev, h].sort()
                        )
                      }
                      className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                        ativo
                          ? 'bg-[#EFF4FB] text-[#1E6BFF] border-[#1E6BFF]'
                          : 'bg-white text-[#64748B] border-[#E2E8F0]'
                      }`}
                    >
                      {h}
                    </button>
                  );
                })}
            </div>

            <div className="flex items-center gap-2 pt-1 max-w-xs">
              <TextInput
                value={horarioCustom}
                onChange={(e) => setHorarioCustom(e.target.value)}
                placeholder="Outro horário (HH:mm)"
              />
              <button
                type="button"
                onClick={adicionarHorarioCustom}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EFF4FB] text-[#1E6BFF] hover:bg-[#DBEAFE]"
                title="Adicionar horário"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <FormField
              label="Capacidade por horário"
              htmlFor="ag-new-cap"
              required
            >
              <TextInput
                id="ag-new-cap"
                type="number"
                min={1}
                value={capacidadePorHorario}
                onChange={(e) =>
                  setCapacidadePorHorario(Math.max(1, Number(e.target.value) || 1))
                }
              />
            </FormField>

            <label className="inline-flex items-center gap-2.5 text-xs text-[#0F172A] cursor-pointer sm:pt-5">
              <input
                type="checkbox"
                checked={publicarAoCriar}
                onChange={(e) => setPublicarAoCriar(e.target.checked)}
                className="h-4 w-4 rounded border-[#CBD5E1] text-[#1E6BFF]"
              />
              Publicar imediatamente e materializar vagas
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <PillButton
              variant="ghost"
              hideIconCircle
              onClick={() => setModalAgenda(false)}
            >
              Cancelar
            </PillButton>
            <PillButton type="submit" loading={criandoAgenda}>
              Criar Agenda
            </PillButton>
          </div>
        </form>
      </Modal>

      {/* Modal Cancelar Agendamento */}
      <Modal
        open={Boolean(agCancelar)}
        onClose={() => setAgCancelar(null)}
        title="Cancelar Agendamento Assistido"
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
          <div className="flex justify-end gap-3">
            <PillButton
              variant="ghost"
              hideIconCircle
              onClick={() => setAgCancelar(null)}
            >
              Voltar
            </PillButton>
            <PillButton type="submit" variant="danger" loading={cancelando}>
              Confirmar Cancelamento
            </PillButton>
          </div>
        </form>
      </Modal>
    </div>
  );
}
