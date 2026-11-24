import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  LayoutGrid,
  ListChecks,
  Megaphone,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  User,
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { agendasApi, extrairMensagemErro } from '../../services/api';
import type {
  ProfissionalDTO,
  ResumoDiaGradeDTO,
  SituacaoFila,
  SlotGradeAgendaDTO,
  StatusAgendamento,
} from '../../types/api';
import {
  LABELS_CRITERIO_PRIORIDADE,
  LABELS_SITUACAO_FILA,
  LABELS_STATUS_AGENDAMENTO,
  extrairDataIsoMaceio,
  formatarData,
  formatarDataCurta,
  formatarHora,
  hojeIsoMaceio,
  somarDiasIso,
} from '../../utils/formatters';
import { EmptyState } from '../ui/EmptyState';
import { SelectInput } from '../ui/FormControls';
import { Modal } from '../ui/Modal';
import { PillButton } from '../ui/PillButton';
import { Skeleton } from '../ui/Skeleton';
import { StatusBadge } from '../ui/StatusBadge';

interface AgendaClinicaViewProps {
  unidadeId: string;
  profissionalIdFixo?: string;
  profissionaisOpcoes?: ProfissionalDTO[];
  onAbrirConsultorioFila?: () => void;
  onAbrirNovaAgenda?: () => void;
  refreshTrigger?: number;
}

type ModoVisualizacao = 'DIA' | 'SEMANA';
type FiltroHorario = 'TODOS' | 'COM_PACIENTES' | 'LIVRES';

const MESES_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

function badgePresencaPaciente(
  status: StatusAgendamento,
  situacaoFila: SituacaoFila | null,
  guicheSala: string | null
) {
  if (situacaoFila === 'EM_ATENDIMENTO') {
    return (
      <StatusBadge tone="info" dot pulse>
        Em atendimento{guicheSala ? ` · ${guicheSala}` : ''}
      </StatusBadge>
    );
  }
  if (situacaoFila === 'CHAMADO') {
    return (
      <StatusBadge tone="warning" dot pulse>
        Chamado{guicheSala ? ` · ${guicheSala}` : ''}
      </StatusBadge>
    );
  }
  if (situacaoFila === 'AGUARDANDO') {
    return (
      <StatusBadge tone="success" dot>
        Check-in feito · Na fila
      </StatusBadge>
    );
  }
  if (situacaoFila === 'CONCLUIDO' || status === 'REALIZADO') {
    return <StatusBadge tone="success">Atendimento concluído</StatusBadge>;
  }
  if (situacaoFila === 'NAO_ATENDIDO' || status === 'NAO_REALIZADO') {
    return <StatusBadge tone="danger">Não compareceu</StatusBadge>;
  }
  if (situacaoFila) {
    return <StatusBadge tone="neutral">{LABELS_SITUACAO_FILA[situacaoFila]}</StatusBadge>;
  }
  return (
    <StatusBadge tone="info">
      {LABELS_STATUS_AGENDAMENTO[status]} · Aguardando chegada
    </StatusBadge>
  );
}

function construirGradeMes(ano: number, mesZeroBased: number): Array<{
  iso: string;
  dia: number;
  pertenceAoMes: boolean;
}> {
  const primeiroDia = new Date(Date.UTC(ano, mesZeroBased, 1));
  const ultimoDia = new Date(Date.UTC(ano, mesZeroBased + 1, 0));
  const inicioSemana = primeiroDia.getUTCDay();

  const celulas: Array<{ iso: string; dia: number; pertenceAoMes: boolean }> = [];

  for (let i = inicioSemana; i > 0; i -= 1) {
    const dt = new Date(Date.UTC(ano, mesZeroBased, 1 - i));
    celulas.push({
      iso: dt.toISOString().slice(0, 10),
      dia: dt.getUTCDate(),
      pertenceAoMes: false,
    });
  }

  for (let d = 1; d <= ultimoDia.getUTCDate(); d += 1) {
    const dt = new Date(Date.UTC(ano, mesZeroBased, d));
    celulas.push({
      iso: dt.toISOString().slice(0, 10),
      dia: d,
      pertenceAoMes: true,
    });
  }

  while (celulas.length % 7 !== 0) {
    const ultimo = celulas[celulas.length - 1];
    const proxIso = somarDiasIso(ultimo.iso, 1);
    celulas.push({
      iso: proxIso,
      dia: Number(proxIso.slice(8, 10)),
      pertenceAoMes: false,
    });
  }

  return celulas;
}

function inicioSemanaDomingo(iso: string): string {
  const dt = new Date(`${iso}T12:00:00Z`);
  const ds = dt.getUTCDay();
  return somarDiasIso(iso, -ds);
}

export function AgendaClinicaView({
  unidadeId,
  profissionalIdFixo,
  profissionaisOpcoes = [],
  onAbrirConsultorioFila,
  onAbrirNovaAgenda,
  refreshTrigger = 0,
}: AgendaClinicaViewProps) {
  const toast = useToast();
  const hojeIso = hojeIsoMaceio();

  const [dataSelecionada, setDataSelecionada] = useState(hojeIso);
  const [mesRef, setMesRef] = useState(() => ({
    ano: Number(hojeIso.slice(0, 4)),
    mes: Number(hojeIso.slice(5, 7)) - 1,
  }));
  const [visualizacao, setVisualizacao] = useState<ModoVisualizacao>('DIA');
  const [filtroHorario, setFiltroHorario] = useState<FiltroHorario>('TODOS');
  const [profissionalFiltro, setProfissionalFiltro] = useState(
    profissionalIdFixo ?? ''
  );

  const [slots, setSlots] = useState<SlotGradeAgendaDTO[]>([]);
  const [resumoDias, setResumoDias] = useState<ResumoDiaGradeDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [slotModal, setSlotModal] = useState<SlotGradeAgendaDTO | null>(null);

  useEffect(() => {
    if (profissionalIdFixo) {
      setProfissionalFiltro(profissionalIdFixo);
    }
  }, [profissionalIdFixo]);

  const celulasCalendario = useMemo(
    () => construirGradeMes(mesRef.ano, mesRef.mes),
    [mesRef.ano, mesRef.mes]
  );

  const diasSemanaAtual = useMemo(() => {
    const inicio = inicioSemanaDomingo(dataSelecionada);
    return Array.from({ length: 7 }, (_, i) => somarDiasIso(inicio, i));
  }, [dataSelecionada]);

  const janelaConsulta = useMemo(() => {
    const calIni = celulasCalendario[0]?.iso ?? dataSelecionada;
    const calFim =
      celulasCalendario[celulasCalendario.length - 1]?.iso ?? dataSelecionada;
    const semIni = diasSemanaAtual[0];
    const semFim = diasSemanaAtual[6];
    return {
      dataInicio: calIni < semIni ? calIni : semIni,
      dataFim: calFim > semFim ? calFim : semFim,
    };
  }, [celulasCalendario, diasSemanaAtual, dataSelecionada]);

  const carregarGrade = useCallback(async () => {
    if (!unidadeId) return;
    setLoading(true);
    try {
      const res = await agendasApi.consultarGrade({
        unidadeId,
        profissionalId: (profissionalIdFixo || profissionalFiltro) || undefined,
        dataInicio: janelaConsulta.dataInicio,
        dataFim: janelaConsulta.dataFim,
      });
      setSlots(res.slots);
      setResumoDias(res.resumoDias);
    } catch (err) {
      toast.error('Erro ao carregar grade da agenda', extrairMensagemErro(err));
    } finally {
      setLoading(false);
    }
  }, [
    unidadeId,
    profissionalIdFixo,
    profissionalFiltro,
    janelaConsulta.dataInicio,
    janelaConsulta.dataFim,
    toast,
  ]);

  useEffect(() => {
    void carregarGrade();
  }, [carregarGrade, refreshTrigger]);

  const mapaResumoPorDia = useMemo(() => {
    const map = new Map<string, ResumoDiaGradeDTO>();
    for (const r of resumoDias) {
      map.set(r.data, r);
    }
    return map;
  }, [resumoDias]);

  const resumoDiaSelecionado = useMemo<ResumoDiaGradeDTO>(() => {
    return (
      mapaResumoPorDia.get(dataSelecionada) ?? {
        data: dataSelecionada,
        totalHorarios: 0,
        totalCapacidade: 0,
        totalAgendados: 0,
        totalLivres: 0,
        totalRealizados: 0,
        totalNaFila: 0,
      }
    );
  }, [mapaResumoPorDia, dataSelecionada]);

  const slotsDoDia = useMemo(() => {
    return slots.filter(
      (s) => extrairDataIsoMaceio(s.dataHoraInicio) === dataSelecionada
    );
  }, [slots, dataSelecionada]);

  const slotsDoDiaFiltrados = useMemo(() => {
    if (filtroHorario === 'COM_PACIENTES') {
      return slotsDoDia.filter((s) => s.agendamentos.length > 0);
    }
    if (filtroHorario === 'LIVRES') {
      return slotsDoDia.filter((s) => s.vagasDisponiveis > 0);
    }
    return slotsDoDia;
  }, [slotsDoDia, filtroHorario]);

  // Dados da grade semanal
  const gradeSemanal = useMemo(() => {
    const horariosSet = new Set<string>();
    const mapaCelulas = new Map<string, SlotGradeAgendaDTO[]>();

    for (const slot of slots) {
      const dataIso = extrairDataIsoMaceio(slot.dataHoraInicio);
      if (!diasSemanaAtual.includes(dataIso)) continue;
      const hora = formatarHora(slot.dataHoraInicio);
      horariosSet.add(hora);
      const chave = `${dataIso}::${hora}`;
      const lista = mapaCelulas.get(chave) ?? [];
      lista.push(slot);
      mapaCelulas.set(chave, lista);
    }

    return {
      horarios: Array.from(horariosSet).sort(),
      mapaCelulas,
    };
  }, [slots, diasSemanaAtual]);

  const selecionarDia = (iso: string) => {
    setDataSelecionada(iso);
    const ano = Number(iso.slice(0, 4));
    const mes = Number(iso.slice(5, 7)) - 1;
    if (ano !== mesRef.ano || mes !== mesRef.mes) {
      setMesRef({ ano, mes });
    }
  };

  const navegarMes = (delta: number) => {
    const dt = new Date(Date.UTC(mesRef.ano, mesRef.mes + delta, 1));
    setMesRef({ ano: dt.getUTCFullYear(), mes: dt.getUTCMonth() });
  };

  const medicosSelect = useMemo(
    () =>
      profissionaisOpcoes.filter(
        (p) => p.nivelAcesso === 'PROFISSIONAL_SAUDE' && p.status === 'ATIVO'
      ),
    [profissionaisOpcoes]
  );

  return (
    <div className="space-y-5">
      {/* KPIs do dia selecionado + Ações */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-[22px] bg-white border border-[#E2E8F0] p-4 shadow-soft">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
            Consultas Marcadas
          </p>
          <p className="mt-1.5 kpi-number text-3xl text-[#1E6BFF]">
            {String(resumoDiaSelecionado.totalAgendados).padStart(2, '0')}
          </p>
          <p className="mt-1 text-[11px] text-[#64748B]">
            em {formatarData(dataSelecionada)}
          </p>
        </div>

        <div className="rounded-[22px] bg-white border border-[#E2E8F0] p-4 shadow-soft">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
            Na Unidade / Fila
          </p>
          <p className="mt-1.5 kpi-number text-3xl text-emerald-600">
            {String(resumoDiaSelecionado.totalNaFila).padStart(2, '0')}
          </p>
          <p className="mt-1 text-[11px] text-[#64748B]">
            check-in confirmado
          </p>
        </div>

        <div className="rounded-[22px] bg-white border border-[#E2E8F0] p-4 shadow-soft">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
            Vagas Livres
          </p>
          <p className="mt-1.5 kpi-number text-3xl text-[#0F172A]">
            {String(resumoDiaSelecionado.totalLivres).padStart(2, '0')}
          </p>
          <p className="mt-1 text-[11px] text-[#64748B]">
            de {resumoDiaSelecionado.totalCapacidade} vagas abertas
          </p>
        </div>

        <div className="rounded-[22px] bg-white border border-[#E2E8F0] p-4 shadow-soft">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
            Concluídos no Dia
          </p>
          <p className="mt-1.5 kpi-number text-3xl text-[#0F172A]">
            {String(resumoDiaSelecionado.totalRealizados).padStart(2, '0')}
          </p>
          <p className="mt-1 text-[11px] text-[#64748B]">
            atendimentos finalizados
          </p>
        </div>
      </div>

      {/* Barra de controles */}
      <div className="rounded-[24px] bg-white border border-[#E2E8F0] p-4 shadow-soft flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-full bg-[#EFF4FB] p-1 border border-[#DBEAFE]">
            <button
              type="button"
              onClick={() => setVisualizacao('DIA')}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                visualizacao === 'DIA'
                  ? 'bg-[#1E6BFF] text-white'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <ListChecks className="h-3.5 w-3.5" />
              Dia + Calendário
            </button>
            <button
              type="button"
              onClick={() => setVisualizacao('SEMANA')}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                visualizacao === 'SEMANA'
                  ? 'bg-[#1E6BFF] text-white'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Grade Semanal
            </button>
          </div>

          <button
            type="button"
            onClick={() => selecionarDia(hojeIso)}
            className="rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-1.5 text-xs font-semibold text-[#0F172A] hover:border-[#1E6BFF]/40"
          >
            Ir para Hoje
          </button>

          <button
            type="button"
            onClick={() => void carregarGrade()}
            title="Atualizar agenda"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] hover:text-[#1E6BFF]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {!profissionalIdFixo && medicosSelect.length > 0 && (
            <div className="w-full sm:w-64">
              <SelectInput
                aria-label="Filtrar grade por médico"
                value={profissionalFiltro}
                onChange={(e) => setProfissionalFiltro(e.target.value)}
              >
                <option value="">Todos os médicos da unidade</option>
                {medicosSelect.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nomeExibicao}
                  </option>
                ))}
              </SelectInput>
            </div>
          )}

          {onAbrirNovaAgenda && (
            <PillButton
              size="sm"
              icon={<CalendarPlus className="h-3.5 w-3.5" />}
              onClick={onAbrirNovaAgenda}
            >
              Abrir horários
            </PillButton>
          )}
        </div>
      </div>

      {/* Conteúdo Principal */}
      {visualizacao === 'DIA' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Mini-Calendário Mensal */}
          <aside className="lg:col-span-4 rounded-[24px] bg-white border border-[#E2E8F0] p-5 shadow-soft space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-semibold text-[#0F172A]">
                {MESES_PT[mesRef.mes]} {mesRef.ano}
              </h3>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Mês anterior"
                  onClick={() => navegarMes(-1)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Próximo mês"
                  onClick={() => navegarMes(1)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-[#64748B]">
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((l, idx) => (
                <span key={`${l}-${idx}`} className="py-1">
                  {l}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {celulasCalendario.map((cel) => {
                const resumo = mapaResumoPorDia.get(cel.iso);
                const selecionado = cel.iso === dataSelecionada;
                const ehHoje = cel.iso === hojeIso;
                const temMarcados = Boolean(resumo && resumo.totalAgendados > 0);
                const temLivres = Boolean(resumo && resumo.totalLivres > 0);

                return (
                  <button
                    key={cel.iso}
                    type="button"
                    onClick={() => selecionarDia(cel.iso)}
                    className={`relative flex flex-col items-center justify-center rounded-xl py-2 text-xs font-semibold transition-all ${
                      selecionado
                        ? 'bg-[#1E6BFF] text-white shadow-sm'
                        : !cel.pertenceAoMes
                          ? 'text-[#CBD5E1] hover:bg-[#F8FAFC]'
                          : ehHoje
                            ? 'bg-[#EFF4FB] text-[#1E6BFF] border border-[#1E6BFF]/40'
                            : 'text-[#0F172A] hover:bg-[#F4F7FC]'
                    }`}
                  >
                    <span>{cel.dia}</span>
                    <span className="mt-1 flex items-center gap-0.5 h-1.5">
                      {temMarcados && (
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            selecionado ? 'bg-white' : 'bg-[#1E6BFF]'
                          }`}
                        />
                      )}
                      {temLivres && (
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            selecionado ? 'bg-emerald-200' : 'bg-emerald-500'
                          }`}
                        />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-[#E2E8F0] flex flex-wrap gap-3 text-[11px] text-[#64748B]">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#1E6BFF]" />
                Com pacientes marcados
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Com vagas livres
              </span>
            </div>
          </aside>

          {/* Linha do Tempo do Dia Selecionado */}
          <div className="lg:col-span-8 rounded-[24px] bg-white border border-[#E2E8F0] p-5 sm:p-6 shadow-soft space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E2E8F0]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#1E6BFF]">
                  Programação do dia
                </p>
                <h3 className="mt-0.5 font-display text-xl font-medium text-[#0F172A] capitalize">
                  {formatarDataCurta(`${dataSelecionada}T12:00:00Z`)} ·{' '}
                  {formatarData(dataSelecionada)}
                </h3>
              </div>

              <div className="inline-flex flex-wrap gap-1 rounded-full bg-[#F4F7FC] p-1 border border-[#E2E8F0]">
                {(
                  [
                    {
                      id: 'TODOS',
                      label: `Todos (${slotsDoDia.length})`,
                    },
                    {
                      id: 'COM_PACIENTES',
                      label: `Com pacientes (${
                        slotsDoDia.filter((s) => s.agendamentos.length > 0).length
                      })`,
                    },
                    {
                      id: 'LIVRES',
                      label: `Livres (${
                        slotsDoDia.filter((s) => s.vagasDisponiveis > 0).length
                      })`,
                    },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFiltroHorario(item.id)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                      filtroHorario === item.id
                        ? 'bg-[#1E6BFF] text-white'
                        : 'text-[#64748B] hover:text-[#0F172A]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-24 rounded-2xl" />
                <Skeleton className="h-24 rounded-2xl" />
                <Skeleton className="h-24 rounded-2xl" />
              </div>
            ) : slotsDoDiaFiltrados.length === 0 ? (
              <EmptyState
                icon={<CalendarIcon className="h-6 w-6" />}
                title="Nenhum horário publicado para esta data"
                description="Selecione outro dia destacado no calendário ou abra novos horários para atender nesta data."
                actionLabel={onAbrirNovaAgenda ? 'Abrir horários agora' : undefined}
                onAction={onAbrirNovaAgenda}
                className="border-dashed bg-[#F8FAFC]"
              />
            ) : (
              <div className="space-y-3.5">
                {slotsDoDiaFiltrados.map((slot) => {
                  const temPacientes = slot.agendamentos.length > 0;
                  const lotado = slot.vagasDisponiveis === 0;
                  const bloqueada = slot.situacaoAgenda === 'BLOQUEADA';

                  return (
                    <article
                      key={slot.id}
                      className={`rounded-2xl border p-4 transition-all ${
                        bloqueada
                          ? 'border-amber-200 bg-amber-50/40'
                          : temPacientes
                            ? 'border-[#1E6BFF]/25 bg-white shadow-sm'
                            : 'border-dashed border-emerald-300 bg-emerald-50/40'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex h-11 px-3.5 items-center justify-center rounded-xl font-display text-lg font-semibold ${
                              temPacientes
                                ? 'bg-[#EFF4FB] text-[#1E6BFF]'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {formatarHora(slot.dataHoraInicio)}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-[#0F172A]">
                              {slot.servicoNome}
                            </p>
                            <p className="text-xs text-[#64748B]">
                              {slot.especialidade}
                              {!profissionalIdFixo && slot.profissionalNome
                                ? ` · ${slot.profissionalNome}`
                                : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {bloqueada && (
                            <StatusBadge tone="warning">Agenda bloqueada</StatusBadge>
                          )}
                          {lotado ? (
                            <StatusBadge tone="info">
                              Lotado ({slot.vagasOcupadas}/{slot.capacidadeTotal})
                            </StatusBadge>
                          ) : temPacientes ? (
                            <StatusBadge tone="success">
                              {slot.agendamentos.length} marcado(s) ·{' '}
                              {slot.vagasDisponiveis} livre(s)
                            </StatusBadge>
                          ) : (
                            <StatusBadge tone="success" dot>
                              Horário Livre · {slot.vagasDisponiveis} vaga(s)
                            </StatusBadge>
                          )}
                        </div>
                      </div>

                      {/* Pacientes agendados neste horário */}
                      {temPacientes ? (
                        <div className="mt-3.5 pt-3 border-t border-[#E2E8F0]/80 space-y-2">
                          {slot.agendamentos.map((ag) => {
                            const naFilaAtiva =
                              ag.situacaoFila === 'AGUARDANDO' ||
                              ag.situacaoFila === 'CHAMADO' ||
                              ag.situacaoFila === 'EM_ATENDIMENTO';

                            return (
                              <div
                                key={ag.id}
                                className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]/90 px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                              >
                                <div className="flex items-start gap-2.5 min-w-0">
                                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white border border-[#E2E8F0] text-[#1E6BFF]">
                                    <User className="h-3.5 w-3.5" />
                                  </span>
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <p className="text-sm font-semibold text-[#0F172A] truncate">
                                        {ag.pacienteNomeExibicao}
                                      </p>
                                      {ag.ehPrioritarioLegal && (
                                        <StatusBadge tone="warning">
                                          <ShieldAlert className="h-3 w-3" />
                                          {
                                            LABELS_CRITERIO_PRIORIDADE[
                                              ag.criterioPrioridade as keyof typeof LABELS_CRITERIO_PRIORIDADE
                                            ] ?? 'Prioritário'
                                          }
                                        </StatusBadge>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-[#64748B]">
                                      Senha <strong>{ag.senhaAtendimento}</strong> ·
                                      Protocolo{' '}
                                      <code className="text-[#1E6BFF] font-semibold">
                                        {ag.protocolo}
                                      </code>
                                    </p>
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 shrink-0">
                                  {badgePresencaPaciente(
                                    ag.status,
                                    ag.situacaoFila,
                                    ag.guicheSalaChamada
                                  )}
                                  {naFilaAtiva && onAbrirConsultorioFila && (
                                    <button
                                      type="button"
                                      onClick={onAbrirConsultorioFila}
                                      className="inline-flex items-center gap-1 rounded-full bg-[#1E6BFF] px-3 py-1 text-[11px] font-semibold text-white hover:bg-[#1554D9]"
                                    >
                                      <Megaphone className="h-3 w-3" />
                                      Chamar
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="mt-2.5 inline-flex items-center gap-1.5 text-xs text-emerald-800">
                          <Sparkles className="h-3.5 w-3.5" />
                          Disponível para marcação pelo portal do cidadão ou recepção.
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Grade Semanal (Seg–Dom × Horários) */
        <div className="rounded-[24px] bg-white border border-[#E2E8F0] p-5 shadow-soft space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#1E6BFF]">
                Visão Semanal
              </p>
              <h3 className="font-display text-lg font-medium text-[#0F172A]">
                {formatarData(diasSemanaAtual[0])} até{' '}
                {formatarData(diasSemanaAtual[6])}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  selecionarDia(somarDiasIso(dataSelecionada, -7))
                }
                className="inline-flex items-center gap-1 rounded-full border border-[#E2E8F0] px-3 py-1.5 text-xs font-semibold text-[#0F172A] hover:bg-[#F8FAFC]"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Semana anterior
              </button>
              <button
                type="button"
                onClick={() =>
                  selecionarDia(somarDiasIso(dataSelecionada, 7))
                }
                className="inline-flex items-center gap-1 rounded-full border border-[#E2E8F0] px-3 py-1.5 text-xs font-semibold text-[#0F172A] hover:bg-[#F8FAFC]"
              >
                Próxima semana
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {loading ? (
            <Skeleton className="h-64 rounded-2xl" />
          ) : gradeSemanal.horarios.length === 0 ? (
            <EmptyState
              icon={<CalendarIcon className="h-6 w-6" />}
              title="Nenhum horário publicado nesta semana"
              description="Navegue para outra semana ou abra novos horários para atender."
              actionLabel={onAbrirNovaAgenda ? 'Abrir horários' : undefined}
              onAction={onAbrirNovaAgenda}
              className="border-dashed bg-[#F8FAFC]"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-xs">
                    <th className="py-2.5 pr-3 font-semibold text-[#64748B] w-20">
                      Horário
                    </th>
                    {diasSemanaAtual.map((iso) => {
                      const ehHoje = iso === hojeIso;
                      return (
                        <th key={iso} className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              selecionarDia(iso);
                              setVisualizacao('DIA');
                            }}
                            className={`w-full rounded-xl px-2 py-1.5 text-xs font-semibold capitalize transition-colors ${
                              ehHoje
                                ? 'bg-[#1E6BFF] text-white'
                                : 'bg-[#F8FAFC] text-[#0F172A] hover:bg-[#EFF4FB]'
                            }`}
                          >
                            {formatarDataCurta(`${iso}T12:00:00Z`)}
                          </button>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]/70">
                  {gradeSemanal.horarios.map((hora) => (
                    <tr key={hora}>
                      <td className="py-2.5 pr-3 text-xs font-semibold text-[#0F172A] align-top">
                        <span className="inline-flex items-center gap-1 pt-1">
                          <Clock className="h-3 w-3 text-[#1E6BFF]" />
                          {hora}
                        </span>
                      </td>
                      {diasSemanaAtual.map((iso) => {
                        const celSlots =
                          gradeSemanal.mapaCelulas.get(`${iso}::${hora}`) ?? [];
                        if (celSlots.length === 0) {
                          return (
                            <td key={iso} className="p-1.5 text-center text-[11px] text-[#CBD5E1]">
                              —
                            </td>
                          );
                        }
                        return (
                          <td key={iso} className="p-1.5 align-top space-y-1">
                            {celSlots.map((slot) => {
                              const marcados = slot.agendamentos.length;
                              const livres = slot.vagasDisponiveis;
                              const lotado = livres === 0;
                              return (
                                <button
                                  key={slot.id}
                                  type="button"
                                  onClick={() => setSlotModal(slot)}
                                  className={`w-full rounded-xl border p-2 text-left text-[11px] transition-all hover:shadow-sm ${
                                    lotado
                                      ? 'bg-[#EFF4FB] border-[#1E6BFF]/40 text-[#1E6BFF]'
                                      : marcados > 0
                                        ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                                        : 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
                                  }`}
                                >
                                  <p className="font-semibold truncate">
                                    {slot.servicoNome}
                                  </p>
                                  <p className="mt-0.5 font-medium">
                                    {marcados > 0
                                      ? `${marcados} marcado(s) · ${livres} livre(s)`
                                      : `Livre · ${livres} vaga(s)`}
                                  </p>
                                </button>
                              );
                            })}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal de detalhes do slot clicado na grade semanal */}
      <Modal
        open={Boolean(slotModal)}
        onClose={() => setSlotModal(null)}
        title={
          slotModal
            ? `${slotModal.servicoNome} · ${formatarHora(slotModal.dataHoraInicio)}`
            : ''
        }
        subtitle={
          slotModal
            ? `${formatarDataCurta(slotModal.dataHoraInicio)} · ${
                slotModal.agendamentos.length
              } marcado(s) e ${slotModal.vagasDisponiveis} vaga(s) livre(s)`
            : undefined
        }
        size="md"
      >
        {slotModal && (
          <div className="space-y-4">
            {slotModal.agendamentos.length === 0 ? (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Horário totalmente livre com {slotModal.vagasDisponiveis} vaga(s) disponíveis.
              </div>
            ) : (
              <div className="space-y-2.5">
                {slotModal.agendamentos.map((ag) => (
                  <div
                    key={ag.id}
                    className="rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#0F172A]">
                        {ag.pacienteNomeExibicao}
                      </p>
                      <p className="text-[11px] text-[#64748B]">
                        Senha {ag.senhaAtendimento} · {ag.protocolo}
                      </p>
                    </div>
                    {badgePresencaPaciente(
                      ag.status,
                      ag.situacaoFila,
                      ag.guicheSalaChamada
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <PillButton
                variant="ghost"
                size="sm"
                hideIconCircle
                onClick={() => {
                  selecionarDia(extrairDataIsoMaceio(slotModal.dataHoraInicio));
                  setVisualizacao('DIA');
                  setSlotModal(null);
                }}
              >
                Abrir dia na timeline
              </PillButton>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
