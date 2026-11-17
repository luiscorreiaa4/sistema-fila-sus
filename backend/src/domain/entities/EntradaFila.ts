import { ConflictError } from '../errors/ConflictError';
import { ValidationError } from '../errors/ValidationError';

export type GrupoAtendimento = 'PRIORITARIO' | 'COMUM';
export type SituacaoFila =
  | 'AGUARDANDO'
  | 'CHAMADO'
  | 'EM_ATENDIMENTO'
  | 'CONCLUIDO'
  | 'NAO_ATENDIDO'
  | 'CANCELADO';

export interface EntradaFilaProps {
  id: string;
  agendamentoId: string;
  pacienteId: string;
  unidadeId: string;
  atendenteResponsavelId?: string | null;
  dataHoraChegada?: Date;
  grupoAtendimento: GrupoAtendimento;
  criterioPrioridade: string;
  senhaAtendimento: string;
  ordemEntrada: number;
  situacao?: SituacaoFila;
  recolocacoes?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Entidade de domínio que representa a presença de um paciente na fila presencial da unidade,
 * protegendo o grafo válido de transições (`AGUARDANDO -> CHAMADO -> EM_ATENDIMENTO -> CONCLUIDO | NAO_ATENDIDO`).
 */
export class EntradaFila {
  private readonly id: string;
  private readonly agendamentoId: string;
  private readonly pacienteId: string;
  private readonly unidadeId: string;
  private readonly atendenteResponsavelId: string | null;
  private readonly dataHoraChegada: Date;
  private readonly grupoAtendimento: GrupoAtendimento;
  private readonly criterioPrioridade: string;
  private readonly senhaAtendimento: string;
  private ordemEntrada: number;
  private situacao: SituacaoFila;
  private recolocacoes: number;
  private readonly createdAt: Date;
  private updatedAt: Date;

  constructor(props: EntradaFilaProps) {
    if (!props.id || props.id.trim().length === 0) {
      throw new ValidationError('Identificador da entrada na fila é obrigatório');
    }
    if (!props.agendamentoId || props.agendamentoId.trim().length === 0) {
      throw new ValidationError('Agendamento é obrigatório na entrada da fila');
    }
    if (!props.pacienteId || props.pacienteId.trim().length === 0) {
      throw new ValidationError('Paciente é obrigatório na entrada da fila');
    }
    if (!props.unidadeId || props.unidadeId.trim().length === 0) {
      throw new ValidationError('Unidade é obrigatória na entrada da fila');
    }
    if (!props.criterioPrioridade || props.criterioPrioridade.trim().length === 0) {
      throw new ValidationError('Critério de prioridade é obrigatório');
    }
    if (!props.senhaAtendimento || props.senhaAtendimento.trim().length === 0) {
      throw new ValidationError('Senha de atendimento é obrigatória');
    }
    if (!Number.isInteger(props.ordemEntrada) || props.ordemEntrada < 1) {
      throw new ValidationError('Ordem de entrada deve ser um inteiro positivo');
    }

    const recolocacoes = props.recolocacoes ?? 0;
    if (!Number.isInteger(recolocacoes) || recolocacoes < 0) {
      throw new ValidationError(
        'Quantidade de recolocações não pode ser negativa'
      );
    }

    this.id = props.id.trim();
    this.agendamentoId = props.agendamentoId.trim();
    this.pacienteId = props.pacienteId.trim();
    this.unidadeId = props.unidadeId.trim();
    this.atendenteResponsavelId =
      props.atendenteResponsavelId &&
      props.atendenteResponsavelId.trim().length > 0
        ? props.atendenteResponsavelId.trim()
        : null;
    this.dataHoraChegada = props.dataHoraChegada ?? new Date();
    this.grupoAtendimento = props.grupoAtendimento;
    this.criterioPrioridade = props.criterioPrioridade.trim();
    this.senhaAtendimento = props.senhaAtendimento.trim();
    this.ordemEntrada = props.ordemEntrada;
    this.situacao = props.situacao ?? 'AGUARDANDO';
    this.recolocacoes = recolocacoes;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }

  public chamar(): void {
    if (this.situacao !== 'AGUARDANDO') {
      throw new ConflictError(
        `Transição inválida na fila: não é possível chamar a partir de ${this.situacao}`
      );
    }
    this.situacao = 'CHAMADO';
    this.updatedAt = new Date();
  }

  public iniciarAtendimento(): void {
    if (this.situacao !== 'CHAMADO') {
      throw new ConflictError(
        `Transição inválida na fila: não é possível iniciar atendimento a partir de ${this.situacao}`
      );
    }
    this.situacao = 'EM_ATENDIMENTO';
    this.updatedAt = new Date();
  }

  public concluir(): void {
    if (this.situacao !== 'EM_ATENDIMENTO') {
      throw new ConflictError(
        `Transição inválida na fila: não é possível concluir atendimento a partir de ${this.situacao}`
      );
    }
    this.situacao = 'CONCLUIDO';
    this.updatedAt = new Date();
  }

  /**
   * Registra ausência na chamada. Permite no máximo 1 recolocação ao fim da fila quando ainda em `CHAMADO`.
   */
  public registrarAusencia(
    permitirRecolocacao = true,
    novaOrdemEntrada?: number
  ): void {
    if (this.situacao !== 'CHAMADO' && this.situacao !== 'EM_ATENDIMENTO') {
      throw new ConflictError(
        `Transição inválida na fila: não é possível registrar ausência a partir de ${this.situacao}`
      );
    }

    if (
      permitirRecolocacao &&
      this.recolocacoes === 0 &&
      this.situacao === 'CHAMADO'
    ) {
      if (novaOrdemEntrada !== undefined) {
        if (!Number.isInteger(novaOrdemEntrada) || novaOrdemEntrada < 1) {
          throw new ValidationError(
            'Nova ordem de entrada deve ser um inteiro positivo'
          );
        }
        this.ordemEntrada = novaOrdemEntrada;
      }
      this.recolocacoes = 1;
      this.situacao = 'AGUARDANDO';
    } else {
      this.situacao = 'NAO_ATENDIDO';
    }

    this.updatedAt = new Date();
  }

  public cancelar(): void {
    if (this.situacao !== 'AGUARDANDO') {
      throw new ConflictError(
        `Transição inválida na fila: não é possível cancelar entrada no estado ${this.situacao}`
      );
    }
    this.situacao = 'CANCELADO';
    this.updatedAt = new Date();
  }

  public ehPrioritario(): boolean {
    return this.grupoAtendimento === 'PRIORITARIO';
  }

  public estaAtiva(): boolean {
    return (
      this.situacao === 'AGUARDANDO' ||
      this.situacao === 'CHAMADO' ||
      this.situacao === 'EM_ATENDIMENTO'
    );
  }

  public getId(): string {
    return this.id;
  }

  public getAgendamentoId(): string {
    return this.agendamentoId;
  }

  public getPacienteId(): string {
    return this.pacienteId;
  }

  public getUnidadeId(): string {
    return this.unidadeId;
  }

  public getAtendenteResponsavelId(): string | null {
    return this.atendenteResponsavelId;
  }

  public getDataHoraChegada(): Date {
    return new Date(this.dataHoraChegada.getTime());
  }

  public getGrupoAtendimento(): GrupoAtendimento {
    return this.grupoAtendimento;
  }

  public getCriterioPrioridade(): string {
    return this.criterioPrioridade;
  }

  public getSenhaAtendimento(): string {
    return this.senhaAtendimento;
  }

  public getOrdemEntrada(): number {
    return this.ordemEntrada;
  }

  public getSituacao(): SituacaoFila {
    return this.situacao;
  }

  public getRecolocacoes(): number {
    return this.recolocacoes;
  }

  public getCreatedAt(): Date {
    return this.createdAt;
  }

  public getUpdatedAt(): Date {
    return this.updatedAt;
  }
}
