import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Activity,
  BellRing,
  Building2,
  CalendarCheck,
  CalendarPlus,
  CheckCircle2,
  ClipboardList,
  Clock,
  MapPin,
  Radio,
  ShieldCheck,
  User,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  agendamentosApi,
  agendasApi,
  extrairMensagemErro,
  filaApi,
  pacientesApi,
  servicosApi,
  unidadesApi,
} from '../services/api';
import type {
  AgendamentoDTO,
  AgendamentoDetalhadoDTO,
  AtualizarPacienteInput,
  PacienteDTO,
  PosicaoPacienteFilaDTO,
  PossuiDeficiencia,
  ServicoDTO,
  StatusAgendamento,
  TipoDeficiencia,
  UnidadeSaudeDTO,
  VagaDisponivelDTO,
} from '../types/api';
import {
  LABELS_CRITERIO_PRIORIDADE,
  LABELS_GRUPO_ATENDIMENTO,
  LABELS_ORIGEM_MARCACAO,
  LABELS_SITUACAO_CNS,
  LABELS_SITUACAO_FILA,
  LABELS_STATUS_AGENDAMENTO,
  LABELS_TIPO_DEFICIENCIA,
  UFS_BRASIL,
  formatarCep,
  formatarCns,
  formatarData,
  formatarDataCurta,
  formatarDataHora,
  formatarHora,
  maskCep,
  maskTelefone,
  nullableTrim,
  somenteDigitos,
} from '../utils/formatters';
import { Navbar } from '../components/layout/Navbar';
import { EmptyState } from '../components/ui/EmptyState';
import { FormField, SelectInput, TextAreaInput, TextInput } from '../components/ui/FormControls';
import { Modal } from '../components/ui/Modal';
import { NumberedCard } from '../components/ui/NumberedCard';
import { PillButton } from '../components/ui/PillButton';
import { CardSkeleton, Skeleton } from '../components/ui/Skeleton';
import { StatusBadge } from '../components/ui/StatusBadge';

type AbaPaciente = 'fila' | 'agendar' | 'agendamentos' | 'perfil';

const TIPOS_DEFICIENCIA: TipoDeficiencia[] = [
  'FISICA',
  'AUDITIVA',
  'VISUAL',
  'INTELECTUAL',
  'PSICOSSOCIAL',
  'TEA',
];

function badgeStatusAgendamento(status: StatusAgendamento) {
  switch (status) {
    case 'AGENDADO':
      return <StatusBadge tone="info" dot>{LABELS_STATUS_AGENDAMENTO[status]}</StatusBadge>;
    case 'REALIZADO':
      return <StatusBadge tone="success">{LABELS_STATUS_AGENDAMENTO[status]}</StatusBadge>;
    case 'CANCELADO':
      return <StatusBadge tone="danger">{LABELS_STATUS_AGENDAMENTO[status]}</StatusBadge>;
    case 'NAO_REALIZADO':
      return <StatusBadge tone="warning">{LABELS_STATUS_AGENDAMENTO[status]}</StatusBadge>;
  }
}

export function PacientePage() {
  const { usuario, refreshUser } = useAuth();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const abaInicial = (searchParams.get('aba') as AbaPaciente | null) ?? 'fila';
  const [aba, setAba] = useState<AbaPaciente>(
    ['fila', 'agendar', 'agendamentos', 'perfil'].includes(abaInicial)
      ? abaInicial
      : 'fila'
  );

  // Estado Minha Fila (polling 4s)
  const [posicoesFila, setPosicoesFila] = useState<PosicaoPacienteFilaDTO[]>([]);
  const [loadingFila, setLoadingFila] = useState(true);

  // Estado Meus Agendamentos
  const [meusAgendamentos, setMeusAgendamentos] = useState<AgendamentoDetalhadoDTO[]>([]);
  const [loadingAgendamentos, setLoadingAgendamentos] = useState(true);
  const [filtroStatusAg, setFiltroStatusAg] = useState<StatusAgendamento | 'TODOS'>('TODOS');

  // Cancelamento
  const [agendamentoParaCancelar, setAgendamentoParaCancelar] =
    useState<AgendamentoDetalhadoDTO | null>(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');
  const [cancelando, setCancelando] = useState(false);

  // Fluxo Agendar
  const [unidades, setUnidades] = useState<UnidadeSaudeDTO[]>([]);
  const [servicos, setServicos] = useState<ServicoDTO[]>([]);
  const [vagas, setVagas] = useState<VagaDisponivelDTO[]>([]);
  const [loadingCatalogo, setLoadingCatalogo] = useState(false);
  const [loadingVagas, setLoadingVagas] = useState(false);

  const [unidadeSel, setUnidadeSel] = useState(searchParams.get('unidadeId') ?? '');
  const [servicoSel, setServicoSel] = useState(searchParams.get('servicoId') ?? '');
  const [vagaConfirmando, setVagaConfirmando] = useState<VagaDisponivelDTO | null>(null);
  const [marcando, setMarcando] = useState(false);
  const [comprovante, setComprovante] = useState<AgendamentoDTO | null>(null);

  // Perfil
  const [perfilPaciente, setPerfilPaciente] = useState<PacienteDTO | null>(null);
  const [loadingPerfil, setLoadingPerfil] = useState(true);
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const [nomeSocial, setNomeSocial] = useState('');
  const [email, setEmail] = useState('');
  const [celular, setCelular] = useState('');
  const [celularWhatsapp, setCelularWhatsapp] = useState(false);
  const [possuiDeficiencia, setPossuiDeficiencia] = useState<PossuiDeficiencia>('NAO');
  const [tiposDeficiencia, setTiposDeficiencia] = useState<TipoDeficiencia[]>([]);
  const [preferenciasAcessibilidade, setPreferenciasAcessibilidade] = useState('');
  const [cep, setCep] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [estado, setEstado] = useState('AL');

  const trocarAba = (novaAba: AbaPaciente) => {
    setAba(novaAba);
    setSearchParams({ aba: novaAba }, { replace: true });
  };

  const carregarMinhaPosicao = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoadingFila(true);
    try {
      const res = await filaApi.minhaPosicao();
      setPosicoesFila(res.entradas);
    } catch {
      // erro silencioso no polling
    } finally {
      if (!silencioso) setLoadingFila(false);
    }
  }, []);

  const carregarMeusAgendamentos = useCallback(async () => {
    setLoadingAgendamentos(true);
    try {
      const res = await agendamentosApi.meus();
      setMeusAgendamentos(res.agendamentos);
    } catch (err) {
      toast.error('Erro ao carregar agendamentos', extrairMensagemErro(err));
    } finally {
      setLoadingAgendamentos(false);
    }
  }, [toast]);

  const preencherFormularioPerfil = useCallback((p: PacienteDTO) => {
    setPerfilPaciente(p);
    setNomeSocial(p.nomeSocial ?? '');
    setEmail(p.email ?? '');
    setCelular(p.celular ? maskTelefone(p.celular) : '');
    setCelularWhatsapp(p.celularWhatsapp);
    setPossuiDeficiencia(p.possuiDeficiencia);
    setTiposDeficiencia(p.tiposDeficiencia ?? []);
    setPreferenciasAcessibilidade(p.preferenciasAcessibilidade ?? '');
    setCep(formatarCep(p.endereco.cep));
    setLogradouro(p.endereco.logradouro);
    setNumero(p.endereco.numero);
    setComplemento(p.endereco.complemento ?? '');
    setBairro(p.endereco.bairro);
    setMunicipio(p.endereco.municipio);
    setEstado(p.endereco.estado);
  }, []);

  const carregarPerfil = useCallback(async () => {
    setLoadingPerfil(true);
    try {
      const res = await pacientesApi.obterMe();
      preencherFormularioPerfil(res.paciente);
    } catch (err) {
      toast.error('Erro ao carregar perfil', extrairMensagemErro(err));
    } finally {
      setLoadingPerfil(false);
    }
  }, [preencherFormularioPerfil, toast]);

  useEffect(() => {
    void carregarMinhaPosicao(false);
    void carregarMeusAgendamentos();
    void carregarPerfil();

    const interval = window.setInterval(() => {
      void carregarMinhaPosicao(true);
    }, 4000);

    return () => window.clearInterval(interval);
  }, [carregarMinhaPosicao, carregarMeusAgendamentos, carregarPerfil]);

  // Carrega catálogo de unidades/serviços para aba agendar
  useEffect(() => {
    if (aba !== 'agendar') return;
    let ativo = true;
    const carregar = async () => {
      setLoadingCatalogo(true);
      try {
        const [uRes, sRes] = await Promise.all([
          unidadesApi.listar({ status: 'ATIVA' }),
          servicosApi.listar(),
        ]);
        if (!ativo) return;
        setUnidades(uRes.unidades);
        setServicos(sRes.servicos);
      } catch (err) {
        toast.error('Erro ao carregar catálogo', extrairMensagemErro(err));
      } finally {
        if (ativo) setLoadingCatalogo(false);
      }
    };
    void carregar();
    return () => {
      ativo = false;
    };
  }, [aba, toast]);

  const buscarVagas = useCallback(async () => {
    setLoadingVagas(true);
    try {
      const res = await agendasApi.listarDisponiveis({
        unidadeId: unidadeSel || undefined,
        servicoId: servicoSel || undefined,
      });
      setVagas(res.vagas);
    } catch (err) {
      toast.error('Erro ao consultar vagas', extrairMensagemErro(err));
    } finally {
      setLoadingVagas(false);
    }
  }, [unidadeSel, servicoSel, toast]);

  useEffect(() => {
    if (aba === 'agendar') {
      void buscarVagas();
    }
  }, [aba, buscarVagas]);

  const vagasAgrupadasPorData = useMemo(() => {
    const grupos = new Map<string, VagaDisponivelDTO[]>();
    for (const vaga of vagas) {
      const dia = formatarDataCurta(vaga.dataHoraInicio);
      const lista = grupos.get(dia) ?? [];
      lista.push(vaga);
      grupos.set(dia, lista);
    }
    return Array.from(grupos.entries());
  }, [vagas]);

  const handleConfirmarAgendamento = async () => {
    if (!vagaConfirmando) return;
    setMarcando(true);
    try {
      const res = await agendamentosApi.marcar({ vagaId: vagaConfirmando.id });
      setComprovante(res.agendamento);
      setVagaConfirmando(null);
      toast.success(
        'Agendamento confirmado!',
        `Protocolo ${res.agendamento.protocolo}`
      );
      await Promise.all([carregarMeusAgendamentos(), buscarVagas()]);
    } catch (err) {
      toast.error('Não foi possível agendar', extrairMensagemErro(err));
    } finally {
      setMarcando(false);
    }
  };

  const handleCancelarAgendamento = async (e: FormEvent) => {
    e.preventDefault();
    if (!agendamentoParaCancelar) return;
    if (motivoCancelamento.trim().length < 5) {
      toast.warning(
        'Motivo obrigatório',
        'Informe um motivo com pelo menos 5 caracteres.'
      );
      return;
    }

    setCancelando(true);
    try {
      await agendamentosApi.cancelar(
        agendamentoParaCancelar.id,
        motivoCancelamento.trim()
      );
      toast.success('Agendamento cancelado', 'A vaga foi liberada imediatamente.');
      setAgendamentoParaCancelar(null);
      setMotivoCancelamento('');
      await carregarMeusAgendamentos();
    } catch (err) {
      toast.error('Erro ao cancelar', extrairMensagemErro(err));
    } finally {
      setCancelando(false);
    }
  };

  const handleSalvarPerfil = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() && !celular.trim()) {
      toast.warning('Contato obrigatório', 'Mantenha ao menos um e-mail ou celular.');
      return;
    }

    const payload: AtualizarPacienteInput = {
      nomeSocial: nullableTrim(nomeSocial),
      email: nullableTrim(email),
      celular: nullableTrim(celular ? somenteDigitos(celular) : ''),
      celularWhatsapp,
      possuiDeficiencia,
      tiposDeficiencia: possuiDeficiencia === 'SIM' ? tiposDeficiencia : [],
      preferenciasAcessibilidade: nullableTrim(preferenciasAcessibilidade),
      endereco: {
        cep: somenteDigitos(cep),
        logradouro: logradouro.trim(),
        numero: numero.trim(),
        complemento: nullableTrim(complemento),
        bairro: bairro.trim(),
        municipio: municipio.trim(),
        estado: estado.trim().toUpperCase(),
      },
    };

    setSalvandoPerfil(true);
    try {
      const res = await pacientesApi.atualizarMe(payload);
      preencherFormularioPerfil(res.paciente);
      await refreshUser();
      toast.success('Perfil atualizado com sucesso');
    } catch (err) {
      toast.error('Erro ao atualizar perfil', extrairMensagemErro(err));
    } finally {
      setSalvandoPerfil(false);
    }
  };

  const agendamentosFiltrados = useMemo(() => {
    if (filtroStatusAg === 'TODOS') return meusAgendamentos;
    return meusAgendamentos.filter((a) => a.status === filtroStatusAg);
  }, [meusAgendamentos, filtroStatusAg]);

  const proximoAgendamentoAtivo = useMemo(
    () => meusAgendamentos.find((a) => a.status === 'AGENDADO') ?? null,
    [meusAgendamentos]
  );

  const navItems: Array<{ id: AbaPaciente; label: string; icon: typeof Radio }> = [
    { id: 'fila', label: 'Minha Fila', icon: Radio },
    { id: 'agendar', label: 'Agendar', icon: CalendarPlus },
    { id: 'agendamentos', label: 'Agendamentos', icon: ClipboardList },
    { id: 'perfil', label: 'Perfil', icon: User },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] pb-24 md:pb-12">
      <Navbar variant="portal" />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Cabeçalho do portal */}
        <section className="rounded-[28px] bg-white border border-[#E2E8F0] p-6 shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone="info">Portal do cidadão</StatusBadge>
              {perfilPaciente?.ehPrioritarioLegal && (
                <StatusBadge tone="success">
                  Prioridade Legal ·{' '}
                  {LABELS_CRITERIO_PRIORIDADE[perfilPaciente.criterioPrioridade]}
                </StatusBadge>
              )}
            </div>
            <h1 className="mt-2 font-display text-2xl sm:text-3xl font-normal tracking-tight text-[#0F172A]">
              Olá, {usuario?.nomeExibicao ?? 'Cidadão'}
            </h1>
            <p className="mt-1 text-xs text-[#64748B]">
              Acompanhe sua posição na fila presencial, marque consultas e
              mantenha seus dados atualizados.
            </p>
          </div>

          {/* Abas no desktop */}
          <div className="hidden md:inline-flex items-center gap-1 rounded-full bg-[#EFF4FB] p-1.5 border border-[#DBEAFE]">
            {navItems.map((item) => {
              const Icon = item.icon;
              const ativo = aba === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => trocarAba(item.id)}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                    ativo
                      ? 'bg-[#1E6BFF] text-white shadow-sm'
                      : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Aba 1: minha posição na fila */}
        {aba === 'fila' && (
          <section className="space-y-6">
            {loadingFila ? (
              <Skeleton className="h-64 w-full rounded-[32px]" />
            ) : posicoesFila.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {posicoesFila.map((item) => {
                  const chamado =
                    item.situacao === 'CHAMADO' ||
                    item.situacao === 'EM_ATENDIMENTO';

                  return (
                    <article
                      key={item.entradaId}
                      className={`relative overflow-hidden rounded-[32px] p-7 text-white shadow-cobalt flex flex-col justify-between min-h-[300px] ${
                        chamado
                          ? 'bg-cobalt-gradient ring-4 ring-emerald-300/60'
                          : 'bg-cobalt-gradient'
                      }`}
                    >
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-white/15 blur-3xl"
                      />

                      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
                        <span className="glass-on-cobalt inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium">
                          <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
                          {LABELS_SITUACAO_FILA[item.situacao]}
                        </span>
                        <span className="glass-on-cobalt rounded-full px-3 py-1 text-xs font-medium">
                          {LABELS_GRUPO_ATENDIMENTO[item.grupoAtendimento]}
                        </span>
                      </div>

                      <div className="relative z-10 my-6">
                        <p className="text-xs uppercase tracking-widest text-white/75">
                          Sua senha na unidade
                        </p>
                        <div className="mt-1 flex items-baseline justify-between gap-4">
                          <span className="font-display text-5xl sm:text-6xl font-semibold tracking-tight">
                            {item.senhaAtendimento}
                          </span>
                          {item.situacao === 'AGUARDANDO' && (
                            <div className="text-right">
                              <p className="kpi-number text-4xl sm:text-5xl">
                                {item.posicaoNaFila}º
                              </p>
                              <p className="text-xs text-white/80">
                                posição na fila
                              </p>
                            </div>
                          )}
                        </div>

                        {chamado && item.guicheSala ? (
                          <div className="mt-5 glass-badge rounded-2xl p-4 text-[#0F172A] flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[11px] font-medium text-[#64748B]">
                                {item.situacao === 'CHAMADO'
                                  ? 'Dirija-se agora para'
                                  : 'Em atendimento em'}
                              </p>
                              <p className="font-display text-xl font-semibold text-[#1E6BFF]">
                                {item.guicheSala}
                              </p>
                            </div>
                            <BellRing className="h-6 w-6 text-[#1E6BFF] animate-bounce" />
                          </div>
                        ) : (
                          <div className="mt-5 glass-on-cobalt rounded-2xl p-4 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs text-white/75">
                                Pessoas à sua frente
                              </p>
                              <p className="font-display text-2xl font-medium">
                                {item.pessoasAFrente}{' '}
                                {item.pessoasAFrente === 1 ? 'pessoa' : 'pessoas'}
                              </p>
                            </div>
                            <Link
                              to={`/painel/${item.unidadeId}`}
                              className="rounded-full bg-white px-3.5 py-2 text-xs font-semibold text-[#1E6BFF] hover:bg-[#EFF4FB]"
                            >
                              Ver painel TV
                            </Link>
                          </div>
                        )}
                      </div>

                      <div className="relative z-10 flex items-center justify-between gap-2 pt-3 border-t border-white/15 text-xs text-white/80">
                        <span className="truncate">{item.unidadeNome}</span>
                        <span>Atualizado a cada 4s</span>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-7 rounded-[32px] bg-cobalt-gradient p-7 sm:p-9 text-white shadow-cobalt flex flex-col justify-between">
                  <div>
                    <span className="glass-on-cobalt inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium">
                      <Activity className="h-3.5 w-3.5" />
                      Fila presencial do dia
                    </span>
                    <h2 className="mt-5 font-display text-2xl sm:text-3xl font-normal">
                      Você ainda não realizou check-in hoje
                    </h2>
                    <p className="mt-2 text-sm text-white/80 leading-relaxed max-w-lg">
                      Ao chegar na unidade de saúde no dia do seu agendamento,
                      apresente seu protocolo ou CPF na recepção para entrar na
                      fila e acompanhar sua posição por aqui.
                    </p>
                  </div>

                  <div className="mt-8 flex flex-wrap gap-3">
                    <PillButton
                      variant="white"
                      onClick={() => trocarAba('agendar')}
                    >
                      Agendar novo atendimento
                    </PillButton>
                    <Link
                      to="/painel"
                      className="inline-flex items-center rounded-full glass-on-cobalt px-5 py-2.5 text-xs font-medium text-white hover:bg-white/25 transition-colors"
                    >
                      Abrir painel público
                    </Link>
                  </div>
                </div>

                <div className="lg:col-span-5 rounded-[28px] bg-white border border-[#E2E8F0] p-6 shadow-soft flex flex-col justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#1E6BFF]">
                      Próximo agendamento
                    </p>
                    {proximoAgendamentoAtivo ? (
                      <div className="mt-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-display text-lg font-medium text-[#0F172A]">
                            {proximoAgendamentoAtivo.servicoNome}
                          </span>
                          <StatusBadge tone="info">
                            {proximoAgendamentoAtivo.senhaAtendimento}
                          </StatusBadge>
                        </div>
                        <p className="text-xs text-[#64748B]">
                          {proximoAgendamentoAtivo.unidadeNome}
                        </p>
                        <div className="rounded-2xl bg-[#F4F7FC] p-3.5 text-xs space-y-1">
                          <p>
                            <strong>Data/Hora:</strong>{' '}
                            {formatarDataHora(
                              proximoAgendamentoAtivo.dataHoraAtendimento
                            )}
                          </p>
                          <p>
                            <strong>Protocolo:</strong>{' '}
                            <code className="font-semibold text-[#1E6BFF]">
                              {proximoAgendamentoAtivo.protocolo}
                            </code>
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-[#64748B]">
                        Você não possui agendamentos futuros marcados no
                        momento.
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => trocarAba('agendamentos')}
                    className="mt-6 text-left text-xs font-semibold text-[#1E6BFF] hover:text-[#1554D9]"
                  >
                    Ver todos os meus agendamentos
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Aba 2: agendar atendimento */}
        {aba === 'agendar' && (
          <section className="space-y-6">
            <div className="rounded-[28px] bg-white border border-[#E2E8F0] p-6 sm:p-8 shadow-soft space-y-6">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#1E6BFF]">
                  Marcação em 3 passos
                </span>
                <h2 className="mt-1 font-display text-2xl font-normal text-[#0F172A]">
                  Agendar consulta ou procedimento
                </h2>
                <p className="mt-1 text-xs text-[#64748B]">
                  Selecione a unidade e o serviço desejado para visualizar os
                  horários publicados disponíveis.
                </p>
              </div>

              {loadingCatalogo ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="1. Unidade de saúde" htmlFor="ag-unidade">
                    <SelectInput
                      id="ag-unidade"
                      value={unidadeSel}
                      onChange={(e) => setUnidadeSel(e.target.value)}
                    >
                      <option value="">Todas as unidades ativas</option>
                      {unidades.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nome} ({u.endereco.municipio})
                        </option>
                      ))}
                    </SelectInput>
                  </FormField>

                  <FormField label="2. Serviço ou especialidade" htmlFor="ag-servico">
                    <SelectInput
                      id="ag-servico"
                      value={servicoSel}
                      onChange={(e) => setServicoSel(e.target.value)}
                    >
                      <option value="">Todos os serviços ativos</option>
                      {servicos.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nome} ({s.especialidade})
                        </option>
                      ))}
                    </SelectInput>
                  </FormField>
                </div>
              )}

              <div className="pt-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                    3. Horários disponíveis ({vagas.length})
                  </h3>
                  {(unidadeSel || servicoSel) && (
                    <button
                      type="button"
                      onClick={() => {
                        setUnidadeSel('');
                        setServicoSel('');
                      }}
                      className="text-xs font-medium text-[#1E6BFF] hover:underline"
                    >
                      Limpar filtros
                    </button>
                  )}
                </div>

                {loadingVagas ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <CardSkeleton />
                    <CardSkeleton />
                    <CardSkeleton />
                  </div>
                ) : vagasAgrupadasPorData.length === 0 ? (
                  <EmptyState
                    icon={<CalendarPlus className="h-6 w-6" />}
                    title="Nenhuma vaga disponível para este filtro"
                    description="Tente selecionar outra unidade de saúde ou outro serviço ativo."
                    className="border-dashed bg-[#F8FAFC]"
                  />
                ) : (
                  <div className="space-y-6">
                    {vagasAgrupadasPorData.map(([dia, lista]) => (
                      <div key={dia} className="space-y-3">
                        <h4 className="inline-flex items-center gap-2 rounded-full bg-[#EFF4FB] px-3.5 py-1 text-xs font-semibold text-[#1E6BFF] capitalize">
                          <Clock className="h-3.5 w-3.5" />
                          {dia}
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                          {lista.map((vaga) => (
                            <div
                              key={vaga.id}
                              className="rounded-[20px] border border-[#E2E8F0] bg-white p-4 hover:border-[#1E6BFF]/40 hover:shadow-soft transition-all flex flex-col justify-between gap-3"
                            >
                              <div>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-display text-2xl font-medium text-[#0F172A]">
                                    {formatarHora(vaga.dataHoraInicio)}
                                  </span>
                                  <StatusBadge tone="success">
                                    {vaga.vagasDisponiveis} livre(s)
                                  </StatusBadge>
                                </div>
                                <p className="mt-2 text-sm font-medium text-[#0F172A]">
                                  {vaga.servicoNome}
                                </p>
                                <p className="mt-0.5 text-xs text-[#64748B]">
                                  {vaga.unidadeNome}
                                </p>
                                {vaga.profissionalNome && (
                                  <p className="mt-1 text-xs text-[#64748B]">
                                    Prof.: {vaga.profissionalNome}
                                  </p>
                                )}
                              </div>

                              <PillButton
                                size="sm"
                                fullWidth
                                onClick={() => setVagaConfirmando(vaga)}
                              >
                                Selecionar horário
                              </PillButton>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Aba 3: meus agendamentos */}
        {aba === 'agendamentos' && (
          <section className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-3">
              <h2 className="font-display text-2xl font-normal text-[#0F172A]">
                Meus agendamentos
              </h2>
              <div className="grid grid-cols-2 sm:inline-flex w-full sm:w-auto gap-1 rounded-2xl sm:rounded-full bg-white border border-[#E2E8F0] p-1">
                {(
                  [
                    { id: 'TODOS', label: 'Todos' },
                    { id: 'AGENDADO', label: 'Agendados' },
                    { id: 'REALIZADO', label: 'Realizados' },
                    { id: 'CANCELADO', label: 'Cancelados' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFiltroStatusAg(item.id)}
                    className={`w-full sm:w-auto text-center rounded-xl sm:rounded-full px-3.5 py-2 sm:py-1.5 text-xs font-medium transition-colors ${
                      filtroStatusAg === item.id
                        ? 'bg-[#1E6BFF] text-white'
                        : 'text-[#64748B] hover:text-[#0F172A]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {loadingAgendamentos ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <CardSkeleton />
                <CardSkeleton />
              </div>
            ) : agendamentosFiltrados.length === 0 ? (
              <EmptyState
                icon={<ClipboardList className="h-6 w-6" />}
                title="Nenhum agendamento encontrado"
                description="Seus agendamentos de consultas e procedimentos aparecerão listados aqui com protocolo e senha."
                actionLabel="Agendar atendimento"
                onAction={() => trocarAba('agendar')}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {agendamentosFiltrados.map((ag, idx) => (
                  <NumberedCard
                    key={ag.id}
                    index={idx + 1}
                    icon={<CalendarCheck className="h-5 w-5" />}
                    title={ag.servicoNome}
                    description={ag.orientacoesPreparo}
                    badge={badgeStatusAgendamento(ag.status)}
                    actionLabel={
                      ag.status === 'AGENDADO' ? 'Cancelar agendamento' : undefined
                    }
                    onAction={
                      ag.status === 'AGENDADO'
                        ? () => {
                            setAgendamentoParaCancelar(ag);
                            setMotivoCancelamento('');
                          }
                        : undefined
                    }
                    rightMeta={LABELS_ORIGEM_MARCACAO[ag.origemMarcacao]}
                  >
                    <div className="rounded-2xl bg-[#F4F7FC] border border-[#E2E8F0]/80 p-3.5 space-y-1.5 text-xs">
                      <p className="flex items-center justify-between gap-2">
                        <span className="text-[#64748B]">Unidade</span>
                        <span className="font-medium text-[#0F172A] text-right">
                          {ag.unidadeNome}
                        </span>
                      </p>
                      <p className="flex items-center justify-between gap-2">
                        <span className="text-[#64748B]">Data e horário</span>
                        <span className="font-medium text-[#0F172A]">
                          {formatarDataHora(ag.dataHoraAtendimento)}
                        </span>
                      </p>
                      <p className="flex items-center justify-between gap-2">
                        <span className="text-[#64748B]">Protocolo</span>
                        <code className="font-semibold text-[#1E6BFF]">
                          {ag.protocolo}
                        </code>
                      </p>
                      <p className="flex items-center justify-between gap-2">
                        <span className="text-[#64748B]">Senha provisória</span>
                        <span className="font-semibold text-[#0F172A]">
                          {ag.senhaAtendimento}
                        </span>
                      </p>
                      {ag.profissionalNomeExibicao && (
                        <p className="flex items-center justify-between gap-2">
                          <span className="text-[#64748B]">Profissional</span>
                          <span className="font-medium text-[#0F172A]">
                            {ag.profissionalNomeExibicao}
                          </span>
                        </p>
                      )}
                      {ag.motivoCancelamento && (
                        <p className="pt-1.5 border-t border-[#E2E8F0] text-red-700">
                          <strong>Motivo:</strong> {ag.motivoCancelamento}
                        </p>
                      )}
                    </div>
                  </NumberedCard>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Aba 4: meu perfil */}
        {aba === 'perfil' && (
          <section className="rounded-[28px] bg-white border border-[#E2E8F0] p-6 sm:p-8 shadow-soft space-y-6">
            {loadingPerfil || !perfilPaciente ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-1/3" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E2E8F0]">
                  <div>
                    <h2 className="font-display text-2xl font-normal text-[#0F172A]">
                      Meus dados cadastrais
                    </h2>
                    <p className="mt-1 text-xs text-[#64748B]">
                      CPF, Cartão SUS e data de nascimento não podem ser alterados pelo
                      portal para preservar seu histórico assistencial.
                    </p>
                  </div>
                  <StatusBadge tone="info">
                    CNS: {LABELS_SITUACAO_CNS[perfilPaciente.situacaoCns]}
                  </StatusBadge>
                </div>

                {/* Dados fixos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  <div className="rounded-2xl bg-[#F4F7FC] p-4">
                    <p className="text-[11px] text-[#64748B]">Nome civil</p>
                    <p className="mt-1 text-sm font-semibold text-[#0F172A]">
                      {perfilPaciente.nomeCompleto}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#F4F7FC] p-4">
                    <p className="text-[11px] text-[#64748B]">CPF (não alterável)</p>
                    <p className="mt-1 text-sm font-semibold text-[#0F172A]">
                      {perfilPaciente.cpfFormatado}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#F4F7FC] p-4">
                    <p className="text-[11px] text-[#64748B]">Cartão SUS (CNS)</p>
                    <p className="mt-1 text-sm font-semibold text-[#0F172A]">
                      {formatarCns(perfilPaciente.cns)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#F4F7FC] p-4">
                    <p className="text-[11px] text-[#64748B]">Data de nascimento</p>
                    <p className="mt-1 text-sm font-semibold text-[#0F172A]">
                      {formatarData(perfilPaciente.dataNascimento)}
                    </p>
                  </div>
                </div>

                {/* Campos editáveis */}
                <form onSubmit={handleSalvarPerfil} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="Nome social" htmlFor="perf-nome-social">
                      <TextInput
                        id="perf-nome-social"
                        value={nomeSocial}
                        onChange={(e) => setNomeSocial(e.target.value)}
                        placeholder="Opcional"
                      />
                    </FormField>

                    <FormField label="E-mail" htmlFor="perf-email">
                      <TextInput
                        id="perf-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </FormField>

                    <FormField label="Celular" htmlFor="perf-celular">
                      <TextInput
                        id="perf-celular"
                        value={celular}
                        onChange={(e) => setCelular(maskTelefone(e.target.value))}
                      />
                    </FormField>

                    <FormField label="Possui deficiência?" htmlFor="perf-pcd">
                      <SelectInput
                        id="perf-pcd"
                        value={possuiDeficiencia}
                        onChange={(e) =>
                          setPossuiDeficiencia(e.target.value as PossuiDeficiencia)
                        }
                      >
                        <option value="NAO">Não</option>
                        <option value="SIM">Sim</option>
                        <option value="PREFIRO_NAO_INFORMAR">
                          Prefiro não informar
                        </option>
                      </SelectInput>
                    </FormField>
                  </div>

                  <label className="inline-flex items-center gap-2 text-xs text-[#64748B] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={celularWhatsapp}
                      onChange={(e) => setCelularWhatsapp(e.target.checked)}
                      className="h-4 w-4 rounded border-[#E2E8F0] text-[#1E6BFF]"
                    />
                    Receber atualizações via WhatsApp neste celular
                  </label>

                  {possuiDeficiencia === 'SIM' && (
                    <div className="rounded-2xl bg-[#F4F7FC] p-4 space-y-2.5">
                      <p className="text-xs font-medium text-[#0F172A]">
                        Tipos de deficiência
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {TIPOS_DEFICIENCIA.map((t) => {
                          const selected = tiposDeficiencia.includes(t);
                          return (
                            <button
                              key={t}
                              type="button"
                              onClick={() =>
                                setTiposDeficiencia((prev) =>
                                  prev.includes(t)
                                    ? prev.filter((x) => x !== t)
                                    : [...prev, t]
                                )
                              }
                              className={`rounded-full px-3.5 py-1.5 text-xs font-medium border transition-colors ${
                                selected
                                  ? 'bg-[#1E6BFF] text-white border-[#1E6BFF]'
                                  : 'bg-white text-[#64748B] border-[#E2E8F0]'
                              }`}
                            >
                              {LABELS_TIPO_DEFICIENCIA[t]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <FormField
                    label="Preferências de acessibilidade"
                    htmlFor="perf-acess"
                  >
                    <TextAreaInput
                      id="perf-acess"
                      value={preferenciasAcessibilidade}
                      onChange={(e) =>
                        setPreferenciasAcessibilidade(e.target.value)
                      }
                    />
                  </FormField>

                  <div className="pt-4 border-t border-[#E2E8F0] grid grid-cols-1 sm:grid-cols-6 gap-4">
                    <FormField label="CEP" htmlFor="perf-cep" className="sm:col-span-2">
                      <TextInput
                        id="perf-cep"
                        value={cep}
                        onChange={(e) => setCep(maskCep(e.target.value))}
                      />
                    </FormField>
                    <FormField
                      label="Logradouro"
                      htmlFor="perf-log"
                      className="sm:col-span-4"
                    >
                      <TextInput
                        id="perf-log"
                        value={logradouro}
                        onChange={(e) => setLogradouro(e.target.value)}
                      />
                    </FormField>
                    <FormField label="Número" htmlFor="perf-num" className="sm:col-span-2">
                      <TextInput
                        id="perf-num"
                        value={numero}
                        onChange={(e) => setNumero(e.target.value)}
                      />
                    </FormField>
                    <FormField
                      label="Complemento"
                      htmlFor="perf-comp"
                      className="sm:col-span-4"
                    >
                      <TextInput
                        id="perf-comp"
                        value={complemento}
                        onChange={(e) => setComplemento(e.target.value)}
                      />
                    </FormField>
                    <FormField
                      label="Bairro"
                      htmlFor="perf-bairro"
                      className="sm:col-span-2"
                    >
                      <TextInput
                        id="perf-bairro"
                        value={bairro}
                        onChange={(e) => setBairro(e.target.value)}
                      />
                    </FormField>
                    <FormField
                      label="Município"
                      htmlFor="perf-mun"
                      className="sm:col-span-3"
                    >
                      <TextInput
                        id="perf-mun"
                        value={municipio}
                        onChange={(e) => setMunicipio(e.target.value)}
                      />
                    </FormField>
                    <FormField label="UF" htmlFor="perf-uf" className="sm:col-span-1">
                      <SelectInput
                        id="perf-uf"
                        value={estado}
                        onChange={(e) => setEstado(e.target.value)}
                      >
                        {UFS_BRASIL.map((uf) => (
                          <option key={uf} value={uf}>
                            {uf}
                          </option>
                        ))}
                      </SelectInput>
                    </FormField>
                  </div>

                  <div className="flex justify-end pt-2">
                    <PillButton type="submit" loading={salvandoPerfil}>
                      Salvar alterações
                    </PillButton>
                  </div>
                </form>
              </>
            )}
          </section>
        )}
      </main>

      {/* Navegação inferior (mobile) */}
      <nav
        aria-label="Navegação do cidadão"
        className="md:hidden fixed bottom-3 left-3 right-3 z-40 rounded-full bg-white/95 backdrop-blur-md border border-[#E2E8F0] p-1.5 shadow-soft grid grid-cols-4 gap-1"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const ativo = aba === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => trocarAba(item.id)}
              className={`flex flex-col items-center justify-center gap-0.5 rounded-full py-2 text-[11px] font-medium transition-colors ${
                ativo
                  ? 'bg-[#1E6BFF] text-white'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Modal Confirmar Agendamento */}
      <Modal
        open={Boolean(vagaConfirmando)}
        onClose={() => setVagaConfirmando(null)}
        title="Confirmar agendamento"
        subtitle="Revise os detalhes do horário antes de reservar sua vaga."
        footer={
          <>
            <PillButton
              variant="ghost"
              hideIconCircle
              onClick={() => setVagaConfirmando(null)}
            >
              Voltar
            </PillButton>
            <PillButton
              loading={marcando}
              onClick={() => void handleConfirmarAgendamento()}
            >
              Confirmar reserva
            </PillButton>
          </>
        }
      >
        {vagaConfirmando && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-[#EFF4FB] border border-[#DBEAFE] p-4 space-y-2">
              <p className="text-xs font-semibold text-[#1E6BFF]">
                {vagaConfirmando.servicoNome}
              </p>
              <p className="text-sm font-medium text-[#0F172A] flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[#1E6BFF]" />
                {vagaConfirmando.unidadeNome}
              </p>
              <p className="text-sm text-[#0F172A] flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#1E6BFF]" />
                {formatarDataHora(vagaConfirmando.dataHoraInicio)}
              </p>
              {vagaConfirmando.profissionalNome && (
                <p className="text-xs text-[#64748B]">
                  Profissional: {vagaConfirmando.profissionalNome}
                </p>
              )}
            </div>
            <p className="text-xs text-[#64748B] flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0 text-[#1E6BFF] mt-0.5" />
              No dia do atendimento, apresente o protocolo gerado ou seu CPF na
              recepção da unidade para realizar o check-in na fila.
            </p>
          </div>
        )}
      </Modal>

      {/* Modal Comprovante */}
      <Modal
        open={Boolean(comprovante)}
        onClose={() => {
          setComprovante(null);
          trocarAba('agendamentos');
        }}
        title="Agendamento confirmado"
        footer={
          <PillButton
            onClick={() => {
              setComprovante(null);
              trocarAba('agendamentos');
            }}
          >
            Ir para meus agendamentos
          </PillButton>
        }
      >
        {comprovante && (
          <div className="text-center space-y-4 py-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs text-[#64748B]">Protocolo de atendimento</p>
              <p className="mt-1 font-display text-2xl font-semibold text-[#1E6BFF]">
                {comprovante.protocolo}
              </p>
            </div>
            <div className="rounded-2xl bg-[#F4F7FC] p-4 text-xs text-left space-y-2">
              <p className="flex justify-between">
                <span className="text-[#64748B]">Data e horário:</span>
                <strong>{formatarDataHora(comprovante.dataHoraAtendimento)}</strong>
              </p>
              <p className="flex justify-between">
                <span className="text-[#64748B]">Senha provisória:</span>
                <strong>{comprovante.senhaAtendimento}</strong>
              </p>
              <p className="flex justify-between">
                <span className="text-[#64748B]">Situação:</span>
                <strong>{LABELS_STATUS_AGENDAMENTO[comprovante.status]}</strong>
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Cancelar Agendamento */}
      <Modal
        open={Boolean(agendamentoParaCancelar)}
        onClose={() => setAgendamentoParaCancelar(null)}
        title="Cancelar agendamento"
        subtitle="A vaga será liberada imediatamente para outros cidadãos."
      >
        {agendamentoParaCancelar && (
          <form onSubmit={handleCancelarAgendamento} className="space-y-4">
            <div className="rounded-2xl bg-red-50/70 border border-red-200 p-4 text-xs text-red-900 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <XCircle className="h-4 w-4 text-red-600" />
                {agendamentoParaCancelar.servicoNome}
              </p>
              <p className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {agendamentoParaCancelar.unidadeNome} ·{' '}
                {formatarDataHora(agendamentoParaCancelar.dataHoraAtendimento)}
              </p>
            </div>

            <FormField
              label="Motivo do cancelamento"
              htmlFor="motivo-cancel"
              required
              hint="Mínimo de 5 caracteres."
            >
              <TextAreaInput
                id="motivo-cancel"
                value={motivoCancelamento}
                onChange={(e) => setMotivoCancelamento(e.target.value)}
                placeholder="Ex.: conflito de horário, impossibilidade de comparecer"
              />
            </FormField>

            <div className="flex justify-end gap-3 pt-2">
              <PillButton
                variant="ghost"
                hideIconCircle
                onClick={() => setAgendamentoParaCancelar(null)}
              >
                Manter agendamento
              </PillButton>
              <PillButton type="submit" variant="danger" loading={cancelando}>
                Confirmar cancelamento
              </PillButton>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
