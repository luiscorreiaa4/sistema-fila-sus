import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  CalendarCheck2,
  Clock,
  Filter,
  Loader2,
  MapPin,
  Search,
  Stethoscope,
  Sun,
  Sunset,
  Moon,
  X,
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import {
  agendasApi,
  extrairMensagemErro,
  servicosApi,
  unidadesApi,
} from '../../services/api';
import type {
  CatalogoProfissionalPublicoDTO,
  CategoriaServico,
  ServicoDTO,
  TurnoAtendimento,
  UnidadeSaudeDTO,
  VagaDisponivelDTO,
} from '../../types/api';
import {
  LABELS_CATEGORIA_SERVICO,
  extrairDataIsoMaceio,
  formatarDataCurta,
  formatarHora,
  hojeIsoMaceio,
  somarDiasIso,
} from '../../utils/formatters';
import { EmptyState } from '../ui/EmptyState';
import { FormField, SelectInput, TextInput } from '../ui/FormControls';
import { CardSkeleton, Skeleton } from '../ui/Skeleton';
import { StatusBadge } from '../ui/StatusBadge';

export interface BuscaVagasFiltrosIniciais {
  unidadeId?: string;
  servicoId?: string;
  especialidade?: string;
  profissionalId?: string;
}

interface BuscaVagasPanelProps {
  unidadeFixaId?: string;
  filtrosIniciais?: BuscaVagasFiltrosIniciais;
  onSelecionarVaga: (vaga: VagaDisponivelDTO) => void;
  vagaEmProcessamentoId?: string | null;
  compact?: boolean;
}

interface GrupoMedicoServico {
  chave: string;
  profissionalId: string | null;
  profissionalNome: string;
  profissionalRegistro: string | null;
  servicoId: string;
  servicoNome: string;
  especialidade: string;
  categoria: CategoriaServico;
  orientacoesPreparo: string | null;
  unidadeId: string;
  unidadeNome: string;
  unidadeBairro: string;
  unidadeMunicipio: string;
  dataIso: string;
  vagas: VagaDisponivelDTO[];
}

function classificarTurnoPorHora(dataIsoHora: string): TurnoAtendimento {
  const hh = Number(formatarHora(dataIsoHora).slice(0, 2));
  if (Number.isNaN(hh) || hh < 12) return 'MANHA';
  if (hh < 18) return 'TARDE';
  return 'NOITE';
}

export function BuscaVagasPanel({
  unidadeFixaId,
  filtrosIniciais,
  onSelecionarVaga,
  vagaEmProcessamentoId = null,
  compact = false,
}: BuscaVagasPanelProps) {
  const toast = useToast();

  // Catálogos auxiliares
  const [unidades, setUnidades] = useState<UnidadeSaudeDTO[]>([]);
  const [servicos, setServicos] = useState<ServicoDTO[]>([]);
  const [especialidades, setEspecialidades] = useState<string[]>([]);
  const [profissionais, setProfissionais] = useState<CatalogoProfissionalPublicoDTO[]>([]);
  const [loadingCatalogo, setLoadingCatalogo] = useState(true);

  // Filtros de busca
  const [termo, setTermo] = useState('');
  const [termoDebounced, setTermoDebounced] = useState('');
  const [especialidade, setEspecialidade] = useState(
    filtrosIniciais?.especialidade ?? ''
  );
  const [profissionalId, setProfissionalId] = useState(
    filtrosIniciais?.profissionalId ?? ''
  );
  const [servicoId, setServicoId] = useState(filtrosIniciais?.servicoId ?? '');
  const [unidadeId, setUnidadeId] = useState(
    unidadeFixaId ?? filtrosIniciais?.unidadeId ?? ''
  );
  const [dataFiltro, setDataFiltro] = useState('');
  const [turno, setTurno] = useState<TurnoAtendimento | ''>('');

  // Resultados
  const [vagas, setVagas] = useState<VagaDisponivelDTO[]>([]);
  const [loadingVagas, setLoadingVagas] = useState(true);
  const [dataAtivaNaFaixa, setDataAtivaNaFaixa] = useState<string>('');
  const [mostrarTodasDatas, setMostrarTodasDatas] = useState(false);

  // Sincroniza filtros iniciais se alterados externamente (ex.: link do Dashboard)
  useEffect(() => {
    if (unidadeFixaId) {
      setUnidadeId(unidadeFixaId);
    } else if (filtrosIniciais?.unidadeId !== undefined) {
      setUnidadeId(filtrosIniciais.unidadeId);
    }
    if (filtrosIniciais?.servicoId !== undefined) {
      setServicoId(filtrosIniciais.servicoId);
    }
    if (filtrosIniciais?.especialidade !== undefined) {
      setEspecialidade(filtrosIniciais.especialidade);
    }
    if (filtrosIniciais?.profissionalId !== undefined) {
      setProfissionalId(filtrosIniciais.profissionalId);
    }
  }, [
    unidadeFixaId,
    filtrosIniciais?.unidadeId,
    filtrosIniciais?.servicoId,
    filtrosIniciais?.especialidade,
    filtrosIniciais?.profissionalId,
  ]);

  // Debounce da busca textual
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setTermoDebounced(termo.trim());
    }, 260);
    return () => window.clearTimeout(timer);
  }, [termo]);

  // Carregar catálogos
  useEffect(() => {
    let ativo = true;
    const carregarCatalogos = async () => {
      setLoadingCatalogo(true);
      try {
        const [uRes, sRes, catRes] = await Promise.all([
          unidadesApi.listar({ status: 'ATIVA' }),
          servicosApi.listar(),
          agendasApi.catalogoBusca(),
        ]);
        if (!ativo) return;
        setUnidades(uRes.unidades);
        setServicos(sRes.servicos);
        setEspecialidades(catRes.especialidades);
        setProfissionais(catRes.profissionais);
      } catch (err) {
        if (ativo) {
          toast.error('Erro ao carregar opções de busca', extrairMensagemErro(err));
        }
      } finally {
        if (ativo) setLoadingCatalogo(false);
      }
    };
    void carregarCatalogos();
    return () => {
      ativo = false;
    };
  }, [toast]);

  // Médicos filtrados pelas escolhas atuais (especialidade/unidade)
  const profissionaisFiltrados = useMemo(() => {
    const unidadeAlvo = unidadeFixaId || unidadeId;
    return profissionais.filter((p) => {
      if (unidadeAlvo && !p.unidadesVinculadas.includes(unidadeAlvo)) {
        return false;
      }
      if (
        especialidade &&
        !p.especialidades.some(
          (e) => e.toLowerCase() === especialidade.toLowerCase()
        )
      ) {
        return false;
      }
      return true;
    });
  }, [profissionais, unidadeFixaId, unidadeId, especialidade]);

  // Serviços filtrados pela especialidade
  const servicosFiltrados = useMemo(() => {
    if (!especialidade) return servicos;
    return servicos.filter(
      (s) => s.especialidade.toLowerCase() === especialidade.toLowerCase()
    );
  }, [servicos, especialidade]);

  const buscarVagas = useCallback(async () => {
    setLoadingVagas(true);
    try {
      const res = await agendasApi.listarDisponiveis({
        unidadeId: (unidadeFixaId || unidadeId) || undefined,
        servicoId: servicoId || undefined,
        especialidade: especialidade || undefined,
        profissionalId: profissionalId || undefined,
        termo: termoDebounced || undefined,
        data: dataFiltro || undefined,
        turno: turno || undefined,
      });
      setVagas(res.vagas);
    } catch (err) {
      toast.error('Erro ao buscar horários disponíveis', extrairMensagemErro(err));
    } finally {
      setLoadingVagas(false);
    }
  }, [
    unidadeFixaId,
    unidadeId,
    servicoId,
    especialidade,
    profissionalId,
    termoDebounced,
    dataFiltro,
    turno,
    toast,
  ]);

  useEffect(() => {
    void buscarVagas();
  }, [buscarVagas]);

  // Agrupamento por data (America/Maceio)
  const diasComVagas = useMemo(() => {
    const mapa = new Map<
      string,
      { dataIso: string; label: string; totalVagas: number; vagas: VagaDisponivelDTO[] }
    >();

    for (const vaga of vagas) {
      const dataIso = extrairDataIsoMaceio(vaga.dataHoraInicio);
      if (!dataIso) continue;
      const existente = mapa.get(dataIso);
      if (existente) {
        existente.totalVagas += vaga.vagasDisponiveis;
        existente.vagas.push(vaga);
      } else {
        mapa.set(dataIso, {
          dataIso,
          label: formatarDataCurta(vaga.dataHoraInicio),
          totalVagas: vaga.vagasDisponiveis,
          vagas: [vaga],
        });
      }
    }

    return Array.from(mapa.values()).sort((a, b) =>
      a.dataIso.localeCompare(b.dataIso)
    );
  }, [vagas]);

  // Mantém selecionada uma data válida na faixa
  useEffect(() => {
    if (dataFiltro) {
      setDataAtivaNaFaixa(dataFiltro);
      setMostrarTodasDatas(false);
      return;
    }
    if (diasComVagas.length === 0) {
      setDataAtivaNaFaixa('');
      return;
    }
    if (!diasComVagas.some((d) => d.dataIso === dataAtivaNaFaixa)) {
      setDataAtivaNaFaixa(diasComVagas[0].dataIso);
    }
  }, [diasComVagas, dataAtivaNaFaixa, dataFiltro]);

  const diasVisiveis = useMemo(() => {
    if (mostrarTodasDatas) return diasComVagas;
    if (!dataAtivaNaFaixa) return diasComVagas.slice(0, 1);
    return diasComVagas.filter((d) => d.dataIso === dataAtivaNaFaixa);
  }, [diasComVagas, mostrarTodasDatas, dataAtivaNaFaixa]);

  // Agrupa os horários de cada dia por Médico + Serviço + Unidade
  const gruposPorDia = useMemo(() => {
    return diasVisiveis.map((dia) => {
      const gruposMap = new Map<string, GrupoMedicoServico>();

      for (const vaga of dia.vagas) {
        const chave = `${dia.dataIso}::${vaga.profissionalId ?? 'equipe'}::${vaga.servicoId}::${vaga.unidadeId}`;
        const atual = gruposMap.get(chave);
        if (atual) {
          atual.vagas.push(vaga);
        } else {
          gruposMap.set(chave, {
            chave,
            profissionalId: vaga.profissionalId,
            profissionalNome: vaga.profissionalNome ?? 'Equipe de Saúde da Unidade',
            profissionalRegistro: vaga.profissionalRegistro,
            servicoId: vaga.servicoId,
            servicoNome: vaga.servicoNome,
            especialidade: vaga.especialidade,
            categoria: vaga.categoria,
            orientacoesPreparo: vaga.orientacoesPreparo,
            unidadeId: vaga.unidadeId,
            unidadeNome: vaga.unidadeNome,
            unidadeBairro: vaga.unidadeBairro,
            unidadeMunicipio: vaga.unidadeMunicipio,
            dataIso: dia.dataIso,
            vagas: [vaga],
          });
        }
      }

      return {
        ...dia,
        grupos: Array.from(gruposMap.values()),
      };
    });
  }, [diasVisiveis]);

  const hojeIso = hojeIsoMaceio();
  const amanhaIso = somarDiasIso(hojeIso, 1);

  const possuiFiltrosAtivos = Boolean(
    termo ||
      especialidade ||
      profissionalId ||
      servicoId ||
      (!unidadeFixaId && unidadeId) ||
      dataFiltro ||
      turno
  );

  const limparFiltros = () => {
    setTermo('');
    setTermoDebounced('');
    setEspecialidade('');
    setProfissionalId('');
    setServicoId('');
    if (!unidadeFixaId) setUnidadeId('');
    setDataFiltro('');
    setTurno('');
    setMostrarTodasDatas(false);
  };

  return (
    <div className="space-y-5">
      {/* Barra de busca principal + filtros */}
      <div
        className={`rounded-[24px] border border-[#E2E8F0] bg-[#F8FAFC]/80 ${
          compact ? 'p-4 space-y-3.5' : 'p-5 sm:p-6 space-y-4'
        }`}
      >
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B]" />
            <input
              type="text"
              aria-label="Buscar por especialidade, exame ou nome do médico"
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              placeholder="Buscar por especialidade, procedimento ou nome do médico..."
              className="w-full rounded-full border border-[#E2E8F0] bg-white pl-11 pr-10 py-2.5 text-sm text-[#0F172A] placeholder:text-[#64748B]/75 focus:border-[#1E6BFF] focus:outline-none focus:ring-2 focus:ring-[#1E6BFF]/15"
            />
            {termo && (
              <button
                type="button"
                onClick={() => setTermo('')}
                aria-label="Limpar busca"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#64748B] hover:bg-[#EFF4FB] hover:text-[#0F172A]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {possuiFiltrosAtivos && (
            <button
              type="button"
              onClick={limparFiltros}
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#DBEAFE] bg-white px-4 py-2 text-xs font-semibold text-[#1E6BFF] hover:bg-[#EFF4FB] transition-colors shrink-0"
            >
              <Filter className="h-3.5 w-3.5" />
              Limpar filtros
            </button>
          )}
        </div>

        {/* Pílulas rápidas de especialidade */}
        {especialidades.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] mr-1">
              Especialidades:
            </span>
            <button
              type="button"
              onClick={() => {
                setEspecialidade('');
                setServicoId('');
              }}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                especialidade === ''
                  ? 'bg-[#1E6BFF] text-white border-[#1E6BFF]'
                  : 'bg-white text-[#64748B] border-[#E2E8F0] hover:border-[#1E6BFF]/40 hover:text-[#0F172A]'
              }`}
            >
              Todas
            </button>
            {especialidades.map((esp) => {
              const ativa =
                especialidade.toLowerCase() === esp.toLowerCase();
              return (
                <button
                  key={esp}
                  type="button"
                  onClick={() => {
                    setEspecialidade(ativa ? '' : esp);
                    setServicoId('');
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                    ativa
                      ? 'bg-[#1E6BFF] text-white border-[#1E6BFF]'
                      : 'bg-white text-[#64748B] border-[#E2E8F0] hover:border-[#1E6BFF]/40 hover:text-[#0F172A]'
                  }`}
                >
                  {esp}
                </button>
              );
            })}
          </div>
        )}

        {/* Grade de selects combinados */}
        {loadingCatalogo ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Skeleton className="h-11 rounded-2xl" />
            <Skeleton className="h-11 rounded-2xl" />
            <Skeleton className="h-11 rounded-2xl" />
            <Skeleton className="h-11 rounded-2xl" />
          </div>
        ) : (
          <div
            className={`grid grid-cols-1 sm:grid-cols-2 ${
              unidadeFixaId ? 'lg:grid-cols-4' : 'lg:grid-cols-5'
            } gap-3`}
          >
            <FormField label="Médico / Profissional" htmlFor="busca-medico">
              <SelectInput
                id="busca-medico"
                value={profissionalId}
                onChange={(e) => setProfissionalId(e.target.value)}
              >
                <option value="">Qualquer profissional</option>
                {profissionaisFiltrados.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nomeExibicao}
                    {p.registroConselho ? ` (${p.registroConselho})` : ''}
                  </option>
                ))}
              </SelectInput>
            </FormField>

            <FormField label="Serviço / Consulta" htmlFor="busca-servico">
              <SelectInput
                id="busca-servico"
                value={servicoId}
                onChange={(e) => setServicoId(e.target.value)}
              >
                <option value="">Todos os serviços</option>
                {servicosFiltrados.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
              </SelectInput>
            </FormField>

            {!unidadeFixaId && (
              <FormField label="Unidade de saúde" htmlFor="busca-unidade">
                <SelectInput
                  id="busca-unidade"
                  value={unidadeId}
                  onChange={(e) => setUnidadeId(e.target.value)}
                >
                  <option value="">Todas as unidades</option>
                  {unidades.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome}
                    </option>
                  ))}
                </SelectInput>
              </FormField>
            )}

            <FormField label="Data desejada" htmlFor="busca-data">
              <div className="space-y-1.5">
                <TextInput
                  id="busca-data"
                  type="date"
                  min={hojeIso}
                  value={dataFiltro}
                  onChange={(e) => setDataFiltro(e.target.value)}
                />
                <div className="flex flex-wrap gap-1">
                  {[
                    { label: 'Todas', valor: '' },
                    { label: 'Hoje', valor: hojeIso },
                    { label: 'Amanhã', valor: amanhaIso },
                  ].map((atalho) => (
                    <button
                      key={atalho.label}
                      type="button"
                      onClick={() => setDataFiltro(atalho.valor)}
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                        dataFiltro === atalho.valor
                          ? 'bg-[#1E6BFF] text-white'
                          : 'bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A]'
                      }`}
                    >
                      {atalho.label}
                    </button>
                  ))}
                </div>
              </div>
            </FormField>

            <FormField label="Turno" htmlFor="busca-turno">
              <SelectInput
                id="busca-turno"
                value={turno}
                onChange={(e) => setTurno(e.target.value as TurnoAtendimento | '')}
              >
                <option value="">Todos os turnos</option>
                <option value="MANHA">Manhã (até 12h)</option>
                <option value="TARDE">Tarde (12h às 18h)</option>
                <option value="NOITE">Noite (após 18h)</option>
              </SelectInput>
            </FormField>
          </div>
        )}
      </div>

      {/* Faixa de datas com vagas disponíveis */}
      {!loadingVagas && diasComVagas.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              <Calendar className="h-3.5 w-3.5 text-[#1E6BFF]" />
              {diasComVagas.length}{' '}
              {diasComVagas.length === 1
                ? 'data com vagas encontradas'
                : 'datas com vagas encontradas'}{' '}
              ({vagas.length} horários)
            </p>

            {diasComVagas.length > 1 && !dataFiltro && (
              <button
                type="button"
                onClick={() => setMostrarTodasDatas((v) => !v)}
                className="text-xs font-semibold text-[#1E6BFF] hover:underline"
              >
                {mostrarTodasDatas
                  ? 'Focar em 1 dia por vez'
                  : `Ver todas as ${diasComVagas.length} datas juntas`}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {diasComVagas.map((dia) => {
              const ativo = !mostrarTodasDatas && dataAtivaNaFaixa === dia.dataIso;
              return (
                <button
                  key={dia.dataIso}
                  type="button"
                  onClick={() => {
                    setMostrarTodasDatas(false);
                    setDataAtivaNaFaixa(dia.dataIso);
                  }}
                  className={`shrink-0 rounded-2xl border px-3.5 py-2 text-left transition-all ${
                    ativo
                      ? 'bg-[#1E6BFF] text-white border-[#1E6BFF] shadow-sm'
                      : 'bg-white text-[#0F172A] border-[#E2E8F0] hover:border-[#1E6BFF]/45 hover:bg-[#EFF4FB]/50'
                  }`}
                >
                  <p
                    className={`text-xs font-semibold capitalize ${
                      ativo ? 'text-white' : 'text-[#0F172A]'
                    }`}
                  >
                    {dia.dataIso === hojeIso
                      ? `Hoje · ${dia.label}`
                      : dia.dataIso === amanhaIso
                        ? `Amanhã · ${dia.label}`
                        : dia.label}
                  </p>
                  <p
                    className={`text-[11px] mt-0.5 ${
                      ativo ? 'text-white/85' : 'text-emerald-700 font-medium'
                    }`}
                  >
                    {dia.totalVagas} {dia.totalVagas === 1 ? 'vaga' : 'vagas'} ·{' '}
                    {dia.vagas.length} horários
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Resultados agrupados por Médico + Serviço + Unidade */}
      {loadingVagas ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : gruposPorDia.length === 0 ? (
        <EmptyState
          icon={<CalendarCheck2 className="h-6 w-6" />}
          title="Nenhum horário encontrado para esses filtros"
          description="Tente alterar a especialidade, o nome do médico, a data ou clique em Limpar filtros para ver outras opções."
          actionLabel={possuiFiltrosAtivos ? 'Limpar filtros' : undefined}
          onAction={possuiFiltrosAtivos ? limparFiltros : undefined}
          className="border-dashed bg-[#F8FAFC]"
        />
      ) : (
        <div className="space-y-6">
          {gruposPorDia.map((dia) => (
            <div key={dia.dataIso} className="space-y-3">
              {mostrarTodasDatas && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EFF4FB] border border-[#DBEAFE] px-3.5 py-1 text-xs font-semibold text-[#1E6BFF] capitalize">
                    <Calendar className="h-3.5 w-3.5" />
                    {dia.label}
                  </span>
                </div>
              )}

              <div className="space-y-3.5">
                {dia.grupos.map((grupo) => {
                  const manha = grupo.vagas.filter(
                    (v) => classificarTurnoPorHora(v.dataHoraInicio) === 'MANHA'
                  );
                  const tarde = grupo.vagas.filter(
                    (v) => classificarTurnoPorHora(v.dataHoraInicio) === 'TARDE'
                  );
                  const noite = grupo.vagas.filter(
                    (v) => classificarTurnoPorHora(v.dataHoraInicio) === 'NOITE'
                  );

                  const turnosGrupo = [
                    { id: 'MANHA', label: 'Manhã', Icon: Sun, lista: manha },
                    { id: 'TARDE', label: 'Tarde', Icon: Sunset, lista: tarde },
                    { id: 'NOITE', label: 'Noite', Icon: Moon, lista: noite },
                  ].filter((t) => t.lista.length > 0);

                  return (
                    <article
                      key={grupo.chave}
                      className="rounded-[24px] border border-[#E2E8F0] bg-white p-5 shadow-soft hover:border-[#1E6BFF]/35 transition-colors space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex items-start gap-3.5 min-w-0">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EFF4FB] text-[#1E6BFF]">
                            <Stethoscope className="h-5 w-5" />
                          </span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-display text-base sm:text-lg font-semibold text-[#0F172A]">
                                {grupo.profissionalNome}
                              </h3>
                              {grupo.profissionalRegistro && (
                                <span className="rounded-full bg-[#F4F7FC] border border-[#E2E8F0] px-2.5 py-0.5 text-[11px] font-semibold text-[#64748B]">
                                  {grupo.profissionalRegistro}
                                </span>
                              )}
                            </div>

                            <p className="mt-0.5 text-sm font-medium text-[#1E6BFF]">
                              {grupo.servicoNome}
                            </p>
                            <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-[#64748B]">
                              <MapPin className="h-3.5 w-3.5 shrink-0 text-[#1E6BFF]" />
                              <span>
                                {grupo.unidadeNome} · {grupo.unidadeBairro},{' '}
                                {grupo.unidadeMunicipio}
                              </span>
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5 shrink-0">
                          <StatusBadge tone="info">
                            {grupo.especialidade}
                          </StatusBadge>
                          <StatusBadge tone="neutral">
                            {LABELS_CATEGORIA_SERVICO[grupo.categoria]}
                          </StatusBadge>
                        </div>
                      </div>

                      {grupo.orientacoesPreparo && (
                        <div className="rounded-2xl bg-[#F4F7FC] border border-[#E2E8F0]/80 px-3.5 py-2 text-xs text-[#64748B]">
                          <strong className="text-[#0F172A]">Preparo:</strong>{' '}
                          {grupo.orientacoesPreparo}
                        </div>
                      )}

                      {/* Horários separados por turno */}
                      <div className="space-y-2.5 pt-2 border-t border-[#E2E8F0]/80">
                        {turnosGrupo.map((bloco) => {
                          const IconeTurno = bloco.Icon;
                          return (
                            <div
                              key={bloco.id}
                              className="flex flex-col sm:flex-row sm:items-center gap-2"
                            >
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#64748B] w-20 shrink-0">
                                <IconeTurno className="h-3.5 w-3.5 text-[#1E6BFF]" />
                                {bloco.label}
                              </span>

                              <div className="flex flex-wrap gap-2">
                                {bloco.lista.map((vaga) => {
                                  const carregando =
                                    vagaEmProcessamentoId === vaga.id;
                                  return (
                                    <button
                                      key={vaga.id}
                                      type="button"
                                      disabled={Boolean(vagaEmProcessamentoId)}
                                      onClick={() => onSelecionarVaga(vaga)}
                                      className="group inline-flex items-center gap-2 rounded-full border border-[#DBEAFE] bg-[#EFF4FB]/70 px-3.5 py-1.5 text-xs font-semibold text-[#0F172A] hover:bg-[#1E6BFF] hover:text-white hover:border-[#1E6BFF] transition-all disabled:opacity-60"
                                    >
                                      {carregando ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin text-[#1E6BFF] group-hover:text-white" />
                                      ) : (
                                        <Clock className="h-3.5 w-3.5 text-[#1E6BFF] group-hover:text-white" />
                                      )}
                                      <span>{formatarHora(vaga.dataHoraInicio)}</span>
                                      <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 group-hover:bg-white/20 group-hover:text-white">
                                        {vaga.vagasDisponiveis}{' '}
                                        {vaga.vagasDisponiveis === 1
                                          ? 'vaga'
                                          : 'vagas'}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
