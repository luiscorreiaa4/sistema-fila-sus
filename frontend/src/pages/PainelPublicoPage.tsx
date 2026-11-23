import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Clock,
  Maximize2,
  Minimize2,
  Radio,
  ShieldCheck,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { painelPublicoApi, unidadesApi } from '../services/api';
import type { ChamadaPainelPublicoDTO, UnidadeSaudeDTO } from '../types/api';
import {
  LABELS_ESTADO_CHAMADA,
  formatarHora,
  tocarAlertaSonoroChamada,
} from '../utils/formatters';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { StatusBadge } from '../components/ui/StatusBadge';

export function PainelPublicoPage() {
  const { unidadeId } = useParams<{ unidadeId?: string }>();
  const navigate = useNavigate();

  const [unidades, setUnidades] = useState<UnidadeSaudeDTO[]>([]);
  const [selectedUnidadeId, setSelectedUnidadeId] = useState<string>(
    unidadeId ?? ''
  );
  const [chamadas, setChamadas] = useState<ChamadaPainelPublicoDTO[]>([]);
  const [loadingUnidades, setLoadingUnidades] = useState(true);
  const [loadingPainel, setLoadingPainel] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [somAtivo, setSomAtivo] = useState(true);
  const [telaCheia, setTelaCheia] = useState(false);
  const [agora, setAgora] = useState(() => new Date());
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);
  const [animarDestaque, setAnimarDestaque] = useState(false);

  const ultimaAssinaturaRef = useRef<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setAgora(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      setTelaCheia(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () =>
      document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  useEffect(() => {
    let ativo = true;
    const carregarUnidades = async () => {
      setLoadingUnidades(true);
      try {
        const res = await unidadesApi.listar({ status: 'ATIVA' });
        if (!ativo) return;
        setUnidades(res.unidades);
        if (unidadeId) {
          setSelectedUnidadeId(unidadeId);
        } else if (res.unidades.length > 0) {
          setSelectedUnidadeId(res.unidades[0].id);
        }
      } catch {
        if (ativo) {
          setErro('Não foi possível listar as unidades de saúde.');
        }
      } finally {
        if (ativo) setLoadingUnidades(false);
      }
    };
    void carregarUnidades();
    return () => {
      ativo = false;
    };
  }, [unidadeId]);

  const buscarPainel = useCallback(
    async (id: string, silencioso = false) => {
      if (!id) return;
      if (!silencioso) setLoadingPainel(true);
      try {
        const res = await painelPublicoApi.consultar(id, 15);
        setChamadas(res.chamadas);
        setUltimaAtualizacao(new Date());
        setErro(null);

        const topo = res.chamadas[0];
        if (topo) {
          const assinatura = `${topo.chamadaId}:${topo.tentativa}:${topo.horarioChamada}`;
          if (
            ultimaAssinaturaRef.current !== null &&
            ultimaAssinaturaRef.current !== assinatura
          ) {
            setAnimarDestaque(true);
            window.setTimeout(() => setAnimarDestaque(false), 1200);
            if (somAtivo) {
              tocarAlertaSonoroChamada();
            }
          }
          ultimaAssinaturaRef.current = assinatura;
        }
      } catch {
        if (!silencioso) {
          setErro('Falha ao atualizar o painel público desta unidade.');
        }
      } finally {
        if (!silencioso) setLoadingPainel(false);
      }
    },
    [somAtivo]
  );

  useEffect(() => {
    if (!selectedUnidadeId) return;
    ultimaAssinaturaRef.current = null;
    void buscarPainel(selectedUnidadeId, false);
    const interval = window.setInterval(() => {
      void buscarPainel(selectedUnidadeId, true);
    }, 4000);
    return () => window.clearInterval(interval);
  }, [selectedUnidadeId, buscarPainel]);

  const handleTrocarUnidade = (novoId: string) => {
    setSelectedUnidadeId(novoId);
    if (novoId) {
      navigate(`/painel/${novoId}`, { replace: true });
    }
  };

  const toggleTelaCheia = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // ignore browser restriction
    }
  };

  const unidadeAtual = useMemo(
    () => unidades.find((u) => u.id === selectedUnidadeId) ?? null,
    [unidades, selectedUnidadeId]
  );

  const chamadaAtual = chamadas[0] ?? null;
  const historicoChamadas = chamadas.slice(1, 9);
  const emAtendimento = chamadas.filter((c) => c.estado === 'EM_ATENDIMENTO');

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col">
      {/* Barra superior minimalista para TVs e Totens */}
      <header className="px-4 sm:px-6 lg:px-8 pt-4">
        <div className="mx-auto max-w-7xl rounded-full bg-white border border-[#E2E8F0] px-4 py-2.5 shadow-pill flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EFF4FB] text-[#1E6BFF] hover:bg-[#DBEAFE] transition-colors"
              title="Voltar ao portal"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-sm font-semibold text-[#0F172A]">
                  Painel Público de Chamadas
                </span>
                <StatusBadge tone="info" dot pulse>
                  Tempo Real · LGPD
                </StatusBadge>
              </div>
              {unidadeAtual && (
                <p className="text-[11px] text-[#64748B]">
                  {unidadeAtual.nome} ·{' '}
                  {unidadeAtual.cnes ? `CNES ${unidadeAtual.cnes}` : unidadeAtual.endereco.municipio}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Seletor de unidade */}
            <div className="inline-flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5">
              <Building2 className="h-3.5 w-3.5 text-[#1E6BFF]" />
              <select
                aria-label="Selecionar unidade de saúde"
                disabled={loadingUnidades}
                value={selectedUnidadeId}
                onChange={(e) => handleTrocarUnidade(e.target.value)}
                className="bg-transparent text-xs font-medium text-[#0F172A] focus:outline-none max-w-[210px]"
              >
                {unidades.length === 0 ? (
                  <option value="">Sem unidades ativas</option>
                ) : (
                  unidades.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Relógio */}
            <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-[#EFF4FB] px-3.5 py-1.5 text-xs font-semibold text-[#1E6BFF]">
              <Clock className="h-3.5 w-3.5" />
              {agora.toLocaleTimeString('pt-BR', {
                timeZone: 'America/Maceio',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </div>

            <button
              type="button"
              onClick={() => setSomAtivo((v) => !v)}
              title={somAtivo ? 'Silenciar alerta sonoro' : 'Ativar alerta sonoro'}
              className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
                somAtivo
                  ? 'bg-[#EFF4FB] border-[#DBEAFE] text-[#1E6BFF]'
                  : 'bg-white border-[#E2E8F0] text-[#64748B]'
              }`}
            >
              {somAtivo ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </button>

            <button
              type="button"
              onClick={() => void toggleTelaCheia()}
              title={telaCheia ? 'Sair da tela cheia' : 'Modo TV / Tela cheia'}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A]"
            >
              {telaCheia ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="mx-auto max-w-7xl w-full flex-1 px-4 sm:px-6 lg:px-8 py-6">
        {erro && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {erro}
          </div>
        )}

        {loadingUnidades || loadingPainel ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Skeleton className="lg:col-span-7 h-[460px] rounded-[32px]" />
            <div className="lg:col-span-5 space-y-4">
              <Skeleton className="h-[260px] rounded-[24px]" />
              <Skeleton className="h-[180px] rounded-[24px]" />
            </div>
          </div>
        ) : !selectedUnidadeId ? (
          <EmptyState
            icon={<Building2 className="h-6 w-6" />}
            title="Nenhuma unidade selecionada"
            description="Cadastre e ative uma unidade de saúde para visualizar o painel público."
            actionLabel="Voltar para o início"
            actionTo="/"
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Destaque Principal em Azul Cobalto */}
            <section
              className={`lg:col-span-7 rounded-[32px] bg-cobalt-gradient p-7 sm:p-10 text-white shadow-cobalt flex flex-col justify-between relative overflow-hidden min-h-[440px] ${
                animarDestaque ? 'animate-call-highlight' : ''
              }`}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-20 -right-20 h-72 w-72 rounded-full bg-white/15 blur-3xl"
              />

              <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
                <span className="glass-on-cobalt inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium">
                  <Radio className="h-3.5 w-3.5 text-emerald-300 animate-pulse" />
                  Chamada Atual
                </span>

                <span className="glass-on-cobalt inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Dados anonimizados · LGPD
                </span>
              </div>

              {chamadaAtual ? (
                <div className="relative z-10 my-8">
                  <p className="text-sm uppercase tracking-[0.2em] text-white/75 font-medium">
                    Senha de Atendimento
                  </p>
                  <div className="mt-3 flex flex-wrap items-baseline gap-4">
                    <span className="font-display text-6xl sm:text-8xl font-semibold tracking-tight leading-none">
                      {chamadaAtual.senhaAtendimento}
                    </span>
                    {chamadaAtual.tentativa > 1 && (
                      <span className="glass-on-cobalt rounded-full px-3.5 py-1 text-xs font-semibold">
                        Rechamada {chamadaAtual.tentativa}ª vez
                      </span>
                    )}
                  </div>

                  <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="glass-badge rounded-[24px] p-5 text-[#0F172A]">
                      <p className="text-xs font-medium text-[#64748B]">
                        Dirija-se ao local
                      </p>
                      <p className="mt-1 font-display text-2xl sm:text-3xl font-semibold text-[#1E6BFF]">
                        {chamadaAtual.guicheSala}
                      </p>
                    </div>

                    <div className="glass-on-cobalt rounded-[24px] p-5 text-white">
                      <p className="text-xs text-white/75">Horário e Situação</p>
                      <p className="mt-1 font-display text-2xl font-medium">
                        {formatarHora(chamadaAtual.horarioChamada)}
                      </p>
                      <p className="mt-0.5 text-xs text-white/85">
                        {LABELS_ESTADO_CHAMADA[chamadaAtual.estado]}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative z-10 my-auto py-12 text-center">
                  <p className="font-display text-3xl font-normal text-white">
                    Aguardando próximas chamadas
                  </p>
                  <p className="mt-2 text-sm text-white/80 max-w-md mx-auto">
                    Assim que um profissional ou atendente chamar a próxima senha
                    desta unidade, ela aparecerá em destaque aqui.
                  </p>
                </div>
              )}

              <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-white/15 text-xs text-white/75">
                <span>
                  {chamadaAtual?.unidadeNome ?? unidadeAtual?.nome ?? 'Unidade SUS'}
                </span>
                <span>
                  Atualização automática a cada 4s
                  {ultimaAtualizacao
                    ? ` · Última às ${formatarHora(ultimaAtualizacao)}`
                    : ''}
                </span>
              </div>
            </section>

            {/* Coluna Lateral: Últimas Chamadas + Em Atendimento */}
            <aside className="lg:col-span-5 flex flex-col gap-5">
              {/* Últimas Chamadas */}
              <div className="flex-1 rounded-[28px] bg-white border border-[#E2E8F0] p-6 shadow-soft flex flex-col">
                <div className="flex items-center justify-between gap-2 pb-4 border-b border-[#E2E8F0]">
                  <div>
                    <h2 className="font-display text-lg font-medium text-[#0F172A]">
                      Últimas Chamadas
                    </h2>
                    <p className="text-xs text-[#64748B]">
                      Histórico recente exibido nesta recepção
                    </p>
                  </div>
                  <span className="rounded-full bg-[#EFF4FB] px-3 py-1 text-xs font-semibold text-[#1E6BFF]">
                    {historicoChamadas.length}
                  </span>
                </div>

                {historicoChamadas.length === 0 ? (
                  <div className="my-auto py-10 text-center text-sm text-[#64748B]">
                    Nenhuma chamada anterior registrada hoje.
                  </div>
                ) : (
                  <ul className="mt-4 space-y-2.5">
                    {historicoChamadas.map((item) => (
                      <li
                        key={item.chamadaId}
                        className="flex items-center justify-between gap-3 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]/80 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-display text-lg font-semibold text-[#0F172A]">
                              {item.senhaAtendimento}
                            </span>
                            {item.tentativa > 1 && (
                              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                {item.tentativa}ª chamada
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#64748B] truncate">
                            {item.guicheSala}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-xs font-semibold text-[#0F172A]">
                            {formatarHora(item.horarioChamada)}
                          </p>
                          <StatusBadge
                            className="mt-1"
                            tone={
                              item.estado === 'EM_ATENDIMENTO'
                                ? 'info'
                                : item.estado === 'CONCLUIDO'
                                  ? 'success'
                                  : item.estado === 'NAO_ATENDIDO'
                                    ? 'danger'
                                    : 'warning'
                            }
                          >
                            {LABELS_ESTADO_CHAMADA[item.estado]}
                          </StatusBadge>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Em Atendimento + Nota LGPD */}
              <div className="rounded-[24px] bg-white border border-[#E2E8F0] p-5 shadow-soft space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-sm font-semibold text-[#0F172A]">
                    Senhas em Atendimento
                  </h3>
                  <span className="text-xs text-[#64748B]">
                    {emAtendimento.length} ativa(s)
                  </span>
                </div>

                {emAtendimento.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {emAtendimento.map((item) => (
                      <div
                        key={item.chamadaId}
                        className="rounded-full bg-[#EFF4FB] border border-[#DBEAFE] px-3.5 py-1.5 text-xs font-medium text-[#1E6BFF]"
                      >
                        <strong>{item.senhaAtendimento}</strong> · {item.guicheSala}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#64748B]">
                    Nenhuma senha sinalizada em atendimento no momento.
                  </p>
                )}

                <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between gap-3">
                  <p className="text-[11px] text-[#64748B]">
                    Quer ver sua posição exata na fila e quantas pessoas estão à
                    frente?
                  </p>
                  <Link
                    to="/paciente"
                    className="shrink-0 rounded-full bg-[#EFF4FB] px-3.5 py-1.5 text-xs font-semibold text-[#1E6BFF] hover:bg-[#DBEAFE] transition-colors"
                  >
                    Portal do Cidadão →
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
