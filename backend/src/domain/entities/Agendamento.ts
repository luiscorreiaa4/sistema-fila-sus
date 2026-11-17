import { randomBytes } from 'node:crypto';
import { ConflictError } from '../errors/ConflictError';
import { ValidationError } from '../errors/ValidationError';

export type OrigemMarcacao = 'APLICATIVO' | 'ASSISTIDA';
export type StatusAgendamento =
  | 'AGENDADO'
  | 'REALIZADO'
  | 'CANCELADO'
  | 'NAO_REALIZADO';

export interface AgendamentoProps {
  id: string;
  pacienteId: string;
  unidadeId: string;
  servicoId: string;
  profissionalId?: string | null;
  vagaId: string;
  dataHoraAtendimento: Date;
  protocolo: string;
  senhaAtendimento: string;
  versao?: number;
  origemMarcacao?: OrigemMarcacao;
  status?: StatusAgendamento;
  motivoCancelamento?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Entidade de domínio que encapsula marcação e transições válidas de um agendamento no SUS.
 */
export class Agendamento {
  private readonly id: string;
  private readonly pacienteId: string;
  private readonly unidadeId: string;
  private readonly servicoId: string;
  private readonly profissionalId: string | null;
  private readonly vagaId: string;
  private readonly dataHoraAtendimento: Date;
  private readonly protocolo: string;
  private senhaAtendimento: string;
  private versao: number;
  private readonly origemMarcacao: OrigemMarcacao;
  private status: StatusAgendamento;
  private motivoCancelamento: string | null;
  private readonly createdAt: Date;
  private updatedAt: Date;

  constructor(props: AgendamentoProps) {
    if (!props.id || props.id.trim().length === 0) {
      throw new ValidationError('Identificador do agendamento é obrigatório');
    }
    if (!props.pacienteId || props.pacienteId.trim().length === 0) {
      throw new ValidationError('Paciente é obrigatório no agendamento');
    }
    if (!props.unidadeId || props.unidadeId.trim().length === 0) {
      throw new ValidationError('Unidade é obrigatória no agendamento');
    }
    if (!props.servicoId || props.servicoId.trim().length === 0) {
      throw new ValidationError('Serviço é obrigatório no agendamento');
    }
    if (!props.vagaId || props.vagaId.trim().length === 0) {
      throw new ValidationError('Vaga é obrigatória no agendamento');
    }
    if (
      !(props.dataHoraAtendimento instanceof Date) ||
      Number.isNaN(props.dataHoraAtendimento.getTime())
    ) {
      throw new ValidationError('Data/hora do atendimento inválida');
    }
    if (!props.protocolo || props.protocolo.trim().length === 0) {
      throw new ValidationError('Protocolo do agendamento é obrigatório');
    }
    if (!props.senhaAtendimento || props.senhaAtendimento.trim().length === 0) {
      throw new ValidationError('Senha de atendimento é obrigatória');
    }

    const versao = props.versao ?? 1;
    if (!Number.isInteger(versao) || versao < 1) {
      throw new ValidationError('Versão do agendamento deve ser maior ou igual a 1');
    }

    const status = props.status ?? 'AGENDADO';
    const motivo =
      props.motivoCancelamento && props.motivoCancelamento.trim().length > 0
        ? props.motivoCancelamento.trim()
        : null;

    if (status === 'CANCELADO' && (!motivo || motivo.length < 5)) {
      throw new ValidationError(
        'Agendamento cancelado exige motivo com pelo menos 5 caracteres'
      );
    }

    this.id = props.id.trim();
    this.pacienteId = props.pacienteId.trim();
    this.unidadeId = props.unidadeId.trim();
    this.servicoId = props.servicoId.trim();
    this.profissionalId =
      props.profissionalId && props.profissionalId.trim().length > 0
        ? props.profissionalId.trim()
        : null;
    this.vagaId = props.vagaId.trim();
    this.dataHoraAtendimento = new Date(props.dataHoraAtendimento.getTime());
    this.protocolo = props.protocolo.trim();
    this.senhaAtendimento = props.senhaAtendimento.trim();
    this.versao = versao;
    this.origemMarcacao = props.origemMarcacao ?? 'APLICATIVO';
    this.status = status;
    this.motivoCancelamento = motivo;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }

  public static gerarProtocolo(
    data: Date = new Date(),
    sufixo?: string
  ): string {
    const yyyy = String(data.getUTCFullYear()).padStart(4, '0');
    const mm = String(data.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(data.getUTCDate()).padStart(2, '0');
    const codigo =
      sufixo && sufixo.trim().length > 0
        ? sufixo.trim().toUpperCase()
        : randomBytes(3).toString('hex').toUpperCase();

    return `SUS-${yyyy}${mm}${dd}-${codigo}`;
  }

  public cancelar(motivo: string): void {
    if (this.status !== 'AGENDADO') {
      throw new ConflictError(
        `Não é possível cancelar agendamento no status ${this.status}`
      );
    }

    const motivoLimpo = motivo?.trim() ?? '';
    if (motivoLimpo.length < 5) {
      throw new ValidationError(
        'Motivo do cancelamento deve ter pelo menos 5 caracteres'
      );
    }

    this.status = 'CANCELADO';
    this.motivoCancelamento = motivoLimpo;
    this.versao += 1;
    this.updatedAt = new Date();
  }

  public marcarRealizado(): void {
    if (this.status !== 'AGENDADO') {
      throw new ConflictError(
        `Não é possível marcar como REALIZADO um agendamento no status ${this.status}`
      );
    }

    this.status = 'REALIZADO';
    this.versao += 1;
    this.updatedAt = new Date();
  }

  public marcarNaoRealizado(motivo?: string): void {
    if (this.status !== 'AGENDADO') {
      throw new ConflictError(
        `Não é possível marcar como NAO_REALIZADO um agendamento no status ${this.status}`
      );
    }

    this.status = 'NAO_REALIZADO';
    if (motivo && motivo.trim().length > 0) {
      this.motivoCancelamento = motivo.trim();
    }
    this.versao += 1;
    this.updatedAt = new Date();
  }

  public atualizarSenhaAtendimento(novaSenha: string): void {
    const senhaLimpa = novaSenha?.trim() ?? '';
    if (senhaLimpa.length === 0 || senhaLimpa.length > 20) {
      throw new ValidationError('Senha de atendimento inválida');
    }
    this.senhaAtendimento = senhaLimpa;
    this.updatedAt = new Date();
  }

  public estaAgendado(): boolean {
    return this.status === 'AGENDADO';
  }

  public getId(): string {
    return this.id;
  }

  public getPacienteId(): string {
    return this.pacienteId;
  }

  public getUnidadeId(): string {
    return this.unidadeId;
  }

  public getServicoId(): string {
    return this.servicoId;
  }

  public getProfissionalId(): string | null {
    return this.profissionalId;
  }

  public getVagaId(): string {
    return this.vagaId;
  }

  public getDataHoraAtendimento(): Date {
    return new Date(this.dataHoraAtendimento.getTime());
  }

  public getProtocolo(): string {
    return this.protocolo;
  }

  public getSenhaAtendimento(): string {
    return this.senhaAtendimento;
  }

  public getVersao(): number {
    return this.versao;
  }

  public getOrigemMarcacao(): OrigemMarcacao {
    return this.origemMarcacao;
  }

  public getStatus(): StatusAgendamento {
    return this.status;
  }

  public getMotivoCancelamento(): string | null {
    return this.motivoCancelamento;
  }

  public getCreatedAt(): Date {
    return this.createdAt;
  }

  public getUpdatedAt(): Date {
    return this.updatedAt;
  }
}
