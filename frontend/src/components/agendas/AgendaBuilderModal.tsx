import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CalendarPlus,
  Clock,
  Plus,
  Sparkles,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { agendasApi, extrairMensagemErro } from '../../services/api';
import {
  isProfissional,
  type ConfiguracaoDiaHorario,
  type PerfilAcesso,
  type ProfissionalDTO,
  type ServicoDTO,
} from '../../types/api';
import {
  DIAS_SEMANA,
  formatarData,
  hojeIsoMaceio,
  somarDiasIso,
} from '../../utils/formatters';
import { FormField, SelectInput, TextInput } from '../ui/FormControls';
import { Modal } from '../ui/Modal';
import { PillButton } from '../ui/PillButton';

interface AgendaBuilderModalProps {
  open: boolean;
  onClose: () => void;
  unidadeId: string;
  unidadeNome?: string;
  perfil: PerfilAcesso;
  servicos: ServicoDTO[];
  profissionais: ProfissionalDTO[];
  onSuccess: () => void | Promise<void>;
}

type ModoAgenda = 'RECORRENTE' | 'AVULSO';

function gerarIntervaloHorarios(
  inicio: string,
  fim: string,
  passoMinutos: number
): string[] {
  const regex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  const mIni = regex.exec(inicio);
  const mFim = regex.exec(fim);
  if (!mIni || !mFim || passoMinutos <= 0) return [];

  const minIni = Number(mIni[1]) * 60 + Number(mIni[2]);
  const minFim = Number(mFim[1]) * 60 + Number(mFim[2]);
  if (minFim < minIni) return [];

  const lista: string[] = [];
  for (let m = minIni; m <= minFim; m += passoMinutos) {
    const hh = String(Math.floor(m / 60)).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    lista.push(`${hh}:${mm}`);
  }
  return lista;
}

function obterDiaSemanaIso(iso: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return 1;
  return new Date(`${iso}T12:00:00Z`).getUTCDay();
}

export function AgendaBuilderModal({
  open,
  onClose,
  unidadeId,
  unidadeNome,
  perfil,
  servicos,
  profissionais,
  onSuccess,
}: AgendaBuilderModalProps) {
  const { usuario, tipoUsuario } = useAuth();
  const toast = useToast();

  const ehMedicoLogado =
    perfil === 'PROFISSIONAL_SAUDE' && isProfissional(usuario, tipoUsuario);

  const servicosAtivos = useMemo(
    () => servicos.filter((s) => s.status === 'ATIVO'),
    [servicos]
  );

  // Estado principal do formulário
  const [modo, setModo] = useState<ModoAgenda>('RECORRENTE');
  const [profissionalId, setProfissionalId] = useState('');
  const [servicoId, setServicoId] = useState('');
  const [dataInicio, setDataInicio] = useState(hojeIsoMaceio());
  const [dataFim, setDataFim] = useState(() => somarDiasIso(hojeIsoMaceio(), 14));
  const [dataAvulsa, setDataAvulsa] = useState(hojeIsoMaceio());
  const [diasSelecionados, setDiasSelecionados] = useState<number[]>([1, 2, 3, 4, 5]);

  // Horários e gerador por intervalo
  const [personalizarPorDia, setPersonalizarPorDia] = useState(false);
  const [diaEditando, setDiaEditando] = useState<number>(1);
  const [horariosPadrao, setHorariosPadrao] = useState<string[]>([
    '08:00',
    '08:30',
    '09:00',
    '09:30',
    '10:00',
    '14:00',
    '14:30',
    '15:00',
  ]);
  const [horariosPorDia, setHorariosPorDia] = useState<Record<number, string[]>>({});
  const [horaGenIni, setHoraGenIni] = useState('08:00');
  const [horaGenFim, setHoraGenFim] = useState('12:00');
  const [intervaloMin, setIntervaloMin] = useState(30);
  const [horarioCustom, setHorarioCustom] = useState('');

  const [capacidadePorHorario, setCapacidadePorHorario] = useState(2);
  const [publicarAoCriar, setPublicarAoCriar] = useState(true);
  const [salvando, setSalvando] = useState(false);

  // Médicos selecionáveis (quando Admin)
  const medicosDisponiveis = useMemo(
    () =>
      profissionais.filter(
        (p) => p.nivelAcesso === 'PROFISSIONAL_SAUDE' && p.status === 'ATIVO'
      ),
    [profissionais]
  );

  const especialidadesMedicoAtivo = useMemo(() => {
    if (ehMedicoLogado) {
      return usuario.especialidades;
    }
    const sel = medicosDisponiveis.find((p) => p.id === profissionalId);
    return sel?.especialidades ?? [];
  }, [ehMedicoLogado, usuario, medicosDisponiveis, profissionalId]);

  const servicosOrdenados = useMemo(() => {
    const espLower = especialidadesMedicoAtivo.map((e) => e.toLowerCase());
    return servicosAtivos.slice().sort((a, b) => {
      const aMatch = espLower.includes(a.especialidade.toLowerCase()) ? 0 : 1;
      const bMatch = espLower.includes(b.especialidade.toLowerCase()) ? 0 : 1;
      if (aMatch !== bMatch) return aMatch - bMatch;
      return a.nome.localeCompare(b.nome, 'pt-BR');
    });
  }, [servicosAtivos, especialidadesMedicoAtivo]);

  // Inicializa médico e serviço ao abrir
  useEffect(() => {
    if (!open) return;
    if (ehMedicoLogado) {
      setProfissionalId(usuario.id);
    }
    if (!servicoId && servicosOrdenados.length > 0) {
      setServicoId(servicosOrdenados[0].id);
    }
  }, [open, ehMedicoLogado, usuario, servicoId, servicosOrdenados]);

  useEffect(() => {
    if (
      personalizarPorDia &&
      diasSelecionados.length > 0 &&
      !diasSelecionados.includes(diaEditando)
    ) {
      setDiaEditando(diasSelecionados[0]);
    }
  }, [personalizarPorDia, diasSelecionados, diaEditando]);

  const horariosAtivosNaEdicao = useMemo(() => {
    if (modo === 'RECORRENTE' && personalizarPorDia) {
      return horariosPorDia[diaEditando] ?? horariosPadrao;
    }
    return horariosPadrao;
  }, [modo, personalizarPorDia, diaEditando, horariosPorDia, horariosPadrao]);

  const atualizarHorariosAtivos = (fn: (atual: string[]) => string[]) => {
    if (modo === 'RECORRENTE' && personalizarPorDia) {
      setHorariosPorDia((prev) => {
        const atual = prev[diaEditando] ?? horariosPadrao;
        return {
          ...prev,
          [diaEditando]: fn(atual).slice().sort(),
        };
      });
    } else {
      setHorariosPadrao((prev) => fn(prev).slice().sort());
    }
  };

  const aplicarGeracaoIntervalo = (ini: string, fim: string) => {
    const gerados = gerarIntervaloHorarios(ini, fim, intervaloMin);
    if (gerados.length === 0) {
      toast.warning(
        'Intervalo inválido',
        'Verifique se a hora inicial é menor ou igual à hora final.'
      );
      return;
    }
    atualizarHorariosAtivos((atual) =>
      Array.from(new Set([...atual, ...gerados]))
    );
  };

  const adicionarHorarioAvulso = () => {
    const limpo = horarioCustom.trim();
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(limpo)) {
      toast.warning('Horário inválido', 'Use o formato HH:mm (ex.: 13:30).');
      return;
    }
    atualizarHorariosAtivos((atual) =>
      atual.includes(limpo) ? atual : [...atual, limpo]
    );
    setHorarioCustom('');
  };

  // Monta payload final de diasHorarios e preview de vagas
  const configuracaoCalculada = useMemo(() => {
    const iniIso = modo === 'AVULSO' ? dataAvulsa : dataInicio;
    const fimIso = modo === 'AVULSO' ? dataAvulsa : dataFim;

    let diasHorarios: ConfiguracaoDiaHorario[] = [];
    if (modo === 'AVULSO') {
      const ds = obterDiaSemanaIso(dataAvulsa);
      if (horariosPadrao.length > 0) {
        diasHorarios = [{ diaSemana: ds, horarios: horariosPadrao.slice().sort() }];
      }
    } else {
      diasHorarios = diasSelecionados
        .slice()
        .sort((a, b) => a - b)
        .map((diaSemana) => {
          const lista = personalizarPorDia
            ? horariosPorDia[diaSemana] ?? horariosPadrao
            : horariosPadrao;
          return {
            diaSemana,
            horarios: lista.slice().sort(),
          };
        })
        .filter((d) => d.horarios.length > 0);
    }

    // Preview exato de dias e vagas
    let diasAtivosNoPeriodo = 0;
    let totalHorariosNoPeriodo = 0;

    if (
      /^\d{4}-\d{2}-\d{2}$/.test(iniIso) &&
      /^\d{4}-\d{2}-\d{2}$/.test(fimIso) &&
      fimIso >= iniIso
    ) {
      const startMs = new Date(`${iniIso}T00:00:00Z`).getTime();
      const endMs = new Date(`${fimIso}T00:00:00Z`).getTime();
      const umDiaMs = 24 * 60 * 60 * 1000;
      const mapaDias = new Map<number, string[]>(
        diasHorarios.map((d) => [d.diaSemana, d.horarios])
      );

      for (let ts = startMs; ts <= endMs; ts += umDiaMs) {
        const ds = new Date(ts).getUTCDay();
        const hs = mapaDias.get(ds);
        if (hs && hs.length > 0) {
          diasAtivosNoPeriodo += 1;
          totalHorariosNoPeriodo += hs.length;
        }
      }
    }

    const cap = Number.isFinite(capacidadePorHorario)
      ? Math.max(0, Math.floor(capacidadePorHorario))
      : 0;

    return {
      iniIso,
      fimIso,
      diasHorarios,
      diasAtivosNoPeriodo,
      totalHorariosNoPeriodo,
      totalVagasPrevistas: totalHorariosNoPeriodo * cap,
    };
  }, [
    modo,
    dataAvulsa,
    dataInicio,
    dataFim,
    diasSelecionados,
    personalizarPorDia,
    horariosPadrao,
    horariosPorDia,
    capacidadePorHorario,
  ]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!servicoId) {
      toast.warning('Serviço obrigatório', 'Selecione o serviço da agenda.');
      return;
    }
    if (configuracaoCalculada.fimIso < configuracaoCalculada.iniIso) {
      toast.warning(
        'Período inválido',
        'A data final não pode ser anterior à data inicial.'
      );
      return;
    }
    if (configuracaoCalculada.diasHorarios.length === 0) {
      toast.warning(
        'Horários obrigatórios',
        'Defina pelo menos um dia e um horário de atendimento.'
      );
      return;
    }
    if (configuracaoCalculada.diasAtivosNoPeriodo === 0) {
      toast.warning(
        'Nenhum dia correspondente no período',
        'Os dias da semana selecionados não ocorrem entre a data inicial e final.'
      );
      return;
    }

    setSalvando(true);
    try {
      const res = await agendasApi.criar({
        unidadeId,
        servicoId,
        profissionalId: ehMedicoLogado
          ? usuario.id
          : profissionalId || null,
        dataInicio: configuracaoCalculada.iniIso,
        dataFim: configuracaoCalculada.fimIso,
        diasHorarios: configuracaoCalculada.diasHorarios,
        capacidadePorHorario: Number(capacidadePorHorario),
        publicar: publicarAoCriar,
      });

      toast.success(
        publicarAoCriar
          ? 'Agenda publicada com sucesso!'
          : 'Agenda salva como rascunho.',
        res.vagasCriadas > 0
          ? `${res.vagasCriadas} horários disponíveis materializados.`
          : undefined
      );
      await onSuccess();
      onClose();
    } catch (err) {
      toast.error('Não foi possível criar a agenda', extrairMensagemErro(err));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Abrir novos horários de atendimento"
      subtitle={
        unidadeNome
          ? `Unidade: ${unidadeNome}. Configure os turnos e confira a prévia antes de publicar.`
          : 'Configure o período, turnos e capacidade por horário.'
      }
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Seletor de Modo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-2xl bg-[#EFF4FB] p-1.5 border border-[#DBEAFE]">
          <button
            type="button"
            onClick={() => setModo('RECORRENTE')}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
              modo === 'RECORRENTE'
                ? 'bg-[#1E6BFF] text-white shadow-sm'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <CalendarDays className="h-4 w-4" />
            Escala Recorrente (Período)
          </button>
          <button
            type="button"
            onClick={() => setModo('AVULSO')}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
              modo === 'AVULSO'
                ? 'bg-[#1E6BFF] text-white shadow-sm'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <CalendarPlus className="h-4 w-4" />
            Dia Específico (Avulso)
          </button>
        </div>

        {/* Médico e Serviço */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ehMedicoLogado ? (
            <div className="rounded-2xl border border-[#DBEAFE] bg-[#EFF4FB]/70 p-3.5 flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1E6BFF] text-white">
                <UserCheck className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#1E6BFF]">
                  Profissional responsável
                </p>
                <p className="text-sm font-semibold text-[#0F172A] truncate">
                  {usuario.nomeExibicao}
                </p>
                <p className="text-[11px] text-[#64748B] truncate">
                  {usuario.conselhoProfissional} {usuario.numeroRegistro}/
                  {usuario.ufRegistro} · {usuario.especialidades.join(', ')}
                </p>
              </div>
            </div>
          ) : (
            <FormField label="Médico / Profissional" htmlFor="builder-prof">
              <SelectInput
                id="builder-prof"
                value={profissionalId}
                onChange={(e) => setProfissionalId(e.target.value)}
              >
                <option value="">Equipe da unidade (sem médico fixo)</option>
                {medicosDisponiveis.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nomeExibicao}
                    {p.especialidades.length > 0
                      ? ` — ${p.especialidades.join(', ')}`
                      : ''}
                  </option>
                ))}
              </SelectInput>
            </FormField>
          )}

          <FormField label="Serviço / Tipo de Atendimento" htmlFor="builder-serv" required>
            <SelectInput
              id="builder-serv"
              value={servicoId}
              onChange={(e) => setServicoId(e.target.value)}
            >
              <option value="">Selecione um serviço ativo...</option>
              {servicosOrdenados.map((s) => {
                const recomendado = especialidadesMedicoAtivo.some(
                  (e) => e.toLowerCase() === s.especialidade.toLowerCase()
                );
                return (
                  <option key={s.id} value={s.id}>
                    {recomendado ? '★ ' : ''}
                    {s.nome} ({s.especialidade})
                  </option>
                );
              })}
            </SelectInput>
          </FormField>
        </div>

        {/* Datas e Dias da semana */}
        {modo === 'AVULSO' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Data do atendimento"
              htmlFor="builder-avulso"
              hint={`Dia da semana: ${
                DIAS_SEMANA.find((d) => d.valor === obterDiaSemanaIso(dataAvulsa))
                  ?.completo ?? ''
              }`}
              required
            >
              <TextInput
                id="builder-avulso"
                type="date"
                min={hojeIsoMaceio()}
                value={dataAvulsa}
                onChange={(e) => setDataAvulsa(e.target.value)}
              />
            </FormField>

            <FormField
              label="Pacientes por horário"
              htmlFor="builder-cap-avulso"
              hint="Quantas consultas podem ser marcadas em cada horário."
              required
            >
              <TextInput
                id="builder-cap-avulso"
                type="number"
                min={1}
                max={30}
                value={capacidadePorHorario}
                onChange={(e) => setCapacidadePorHorario(Number(e.target.value))}
              />
            </FormField>
          </div>
        ) : (
          <div className="space-y-4 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC]/70 p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField label="Data início" htmlFor="builder-ini" required>
                <TextInput
                  id="builder-ini"
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </FormField>
              <FormField label="Data fim" htmlFor="builder-fim" required>
                <TextInput
                  id="builder-fim"
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                />
              </FormField>
              <FormField
                label="Vagas por horário"
                htmlFor="builder-cap-rec"
                required
              >
                <TextInput
                  id="builder-cap-rec"
                  type="number"
                  min={1}
                  max={30}
                  value={capacidadePorHorario}
                  onChange={(e) => setCapacidadePorHorario(Number(e.target.value))}
                />
              </FormField>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-medium text-[#0F172A]">
                  Dias da semana <span className="text-[#1E6BFF]">*</span>
                </p>
                <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setDiasSelecionados([1, 2, 3, 4, 5])}
                    className="text-[#1E6BFF] hover:underline"
                  >
                    Seg a Sex
                  </button>
                  <span className="text-[#CBD5E1]">·</span>
                  <button
                    type="button"
                    onClick={() => setDiasSelecionados([0, 1, 2, 3, 4, 5, 6])}
                    className="text-[#1E6BFF] hover:underline"
                  >
                    Todos os dias
                  </button>
                </div>
              </div>

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
                            : [...prev, dia.valor].sort((a, b) => a - b)
                        )
                      }
                      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-colors ${
                        ativo
                          ? 'bg-[#1E6BFF] text-white border-[#1E6BFF]'
                          : 'bg-white text-[#64748B] border-[#E2E8F0] hover:border-[#1E6BFF]/40'
                      }`}
                    >
                      {dia.curto}
                    </button>
                  );
                })}
              </div>
            </div>

            {diasSelecionados.length > 1 && (
              <label className="flex items-center gap-2.5 text-xs text-[#0F172A] cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={personalizarPorDia}
                  onChange={(e) => setPersonalizarPorDia(e.target.checked)}
                  className="h-4 w-4 rounded border-[#CBD5E1] text-[#1E6BFF]"
                />
                <span>
                  Personalizar horários diferentes para cada dia da semana
                </span>
              </label>
            )}
          </div>
        )}

        {/* Gerador Inteligente de Horários */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#1E6BFF]">
                Grade de Horários
              </p>
              <p className="text-xs text-[#64748B]">
                Gere intervalos automaticamente por turno ou clique nos horários para ligar/desligar.
              </p>
            </div>
            <button
              type="button"
              onClick={() => atualizarHorariosAtivos(() => [])}
              className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline self-start sm:self-auto"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Limpar horários
            </button>
          </div>

          {/* Seletor do dia quando personalizarPorDia = true */}
          {modo === 'RECORRENTE' && personalizarPorDia && diasSelecionados.length > 0 && (
            <div className="flex flex-wrap gap-1.5 rounded-xl bg-[#F4F7FC] p-2">
              {diasSelecionados.map((ds) => {
                const info = DIAS_SEMANA.find((d) => d.valor === ds);
                const qtd = (horariosPorDia[ds] ?? horariosPadrao).length;
                return (
                  <button
                    key={ds}
                    type="button"
                    onClick={() => setDiaEditando(ds)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      diaEditando === ds
                        ? 'bg-[#1E6BFF] text-white'
                        : 'bg-white text-[#64748B] border border-[#E2E8F0]'
                    }`}
                  >
                    {info?.curto} ({qtd})
                  </button>
                );
              })}
            </div>
          )}

          {/* Controles do gerador automático */}
          <div className="rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] p-3.5 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F172A] mr-1">
                <Sparkles className="h-3.5 w-3.5 text-[#1E6BFF]" />
                Atalhos rápidos:
              </span>
              <button
                type="button"
                onClick={() => aplicarGeracaoIntervalo('08:00', '11:30')}
                className="rounded-full bg-[#EFF4FB] border border-[#DBEAFE] px-3 py-1 text-xs font-semibold text-[#1E6BFF] hover:bg-[#DBEAFE]"
              >
                + Turno Manhã (08h–11h30)
              </button>
              <button
                type="button"
                onClick={() => aplicarGeracaoIntervalo('14:00', '17:30')}
                className="rounded-full bg-[#EFF4FB] border border-[#DBEAFE] px-3 py-1 text-xs font-semibold text-[#1E6BFF] hover:bg-[#DBEAFE]"
              >
                + Turno Tarde (14h–17h30)
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 items-end">
              <FormField label="Das" htmlFor="gen-ini">
                <TextInput
                  id="gen-ini"
                  type="time"
                  value={horaGenIni}
                  onChange={(e) => setHoraGenIni(e.target.value)}
                />
              </FormField>
              <FormField label="Até" htmlFor="gen-fim">
                <TextInput
                  id="gen-fim"
                  type="time"
                  value={horaGenFim}
                  onChange={(e) => setHoraGenFim(e.target.value)}
                />
              </FormField>
              <FormField label="A cada" htmlFor="gen-int">
                <SelectInput
                  id="gen-int"
                  value={intervaloMin}
                  onChange={(e) => setIntervaloMin(Number(e.target.value))}
                >
                  <option value={15}>15 min</option>
                  <option value={20}>20 min</option>
                  <option value={30}>30 min</option>
                  <option value={40}>40 min</option>
                  <option value={60}>60 min</option>
                </SelectInput>
              </FormField>
              <PillButton
                type="button"
                size="sm"
                variant="secondary"
                hideIconCircle
                onClick={() => aplicarGeracaoIntervalo(horaGenIni, horaGenFim)}
              >
                <Plus className="h-3.5 w-3.5" />
                Gerar série
              </PillButton>
            </div>
          </div>

          {/* Lista de horários ativos */}
          <div className="space-y-2">
            {horariosAtivosNaEdicao.length === 0 ? (
              <p className="text-xs text-[#64748B] py-2">
                Nenhum horário selecionado ainda. Use um dos atalhos acima ou adicione manualmente.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {horariosAtivosNaEdicao.map((h) => (
                  <button
                    key={h}
                    type="button"
                    title="Clique para remover horário"
                    onClick={() =>
                      atualizarHorariosAtivos((atual) =>
                        atual.filter((item) => item !== h)
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#EFF4FB] border border-[#1E6BFF]/40 px-3 py-1 text-xs font-semibold text-[#1E6BFF] hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-colors"
                  >
                    <Clock className="h-3 w-3" />
                    {h}
                    <span className="text-[10px] opacity-75">×</span>
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 pt-1 max-w-xs">
              <TextInput
                value={horarioCustom}
                onChange={(e) => setHorarioCustom(e.target.value)}
                placeholder="Horário avulso (ex.: 13:30)"
              />
              <PillButton
                type="button"
                size="sm"
                variant="ghost"
                hideIconCircle
                onClick={adicionarHorarioAvulso}
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </PillButton>
            </div>
          </div>
        </div>

        {/* Preview ao vivo */}
        <div
          className={`rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            configuracaoCalculada.totalVagasPrevistas > 0
              ? 'bg-emerald-50/70 border-emerald-200'
              : 'bg-amber-50 border-amber-200'
          }`}
        >
          <div className="space-y-0.5">
            {configuracaoCalculada.totalVagasPrevistas > 0 ? (
              <>
                <p className="text-xs font-semibold text-emerald-900">
                  Prévia da agenda: {configuracaoCalculada.diasAtivosNoPeriodo}{' '}
                  {configuracaoCalculada.diasAtivosNoPeriodo === 1
                    ? 'dia ativo'
                    : 'dias ativos'}{' '}
                  · {configuracaoCalculada.totalHorariosNoPeriodo} horários ·{' '}
                  <span className="underline">
                    {configuracaoCalculada.totalVagasPrevistas} vagas totais
                  </span>
                </p>
                <p className="text-[11px] text-emerald-800">
                  Período: {formatarData(configuracaoCalculada.iniIso)} até{' '}
                  {formatarData(configuracaoCalculada.fimIso)} ({capacidadePorHorario}{' '}
                  vaga(s) por horário)
                </p>
              </>
            ) : (
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Nenhuma vaga será gerada com a configuração atual. Verifique o período, dias e horários.
              </p>
            )}
          </div>

          <label className="flex items-center gap-2 text-xs font-medium text-[#0F172A] shrink-0 cursor-pointer">
            <input
              type="checkbox"
              checked={publicarAoCriar}
              onChange={(e) => setPublicarAoCriar(e.target.checked)}
              className="h-4 w-4 rounded border-[#CBD5E1] text-[#1E6BFF]"
            />
            Publicar imediatamente
          </label>
        </div>

        {/* Ações */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 pt-2">
          <PillButton
            type="button"
            variant="ghost"
            hideIconCircle
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            Cancelar
          </PillButton>
          <PillButton
            type="submit"
            loading={salvando}
            disabled={configuracaoCalculada.totalVagasPrevistas === 0}
            className="w-full sm:w-auto"
          >
            {publicarAoCriar ? 'Publicar Agenda' : 'Salvar como Rascunho'}
          </PillButton>
        </div>
      </form>
    </Modal>
  );
}
