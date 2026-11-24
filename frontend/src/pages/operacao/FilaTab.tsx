import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  CheckCircle2,
  Megaphone,
  Play,
  RefreshCw,
  Repeat,
  UserX,
  Users,
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { extrairMensagemErro, filaApi } from '../../services/api';
import type {
  EntradaFilaOperacionalDTO,
  EstrategiaFila,
  SituacaoFila,
} from '../../types/api';
import {
  LABELS_GRUPO_ATENDIMENTO,
  LABELS_SITUACAO_FILA,
  formatarHora,
} from '../../utils/formatters';
import { EmptyState } from '../../components/ui/EmptyState';
import { FormField, SelectInput, TextAreaInput, TextInput } from '../../components/ui/FormControls';
import { Modal } from '../../components/ui/Modal';
import { PillButton } from '../../components/ui/PillButton';
import { Skeleton } from '../../components/ui/Skeleton';
import { StatusBadge } from '../../components/ui/StatusBadge';

interface FilaTabProps {
  unidadeId: string;
}

const GUICHE_STORAGE_KEY = 'fila_sus_guiche_sala';

function badgeSituacaoFila(situacao: SituacaoFila) {
  switch (situacao) {
    case 'AGUARDANDO':
      return <StatusBadge tone="neutral">{LABELS_SITUACAO_FILA[situacao]}</StatusBadge>;
    case 'CHAMADO':
      return <StatusBadge tone="warning" dot pulse>{LABELS_SITUACAO_FILA[situacao]}</StatusBadge>;
    case 'EM_ATENDIMENTO':
      return <StatusBadge tone="info" dot pulse>{LABELS_SITUACAO_FILA[situacao]}</StatusBadge>;
    case 'CONCLUIDO':
      return <StatusBadge tone="success">{LABELS_SITUACAO_FILA[situacao]}</StatusBadge>;
    case 'NAO_ATENDIDO':
      return <StatusBadge tone="danger">{LABELS_SITUACAO_FILA[situacao]}</StatusBadge>;
    case 'CANCELADO':
      return <StatusBadge tone="danger">{LABELS_SITUACAO_FILA[situacao]}</StatusBadge>;
  }
}

export function FilaTab({ unidadeId }: FilaTabProps) {
  const toast = useToast();

  const [fila, setFila] = useState<EntradaFilaOperacionalDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [guicheSala, setGuicheSala] = useState(() => {
    try {
      return window.localStorage.getItem(GUICHE_STORAGE_KEY) || 'Consultório 01';
    } catch {
      return 'Consultório 01';
    }
  });
  const [estrategia, setEstrategia] = useState<EstrategiaFila>('RODIZIO_5_1');
  const [chamandoProximo, setChamandoProximo] = useState(false);
  const [acaoEmAndamentoId, setAcaoEmAndamentoId] = useState<string | null>(null);

  // Modal de confirmação para iniciar atendimento
  const [entradaParaIniciar, setEntradaParaIniciar] =
    useState<EntradaFilaOperacionalDTO | null>(null);

  // Modal de ausência
  const [entradaAusencia, setEntradaAusencia] =
    useState<EntradaFilaOperacionalDTO | null>(null);
  const [motivoAusencia, setMotivoAusencia] = useState('');
  const [permitirRecolocacao, setPermitirRecolocacao] = useState(true);
  const [registrandoAusencia, setRegistrandoAusencia] = useState(false);

  const carregarFila = useCallback(
    async (silencioso = false) => {
      if (!unidadeId) return;
      if (!silencioso) setLoading(true);
      try {
        const res = await filaApi.listarUnidade(unidadeId);
        setFila(res.fila);
      } catch (err) {
        if (!silencioso) {
          toast.error('Erro ao carregar fila da unidade', extrairMensagemErro(err));
        }
      } finally {
        if (!silencioso) setLoading(false);
      }
    },
    [unidadeId, toast]
  );

  useEffect(() => {
    void carregarFila(false);
    const interval = window.setInterval(() => {
      void carregarFila(true);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [carregarFila]);

  const atualizarGuiche = (valor: string) => {
    setGuicheSala(valor);
    try {
      window.localStorage.setItem(GUICHE_STORAGE_KEY, valor);
    } catch {
      // ignore
    }
  };

  const handleChamarProximo = async (e: FormEvent) => {
    e.preventDefault();
    const guicheLimpo = guicheSala.trim();
    if (guicheLimpo.length < 2) {
      toast.warning('Guichê ou sala obrigatório', 'Informe o local da chamada (mín. 2 caracteres).');
      return;
    }

    setChamandoProximo(true);
    try {
      const res = await filaApi.chamarProximo({
        unidadeId,
        guicheSala: guicheLimpo,
        estrategia,
      });

      if (res.chamada === null) {
        toast.info('Fila vazia', res.mensagem);
      } else {
        toast.success(
          `Senha ${res.entrada.senhaAtendimento} chamada.`,
          `Direcionada para ${res.chamada.guicheSala}`
        );
      }
      await carregarFila(true);
    } catch (err) {
      toast.error('Erro ao chamar próximo', extrairMensagemErro(err));
    } finally {
      setChamandoProximo(false);
    }
  };

  const executarAcaoEntrada = async (
    entradaId: string,
    acao: 'rechamar' | 'iniciar' | 'concluir'
  ) => {
    setAcaoEmAndamentoId(entradaId);
    try {
      if (acao === 'rechamar') {
        const res = await filaApi.rechamar(entradaId);
        toast.info(
          `Rechamada emitida (${res.chamada.tentativa}ª tentativa)`,
          `Senha ${res.entrada.senhaAtendimento}`
        );
      } else if (acao === 'iniciar') {
        const res = await filaApi.iniciar(entradaId);
        toast.success('Atendimento iniciado', `Senha ${res.entrada.senhaAtendimento}`);
      } else {
        const res = await filaApi.concluir(entradaId);
        toast.success(
          'Atendimento concluído',
          `Duração: ${res.chamada.duracaoMinutos ?? 0} min · Agendamento REALIZADO`
        );
      }
      await carregarFila(true);
    } catch (err) {
      toast.error('Falha na operação', extrairMensagemErro(err));
    } finally {
      setAcaoEmAndamentoId(null);
    }
  };

  const handleConfirmarAusencia = async (e: FormEvent) => {
    e.preventDefault();
    if (!entradaAusencia) return;
    setRegistrandoAusencia(true);
    try {
      const podeRecolocar =
        entradaAusencia.situacao === 'CHAMADO' &&
        entradaAusencia.recolocacoes === 0 &&
        permitirRecolocacao;

      const res = await filaApi.ausente(entradaAusencia.id, {
        motivoAusencia: motivoAusencia.trim() || undefined,
        permitirRecolocacao: podeRecolocar,
      });

      toast.info(
        res.entrada.situacao === 'AGUARDANDO'
          ? 'Paciente recolocado no fim da fila'
          : 'Ausência registrada (Não atendido)',
        `Senha ${res.entrada.senhaAtendimento}`
      );
      setEntradaAusencia(null);
      setMotivoAusencia('');
      await carregarFila(true);
    } catch (err) {
      toast.error('Erro ao registrar ausência', extrairMensagemErro(err));
    } finally {
      setRegistrandoAusencia(false);
    }
  };

  const emChamadaOuAtendimento = useMemo(
    () =>
      fila.filter(
        (e) => e.situacao === 'CHAMADO' || e.situacao === 'EM_ATENDIMENTO'
      ),
    [fila]
  );

  const aguardando = useMemo(
    () => fila.filter((e) => e.situacao === 'AGUARDANDO'),
    [fila]
  );

  const finalizados = useMemo(
    () =>
      fila.filter(
        (e) =>
          e.situacao === 'CONCLUIDO' ||
          e.situacao === 'NAO_ATENDIDO' ||
          e.situacao === 'CANCELADO'
      ),
    [fila]
  );

  return (
    <div className="space-y-6">
      {/* Barra de comando: chamar próximo */}
      <form
        onSubmit={handleChamarProximo}
        className="rounded-[24px] sm:rounded-[28px] bg-white border border-[#E2E8F0] p-5 sm:p-6 shadow-soft flex flex-col lg:flex-row lg:items-end justify-between gap-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 min-w-0">
          <FormField label="Meu guichê / sala de atendimento" htmlFor="op-guiche" required>
            <TextInput
              id="op-guiche"
              value={guicheSala}
              onChange={(e) => atualizarGuiche(e.target.value)}
              placeholder="Ex.: Guichê 02 ou Consultório 01"
            />
          </FormField>

          <FormField label="Estratégia de chamada" htmlFor="op-estrategia">
            <SelectInput
              id="op-estrategia"
              value={estrategia}
              onChange={(e) => setEstrategia(e.target.value as EstrategiaFila)}
            >
              <option value="RODIZIO_5_1">Rodízio legal (5 prioritários : 1 comum)</option>
              <option value="ORDEM_CHEGADA">Ordem de chegada (prioritário primeiro)</option>
            </SelectInput>
          </FormField>
        </div>

        <div className="flex items-center gap-2.5 w-full lg:w-auto shrink-0">
          <button
            type="button"
            onClick={() => void carregarFila(false)}
            title="Atualizar fila agora"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] hover:text-[#1E6BFF] hover:border-[#1E6BFF]/40 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          <PillButton
            type="submit"
            size="lg"
            loading={chamandoProximo}
            icon={<Megaphone className="h-4 w-4" />}
            className="flex-1 lg:flex-initial"
          >
            Chamar próximo ({aguardando.length})
          </PillButton>
        </div>
      </form>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-44 rounded-[24px]" />
          <Skeleton className="h-44 rounded-[24px]" />
        </div>
      ) : (
        <>
          {/* Pacientes chamados ou em atendimento */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-medium text-[#0F172A]">
                Chamados e em atendimento ({emChamadaOuAtendimento.length})
              </h2>
            </div>

            {emChamadaOuAtendimento.length === 0 ? (
              <EmptyState
                icon={<Megaphone className="h-6 w-6" />}
                title="Nenhum paciente em chamada ou atendimento"
                description='Clique em "Chamar próximo" para convocar a próxima senha da fila.'
                className="py-6"
              />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {emChamadaOuAtendimento.map((item) => {
                  const ocupado = acaoEmAndamentoId === item.id;
                  return (
                    <article
                      key={item.id}
                      className="min-w-0 rounded-[24px] bg-white border border-[#1E6BFF]/30 p-5 shadow-soft flex flex-col justify-between gap-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-display text-3xl font-semibold text-[#1E6BFF]">
                              {item.senhaAtendimento}
                            </span>
                            {badgeSituacaoFila(item.situacao)}
                            <StatusBadge
                              tone={
                                item.grupoAtendimento === 'PRIORITARIO'
                                  ? 'warning'
                                  : 'neutral'
                              }
                            >
                              {LABELS_GRUPO_ATENDIMENTO[item.grupoAtendimento]}
                            </StatusBadge>
                          </div>

                          <h3 className="mt-2 font-display text-lg font-medium text-[#0F172A] break-words">
                            {item.nomeExibicao}
                          </h3>
                          <p className="text-xs text-[#64748B] break-words">
                            {item.servicoNome} · Protocolo{' '}
                            <code className="text-[#0F172A]">{item.protocolo}</code>
                          </p>
                        </div>

                        {item.ultimaChamada && (
                          <div className="text-left sm:text-right rounded-2xl bg-[#EFF4FB] px-3 py-2 shrink-0">
                            <p className="text-xs font-semibold text-[#1E6BFF]">
                              {item.ultimaChamada.guicheSala}
                            </p>
                            <p className="text-[11px] text-[#64748B]">
                              {item.ultimaChamada.tentativa}ª chamada ·{' '}
                              {formatarHora(item.ultimaChamada.dataHoraChamada)}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[#E2E8F0]">
                        {item.situacao === 'CHAMADO' && (
                          <>
                            <PillButton
                              size="sm"
                              variant="secondary"
                              hideIconCircle
                              disabled={ocupado}
                              onClick={() => void executarAcaoEntrada(item.id, 'rechamar')}
                            >
                              <Repeat className="h-3.5 w-3.5" />
                              Rechamar
                            </PillButton>

                            <PillButton
                              size="sm"
                              variant="primary"
                              hideIconCircle
                              disabled={ocupado}
                              onClick={() => setEntradaParaIniciar(item)}
                            >
                              <Play className="h-3.5 w-3.5" />
                              Iniciar atendimento
                            </PillButton>

                            <PillButton
                              size="sm"
                              variant="danger"
                              hideIconCircle
                              disabled={ocupado}
                              onClick={() => {
                                setEntradaAusencia(item);
                                setMotivoAusencia('');
                                setPermitirRecolocacao(item.recolocacoes === 0);
                              }}
                            >
                              <UserX className="h-3.5 w-3.5" />
                              Marcar ausente
                            </PillButton>
                          </>
                        )}

                        {item.situacao === 'EM_ATENDIMENTO' && (
                          <PillButton
                            size="sm"
                            variant="primary"
                            hideIconCircle
                            disabled={ocupado}
                            onClick={() => void executarAcaoEntrada(item.id, 'concluir')}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Concluir atendimento
                          </PillButton>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* Aguardando na fila */}
          <section className="rounded-[24px] sm:rounded-[28px] bg-white border border-[#E2E8F0] p-5 sm:p-6 shadow-soft space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-medium text-[#0F172A]">
                  Aguardando na fila ({aguardando.length})
                </h2>
                <p className="text-xs text-[#64748B]">
                  Pacientes com check-in confirmado hoje nesta unidade
                </p>
              </div>
            </div>

            {aguardando.length === 0 ? (
              <div className="py-8 text-center text-sm text-[#64748B] flex flex-col items-center gap-2">
                <Users className="h-6 w-6 text-[#1E6BFF]" />
                Nenhum paciente aguardando check-in ou chamada no momento.
              </div>
            ) : (
              <>
                <div className="md:hidden space-y-3">
                  {aguardando.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display text-xl font-semibold text-[#1E6BFF]">
                          {item.senhaAtendimento}
                        </span>
                        <span className="text-xs font-semibold text-[#0F172A]">
                          Ordem #{item.ordemEntrada} · {formatarHora(item.dataHoraChegada)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#0F172A] break-words">
                          {item.nomeExibicao}
                        </p>
                        <p className="text-[11px] text-[#64748B]">
                          {item.servicoNome} · {item.protocolo}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <StatusBadge
                          tone={
                            item.grupoAtendimento === 'PRIORITARIO'
                              ? 'warning'
                              : 'neutral'
                          }
                        >
                          {LABELS_GRUPO_ATENDIMENTO[item.grupoAtendimento]}
                        </StatusBadge>
                        {item.recolocacoes > 0 && (
                          <StatusBadge tone="info">Recolocado</StatusBadge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#E2E8F0] text-[11px] uppercase tracking-wider text-[#64748B]">
                        <th className="py-2.5 pr-4">Senha</th>
                        <th className="py-2.5 pr-4">Paciente</th>
                        <th className="py-2.5 pr-4">Serviço</th>
                        <th className="py-2.5 pr-4">Grupo e critério</th>
                        <th className="py-2.5 pr-4">Chegada</th>
                        <th className="py-2.5 text-right">Ordem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]/70 text-sm">
                      {aguardando.map((item) => (
                        <tr key={item.id} className="hover:bg-[#F4F7FC]/70">
                          <td className="py-3 pr-4 font-display font-semibold text-[#1E6BFF]">
                            {item.senhaAtendimento}
                          </td>
                          <td className="py-3 pr-4">
                            <p className="font-medium text-[#0F172A]">
                              {item.nomeExibicao}
                            </p>
                            <p className="text-[11px] text-[#64748B]">
                              {item.protocolo}
                            </p>
                          </td>
                          <td className="py-3 pr-4 text-xs text-[#64748B]">
                            {item.servicoNome}
                          </td>
                          <td className="py-3 pr-4">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <StatusBadge
                                tone={
                                  item.grupoAtendimento === 'PRIORITARIO'
                                    ? 'warning'
                                    : 'neutral'
                                }
                              >
                                {LABELS_GRUPO_ATENDIMENTO[item.grupoAtendimento]}
                              </StatusBadge>
                              {item.recolocacoes > 0 && (
                                <StatusBadge tone="info">Recolocado</StatusBadge>
                              )}
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-xs text-[#64748B]">
                            {formatarHora(item.dataHoraChegada)}
                          </td>
                          <td className="py-3 text-right text-xs font-semibold text-[#0F172A]">
                            #{item.ordemEntrada}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>

          {/* Finalizados de hoje */}
          {finalizados.length > 0 && (
            <section className="rounded-[24px] bg-white border border-[#E2E8F0] p-6 space-y-3">
              <h3 className="font-display text-sm font-semibold text-[#0F172A]">
                Histórico de hoje ({finalizados.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {finalizados.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] p-3.5 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#0F172A] truncate">
                        {item.senhaAtendimento} · {item.nomeExibicao}
                      </p>
                      <p className="text-[11px] text-[#64748B] truncate">
                        {item.servicoNome}
                        {item.ultimaChamada?.duracaoMinutos !== null &&
                        item.ultimaChamada?.duracaoMinutos !== undefined
                          ? ` · ${item.ultimaChamada.duracaoMinutos} min`
                          : ''}
                      </p>
                    </div>
                    {badgeSituacaoFila(item.situacao)}
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Modal de confirmação para iniciar atendimento */}
      <Modal
        open={Boolean(entradaParaIniciar)}
        onClose={() => setEntradaParaIniciar(null)}
        title="Confirmar início do atendimento"
        subtitle={
          entradaParaIniciar
            ? `Senha ${entradaParaIniciar.senhaAtendimento} · ${entradaParaIniciar.nomeExibicao}`
            : undefined
        }
        size="sm"
      >
        {entradaParaIniciar && (
          <div className="space-y-5">
            <div className="rounded-2xl bg-[#F4F7FC] border border-[#E2E8F0] p-4 space-y-1.5 text-xs text-[#64748B]">
              <p>
                <strong className="text-[#0F172A]">Paciente:</strong>{' '}
                {entradaParaIniciar.nomeExibicao}
              </p>
              <p>
                <strong className="text-[#0F172A]">Serviço:</strong>{' '}
                {entradaParaIniciar.servicoNome}
              </p>
              {entradaParaIniciar.ultimaChamada?.guicheSala && (
                <p>
                  <strong className="text-[#0F172A]">Local da chamada:</strong>{' '}
                  {entradaParaIniciar.ultimaChamada.guicheSala}
                </p>
              )}
            </div>

            <p className="text-xs text-[#64748B] leading-relaxed">
              Ao confirmar, o atendimento será iniciado e a senha passará para o
              status <strong>Em atendimento</strong>.
            </p>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3">
              <PillButton
                variant="ghost"
                hideIconCircle
                onClick={() => setEntradaParaIniciar(null)}
                disabled={acaoEmAndamentoId === entradaParaIniciar.id}
                className="w-full sm:w-auto"
              >
                Cancelar
              </PillButton>
              <PillButton
                variant="primary"
                loading={acaoEmAndamentoId === entradaParaIniciar.id}
                onClick={async () => {
                  const id = entradaParaIniciar.id;
                  await executarAcaoEntrada(id, 'iniciar');
                  setEntradaParaIniciar(null);
                }}
                className="w-full sm:w-auto"
              >
                Confirmar início
              </PillButton>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de ausência */}
      <Modal
        open={Boolean(entradaAusencia)}
        onClose={() => setEntradaAusencia(null)}
        title="Registrar ausência na chamada"
        subtitle={
          entradaAusencia
            ? `Senha ${entradaAusencia.senhaAtendimento} · ${entradaAusencia.nomeExibicao}`
            : undefined
        }
      >
        {entradaAusencia && (
          <form onSubmit={handleConfirmarAusencia} className="space-y-4">
            {entradaAusencia.situacao === 'CHAMADO' &&
            entradaAusencia.recolocacoes === 0 ? (
              <label className="flex items-start gap-3 rounded-2xl bg-[#EFF4FB] border border-[#DBEAFE] p-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={permitirRecolocacao}
                  onChange={(e) => setPermitirRecolocacao(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-[#CBD5E1] text-[#1E6BFF]"
                />
                <span className="text-xs text-[#0F172A] leading-relaxed">
                  <strong>Permitir 1 recolocação no fim do grupo:</strong> o
                  paciente volta para <code>AGUARDANDO</code> ao final do seu grupo
                  de prioridade em vez de ser encerrado como{' '}
                  <code>NAO_ATENDIDO</code>.
                </span>
              </label>
            ) : (
              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3.5 text-xs text-amber-800">
                Esta entrada não é elegível a nova recolocação e será encerrada
                como <strong>Não atendido</strong>.
              </div>
            )}

            <FormField label="Motivo / observação (opcional)" htmlFor="motivo-aus">
              <TextAreaInput
                id="motivo-aus"
                value={motivoAusencia}
                onChange={(e) => setMotivoAusencia(e.target.value)}
                placeholder="Ex.: Não respondeu após 3 chamadas no painel..."
              />
            </FormField>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 pt-2">
              <PillButton
                variant="ghost"
                hideIconCircle
                onClick={() => setEntradaAusencia(null)}
                className="w-full sm:w-auto"
              >
                Voltar
              </PillButton>
              <PillButton
                type="submit"
                variant="danger"
                loading={registrandoAusencia}
                className="w-full sm:w-auto"
              >
                Confirmar ausência
              </PillButton>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
