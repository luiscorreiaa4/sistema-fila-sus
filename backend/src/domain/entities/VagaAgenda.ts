import { ConflictError } from '../errors/ConflictError';
import { ValidationError } from '../errors/ValidationError';

export interface VagaAgendaProps {
  id: string;
  agendaId: string;
  dataHoraInicio: Date;
  capacidadeTotal: number;
  vagasOcupadas?: number;
}

/**
 * Entidade de domínio que representa um horário materializado de atendimento com controle de ocupação.
 */
export class VagaAgenda {
  private readonly id: string;
  private readonly agendaId: string;
  private readonly dataHoraInicio: Date;
  private readonly capacidadeTotal: number;
  private vagasOcupadas: number;

  constructor(props: VagaAgendaProps) {
    if (!props.id || props.id.trim().length === 0) {
      throw new ValidationError('Identificador da vaga é obrigatório');
    }
    if (!props.agendaId || props.agendaId.trim().length === 0) {
      throw new ValidationError('Identificador da agenda é obrigatório');
    }
    if (
      !(props.dataHoraInicio instanceof Date) ||
      Number.isNaN(props.dataHoraInicio.getTime())
    ) {
      throw new ValidationError('Data e hora da vaga inválidas');
    }

    if (
      !Number.isInteger(props.capacidadeTotal) ||
      props.capacidadeTotal <= 0
    ) {
      throw new ValidationError('Capacidade total da vaga deve ser maior que zero');
    }

    const ocupadas = props.vagasOcupadas ?? 0;
    if (
      !Number.isInteger(ocupadas) ||
      ocupadas < 0 ||
      ocupadas > props.capacidadeTotal
    ) {
      throw new ValidationError(
        'Vagas ocupadas deve estar entre 0 e a capacidade total'
      );
    }

    this.id = props.id.trim();
    this.agendaId = props.agendaId.trim();
    this.dataHoraInicio = new Date(props.dataHoraInicio.getTime());
    this.capacidadeTotal = props.capacidadeTotal;
    this.vagasOcupadas = ocupadas;
  }

  public temDisponibilidade(): boolean {
    return this.vagasOcupadas < this.capacidadeTotal;
  }

  public vagasDisponiveis(): number {
    return this.capacidadeTotal - this.vagasOcupadas;
  }

  public reservar(): void {
    if (!this.temDisponibilidade()) {
      throw new ConflictError('Não há mais vagas disponíveis para este horário');
    }
    this.vagasOcupadas += 1;
  }

  public liberar(): void {
    if (this.vagasOcupadas <= 0) {
      throw new ConflictError('Não há vagas ocupadas para liberar');
    }
    this.vagasOcupadas -= 1;
  }

  public getId(): string {
    return this.id;
  }

  public getAgendaId(): string {
    return this.agendaId;
  }

  public getDataHoraInicio(): Date {
    return new Date(this.dataHoraInicio.getTime());
  }

  public getCapacidadeTotal(): number {
    return this.capacidadeTotal;
  }

  public getVagasOcupadas(): number {
    return this.vagasOcupadas;
  }
}
