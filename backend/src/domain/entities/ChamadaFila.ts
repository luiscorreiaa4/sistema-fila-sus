import { ConflictError } from '../errors/ConflictError';
import { ValidationError } from '../errors/ValidationError';

export type EstadoChamada =
  | 'CHAMADO'
  | 'EM_ATENDIMENTO'
  | 'CONCLUIDO'
  | 'NAO_ATENDIDO';

export interface ChamadaFilaProps {
  id: string;
  entradaFilaId: string;
  profissionalChamadorId: string;
  guicheSala: string;
  dataHoraChamada?: Date;
  tentativa?: number;
  estado?: EstadoChamada;
  dataHoraInicio?: Date | null;
  dataHoraConclusao?: Date | null;
  duracaoMinutos?: number | null;
  motivoAusencia?: string | null;
}

/**
 * Entidade de domínio que registra uma chamada emitida ao painel público e o tempo de atendimento.
 */
export class ChamadaFila {
  private readonly id: string;
  private readonly entradaFilaId: string;
  private readonly profissionalChamadorId: string;
  private readonly guicheSala: string;
  private dataHoraChamada: Date;
  private tentativa: number;
  private estado: EstadoChamada;
  private dataHoraInicio: Date | null;
  private dataHoraConclusao: Date | null;
  private duracaoMinutos: number | null;
  private motivoAusencia: string | null;

  constructor(props: ChamadaFilaProps) {
    if (!props.id || props.id.trim().length === 0) {
      throw new ValidationError('Identificador da chamada é obrigatório');
    }
    if (!props.entradaFilaId || props.entradaFilaId.trim().length === 0) {
      throw new ValidationError('Entrada da fila é obrigatória na chamada');
    }
    if (
      !props.profissionalChamadorId ||
      props.profissionalChamadorId.trim().length === 0
    ) {
      throw new ValidationError('Profissional chamador é obrigatório');
    }

    const guicheLimpo = props.guicheSala?.trim() ?? '';
    if (guicheLimpo.length < 2 || guicheLimpo.length > 60) {
      throw new ValidationError(
        'Guichê ou sala deve ter entre 2 e 60 caracteres'
      );
    }

    const tentativa = props.tentativa ?? 1;
    if (!Number.isInteger(tentativa) || tentativa < 1) {
      throw new ValidationError('Número da tentativa deve ser maior ou igual a 1');
    }

    if (
      props.duracaoMinutos !== undefined &&
      props.duracaoMinutos !== null &&
      (!Number.isInteger(props.duracaoMinutos) || props.duracaoMinutos < 0)
    ) {
      throw new ValidationError('Duração em minutos não pode ser negativa');
    }

    this.id = props.id.trim();
    this.entradaFilaId = props.entradaFilaId.trim();
    this.profissionalChamadorId = props.profissionalChamadorId.trim();
    this.guicheSala = guicheLimpo;
    this.dataHoraChamada = props.dataHoraChamada ?? new Date();
    this.tentativa = tentativa;
    this.estado = props.estado ?? 'CHAMADO';
    this.dataHoraInicio = props.dataHoraInicio ?? null;
    this.dataHoraConclusao = props.dataHoraConclusao ?? null;
    this.duracaoMinutos = props.duracaoMinutos ?? null;
    this.motivoAusencia =
      props.motivoAusencia && props.motivoAusencia.trim().length > 0
        ? props.motivoAusencia.trim()
        : null;
  }

  public rechamar(agora: Date = new Date()): void {
    if (this.estado !== 'CHAMADO') {
      throw new ConflictError(
        `Não é possível rechamar a partir do estado ${this.estado}`
      );
    }
    this.tentativa += 1;
    this.dataHoraChamada = agora;
  }

  public iniciar(agora: Date = new Date()): void {
    if (this.estado !== 'CHAMADO') {
      throw new ConflictError(
        `Não é possível iniciar atendimento na chamada a partir do estado ${this.estado}`
      );
    }
    this.estado = 'EM_ATENDIMENTO';
    this.dataHoraInicio = agora;
  }

  public concluir(agora: Date = new Date()): void {
    if (this.estado !== 'EM_ATENDIMENTO') {
      throw new ConflictError(
        `Não é possível concluir chamada a partir do estado ${this.estado}`
      );
    }

    this.estado = 'CONCLUIDO';
    this.dataHoraConclusao = agora;
    if (this.dataHoraInicio) {
      const diffMs = agora.getTime() - this.dataHoraInicio.getTime();
      this.duracaoMinutos = Math.max(0, Math.round(diffMs / 60_000));
    } else {
      this.duracaoMinutos = 0;
    }
  }

  public marcarAusencia(motivo?: string, agora: Date = new Date()): void {
    if (this.estado !== 'CHAMADO' && this.estado !== 'EM_ATENDIMENTO') {
      throw new ConflictError(
        `Não é possível marcar ausência na chamada a partir do estado ${this.estado}`
      );
    }

    this.estado = 'NAO_ATENDIDO';
    this.dataHoraConclusao = agora;
    this.motivoAusencia =
      motivo && motivo.trim().length > 0 ? motivo.trim() : null;
  }

  public getId(): string {
    return this.id;
  }

  public getEntradaFilaId(): string {
    return this.entradaFilaId;
  }

  public getProfissionalChamadorId(): string {
    return this.profissionalChamadorId;
  }

  public getGuicheSala(): string {
    return this.guicheSala;
  }

  public getDataHoraChamada(): Date {
    return new Date(this.dataHoraChamada.getTime());
  }

  public getTentativa(): number {
    return this.tentativa;
  }

  public getEstado(): EstadoChamada {
    return this.estado;
  }

  public getDataHoraInicio(): Date | null {
    return this.dataHoraInicio ? new Date(this.dataHoraInicio.getTime()) : null;
  }

  public getDataHoraConclusao(): Date | null {
    return this.dataHoraConclusao
      ? new Date(this.dataHoraConclusao.getTime())
      : null;
  }

  public getDuracaoMinutos(): number | null {
    return this.duracaoMinutos;
  }

  public getMotivoAusencia(): string | null {
    return this.motivoAusencia;
  }
}
