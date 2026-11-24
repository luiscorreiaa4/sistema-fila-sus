import { useState, type FormEvent } from 'react';
import {
  CalendarPlus,
  CheckCircle2,
  ClipboardCheck,
  Search,
  UserPlus,
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import {
  agendamentosApi,
  agendasApi,
  extrairMensagemErro,
  filaApi,
  pacientesApi,
} from '../../services/api';
import type {
  EntradaFilaDTO,
  PacienteDTO,
  PerfilAcesso,
  VagaDisponivelDTO,
} from '../../types/api';
import {
  LABELS_CRITERIO_PRIORIDADE,
  LABELS_GRUPO_ATENDIMENTO,
  formatarCns,
  formatarData,
  formatarDataHora,
  maskCpf,
  somenteDigitos,
} from '../../utils/formatters';
import { PacienteCadastroForm } from '../../components/forms/PacienteCadastroForm';
import { FormField, TextInput } from '../../components/ui/FormControls';
import { Modal } from '../../components/ui/Modal';
import { PillButton } from '../../components/ui/PillButton';
import { StatusBadge } from '../../components/ui/StatusBadge';

interface RecepcaoTabProps {
  unidadeId: string;
  perfil: PerfilAcesso;
}

export function RecepcaoTab({ unidadeId, perfil }: RecepcaoTabProps) {
  const toast = useToast();
  const podeAlterarRecepcao = perfil === 'ATENDENTE' || perfil === 'ADMINISTRADOR';

  // Busca por CPF
  const [cpfBusca, setCpfBusca] = useState('');
  const [buscandoCpf, setBuscandoCpf] = useState(false);
  const [pacienteEncontrado, setPacienteEncontrado] = useState<PacienteDTO | null>(
    null
  );

  // Check-in na fila
  const [modoCheckin, setModoCheckin] = useState<'protocolo' | 'cpf'>('protocolo');
  const [valorCheckin, setValorCheckin] = useState('');
  const [fazendoCheckin, setFazendoCheckin] = useState(false);
  const [resultadoCheckin, setResultadoCheckin] = useState<{
    jaRegistrado: boolean;
    entrada: EntradaFilaDTO;
  } | null>(null);

  // Modal de cadastro assistido
  const [modalAssistido, setModalAssistido] = useState(false);

  // Modal de marcação assistida
  const [modalMarcar, setModalMarcar] = useState(false);
  const [vagasUnidade, setVagasUnidade] = useState<VagaDisponivelDTO[]>([]);
  const [carregandoVagas, setCarregandoVagas] = useState(false);
  const [marcandoVagaId, setMarcandoVagaId] = useState<string | null>(null);

  const handleBuscarCpf = async (e: FormEvent) => {
    e.preventDefault();
    const digitos = somenteDigitos(cpfBusca);
    if (digitos.length !== 11) {
      toast.warning('CPF inválido', 'Informe os 11 dígitos do CPF.');
      return;
    }

    setBuscandoCpf(true);
    try {
      const res = await pacientesApi.buscarPorCpf(digitos);
      setPacienteEncontrado(res.paciente);
    } catch (err) {
      setPacienteEncontrado(null);
      toast.error('Paciente não encontrado', extrairMensagemErro(err));
    } finally {
      setBuscandoCpf(false);
    }
  };

  const executarCheckin = async (params: { protocolo?: string; cpf?: string }) => {
    setFazendoCheckin(true);
    try {
      const res = await filaApi.checkin({
        unidadeId,
        ...params,
      });
      setResultadoCheckin(res);
      toast.success(
        res.jaRegistrado ? 'Check-in já havia sido registrado' : 'Check-in confirmado.',
        `Senha ${res.entrada.senhaAtendimento} (${LABELS_GRUPO_ATENDIMENTO[res.entrada.grupoAtendimento]})`
      );
    } catch (err) {
      toast.error('Erro no check-in', extrairMensagemErro(err));
    } finally {
      setFazendoCheckin(false);
    }
  };

  const handleCheckinForm = async (e: FormEvent) => {
    e.preventDefault();
    if (!valorCheckin.trim()) {
      toast.warning('Campo obrigatório', 'Informe o protocolo ou CPF do paciente.');
      return;
    }

    if (modoCheckin === 'protocolo') {
      await executarCheckin({ protocolo: valorCheckin.trim().toUpperCase() });
    } else {
      const cpfLimpo = somenteDigitos(valorCheckin);
      if (cpfLimpo.length !== 11) {
        toast.warning('CPF inválido', 'Informe os 11 dígitos do CPF.');
        return;
      }
      await executarCheckin({ cpf: cpfLimpo });
    }
  };

  const abrirMarcacaoAssistida = async () => {
    if (!pacienteEncontrado) return;
    setModalMarcar(true);
    setCarregandoVagas(true);
    try {
      const res = await agendasApi.listarDisponiveis({ unidadeId });
      setVagasUnidade(res.vagas);
    } catch (err) {
      toast.error('Erro ao carregar vagas', extrairMensagemErro(err));
    } finally {
      setCarregandoVagas(false);
    }
  };

  const handleMarcarParaPaciente = async (vagaId: string) => {
    if (!pacienteEncontrado) return;
    setMarcandoVagaId(vagaId);
    try {
      const res = await agendamentosApi.marcar({
        vagaId,
        pacienteId: pacienteEncontrado.id,
      });
      toast.success(
        'Agendamento assistido realizado.',
        `Protocolo ${res.agendamento.protocolo} · Senha ${res.agendamento.senhaAtendimento}`
      );
      setModalMarcar(false);
      setModoCheckin('protocolo');
      setValorCheckin(res.agendamento.protocolo);
    } catch (err) {
      toast.error('Não foi possível agendar', extrairMensagemErro(err));
    } finally {
      setMarcandoVagaId(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Coluna esquerda: check-in presencial */}
      <section className="lg:col-span-5 rounded-[28px] bg-white border border-[#E2E8F0] p-6 shadow-soft space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#1E6BFF]">
              Recepção
            </span>
            <h2 className="mt-1 font-display text-xl font-medium text-[#0F172A]">
              Check-in na fila do dia
            </h2>
            <p className="mt-1 text-xs text-[#64748B]">
              Confirme a chegada por protocolo ou CPF para gerar a senha
              prioritária ou comum.
            </p>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EFF4FB] text-[#1E6BFF]">
            <ClipboardCheck className="h-5 w-5" />
          </span>
        </div>

        {!podeAlterarRecepcao ? (
          <div className="rounded-2xl bg-[#F4F7FC] border border-[#E2E8F0] p-4 text-xs text-[#64748B]">
            O check-in presencial e o cadastro assistido são exclusivos dos perfis{' '}
            <strong>Atendente</strong> e <strong>Administrador</strong>.
          </div>
        ) : (
          <form onSubmit={handleCheckinForm} className="space-y-4">
            <div className="grid grid-cols-2 gap-1.5 rounded-full bg-[#EFF4FB] p-1 border border-[#DBEAFE]">
              <button
                type="button"
                onClick={() => {
                  setModoCheckin('protocolo');
                  setValorCheckin('');
                }}
                className={`rounded-full py-2 text-xs font-semibold transition-colors ${
                  modoCheckin === 'protocolo'
                    ? 'bg-[#1E6BFF] text-white'
                    : 'text-[#64748B]'
                }`}
              >
                Por protocolo
              </button>
              <button
                type="button"
                onClick={() => {
                  setModoCheckin('cpf');
                  setValorCheckin('');
                }}
                className={`rounded-full py-2 text-xs font-semibold transition-colors ${
                  modoCheckin === 'cpf'
                    ? 'bg-[#1E6BFF] text-white'
                    : 'text-[#64748B]'
                }`}
              >
                Por CPF
              </button>
            </div>

            <FormField
              label={
                modoCheckin === 'protocolo'
                  ? 'Protocolo do agendamento'
                  : 'CPF do Paciente'
              }
              htmlFor="checkin-valor"
              required
            >
              <TextInput
                id="checkin-valor"
                value={valorCheckin}
                onChange={(e) =>
                  setValorCheckin(
                    modoCheckin === 'cpf'
                      ? maskCpf(e.target.value)
                      : e.target.value.toUpperCase()
                  )
                }
                placeholder={
                  modoCheckin === 'protocolo' ? 'SUS-20261123-XXXX' : '000.000.000-00'
                }
              />
            </FormField>

            <PillButton
              type="submit"
              fullWidth
              loading={fazendoCheckin}
            >
              Confirmar Check-in
            </PillButton>
          </form>
        )}

        {resultadoCheckin && (
          <div className="rounded-2xl bg-[#EFF4FB] border border-[#DBEAFE] p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1E6BFF]">
                <CheckCircle2 className="h-4 w-4" />
                {resultadoCheckin.jaRegistrado
                  ? 'Entrada ativa localizada'
                  : 'Entrada registrada na fila'}
              </span>
              <StatusBadge
                tone={
                  resultadoCheckin.entrada.grupoAtendimento === 'PRIORITARIO'
                    ? 'warning'
                    : 'info'
                }
              >
                {LABELS_GRUPO_ATENDIMENTO[resultadoCheckin.entrada.grupoAtendimento]}
              </StatusBadge>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="font-display text-3xl font-semibold text-[#0F172A]">
                {resultadoCheckin.entrada.senhaAtendimento}
              </span>
              <span className="text-xs text-[#64748B]">
                Ordem #{resultadoCheckin.entrada.ordemEntrada} ·{' '}
                {resultadoCheckin.entrada.criterioPrioridade}
              </span>
            </div>
          </div>
        )}
      </section>

      {/* Coluna direita: busca por CPF e cadastro assistido */}
      <section className="lg:col-span-7 rounded-[28px] bg-white border border-[#E2E8F0] p-6 shadow-soft space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#1E6BFF]">
              Localizar Cidadão
            </span>
            <h2 className="mt-1 font-display text-xl font-medium text-[#0F172A]">
              Busca por CPF e cadastro assistido
            </h2>
          </div>

          {podeAlterarRecepcao && (
            <PillButton
              size="sm"
              variant="secondary"
              icon={<UserPlus className="h-3.5 w-3.5" />}
              onClick={() => setModalAssistido(true)}
            >
              Novo cadastro assistido
            </PillButton>
          )}
        </div>

        <form onSubmit={handleBuscarCpf} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <TextInput
              aria-label="CPF do paciente para busca"
              inputMode="numeric"
              value={cpfBusca}
              onChange={(e) => setCpfBusca(maskCpf(e.target.value))}
              placeholder="Digite o CPF do paciente (000.000.000-00)"
            />
          </div>
          <PillButton
            type="submit"
            loading={buscandoCpf}
            icon={<Search className="h-4 w-4" />}
          >
            Buscar CPF
          </PillButton>
        </form>

        {pacienteEncontrado ? (
          <div className="rounded-[24px] bg-[#F8FAFC] border border-[#E2E8F0] p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-semibold text-[#0F172A]">
                  {pacienteEncontrado.nomeExibicao}
                </h3>
                {pacienteEncontrado.nomeSocial && (
                  <p className="text-xs text-[#64748B]">
                    Nome civil: {pacienteEncontrado.nomeCompleto}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <StatusBadge
                  tone={pacienteEncontrado.ehPrioritarioLegal ? 'warning' : 'neutral'}
                >
                  {LABELS_CRITERIO_PRIORIDADE[pacienteEncontrado.criterioPrioridade]}
                </StatusBadge>
                <StatusBadge
                  tone={pacienteEncontrado.status === 'ATIVO' ? 'success' : 'danger'}
                >
                  {pacienteEncontrado.status}
                </StatusBadge>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="rounded-xl bg-white border border-[#E2E8F0]/80 p-3">
                <p className="text-[#64748B]">CPF</p>
                <p className="mt-0.5 font-semibold text-[#0F172A]">
                  {pacienteEncontrado.cpfFormatado}
                </p>
              </div>
              <div className="rounded-xl bg-white border border-[#E2E8F0]/80 p-3">
                <p className="text-[#64748B]">Cartão SUS (CNS)</p>
                <p className="mt-0.5 font-semibold text-[#0F172A]">
                  {formatarCns(pacienteEncontrado.cns)}
                </p>
              </div>
              <div className="rounded-xl bg-white border border-[#E2E8F0]/80 p-3">
                <p className="text-[#64748B]">Nascimento</p>
                <p className="mt-0.5 font-semibold text-[#0F172A]">
                  {formatarData(pacienteEncontrado.dataNascimento)}
                </p>
              </div>
            </div>

            <p className="text-xs text-[#64748B]">
              <strong>Contato:</strong> {pacienteEncontrado.email || '—'} ·{' '}
              {pacienteEncontrado.celular || '—'} | <strong>Endereço:</strong>{' '}
              {pacienteEncontrado.endereco.logradouro},{' '}
              {pacienteEncontrado.endereco.numero},{' '}
              {pacienteEncontrado.endereco.bairro},{' '}
              {pacienteEncontrado.endereco.municipio}/
              {pacienteEncontrado.endereco.estado}
            </p>

            {podeAlterarRecepcao && (
              <div className="flex flex-wrap gap-3 pt-2 border-t border-[#E2E8F0]">
                <PillButton
                  size="sm"
                  variant="primary"
                  icon={<CalendarPlus className="h-3.5 w-3.5" />}
                  onClick={() => void abrirMarcacaoAssistida()}
                >
                  Marcação assistida
                </PillButton>
                <PillButton
                  size="sm"
                  variant="secondary"
                  hideIconCircle
                  loading={fazendoCheckin}
                  onClick={() =>
                    void executarCheckin({ cpf: pacienteEncontrado.cpf })
                  }
                >
                  Check-in imediato por CPF
                </PillButton>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#E2E8F0] bg-[#F8FAFC] p-6 text-center text-xs text-[#64748B]">
            Busque um paciente pelo CPF para consultar o Cartão SUS, confirmar
            elegibilidade prioritária, marcar atendimento ou realizar check-in.
          </div>
        )}
      </section>

      {/* Modal de cadastro assistido */}
      <Modal
        open={modalAssistido}
        onClose={() => setModalAssistido(false)}
        title="Cadastro assistido de paciente"
        subtitle="Registrado com origem ASSISTIDO pela equipe da recepção."
        size="xl"
      >
        <PacienteCadastroForm
          mode="assistido"
          onCancel={() => setModalAssistido(false)}
          onSuccess={(p) => {
            setModalAssistido(false);
            setPacienteEncontrado(p);
            setCpfBusca(p.cpfFormatado);
            toast.success('Paciente cadastrado.',`${p.nomeExibicao} pronto para atendimento.`);
          }}
        />
      </Modal>

      {/* Modal de marcação assistida */}
      <Modal
        open={modalMarcar}
        onClose={() => setModalMarcar(false)}
        title="Marcação assistida"
        subtitle={
          pacienteEncontrado
            ? `Selecionar vaga aberta nesta unidade para ${pacienteEncontrado.nomeExibicao}`
            : undefined
        }
        size="lg"
      >
        {carregandoVagas ? (
          <p className="text-sm text-[#64748B] py-6 text-center">
            Carregando vagas disponíveis nesta unidade...
          </p>
        ) : vagasUnidade.length === 0 ? (
          <p className="text-sm text-[#64748B] py-6 text-center">
            Nenhuma vaga publicada disponível nesta unidade no momento.
          </p>
        ) : (
          <div className="space-y-3">
            {vagasUnidade.map((vaga) => (
              <div
                key={vaga.id}
                className="rounded-2xl border border-[#E2E8F0] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-semibold text-[#0F172A]">
                    {vaga.servicoNome}
                  </p>
                  <p className="text-xs text-[#64748B]">
                    {formatarDataHora(vaga.dataHoraInicio)} ·{' '}
                    {vaga.vagasDisponiveis} vaga(s) livre(s)
                    {vaga.profissionalNome ? ` · ${vaga.profissionalNome}` : ''}
                  </p>
                </div>
                <PillButton
                  size="sm"
                  loading={marcandoVagaId === vaga.id}
                  onClick={() => void handleMarcarParaPaciente(vaga.id)}
                >
                  Agendar vaga
                </PillButton>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
