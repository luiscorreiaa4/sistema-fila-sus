import { randomUUID } from 'node:crypto';
import { ConflictError } from '../errors/ConflictError';
import { ValidationError } from '../errors/ValidationError';
import { VagaAgenda } from './VagaAgenda';

export type SituacaoAgenda =
  | 'RASCUNHO'
  | 'PUBLICADA'
  | 'BLOQUEADA'
  | 'ENCERRADA';

export interface ConfiguracaoDiaHorario {
  diaSemana: number;
  horarios: string[];
}

export interface AgendaProps {
  id: string;
  unidadeId: string;
  servicoId: string;
  profissionalId?: string | null;
  dataInicio: Date;
  dataFim: Date;
  diasHorarios: ConfiguracaoDiaHorario[];
  capacidadePorHorario: number;
  situacao?: SituacaoAgenda;
  createdAt?: Date;
  updatedAt?: Date;
}

const REGEX_HORARIO = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Entidade de domínio responsável pela programação periódica e materialização de vagas.
 */
export class Agenda {
  private readonly id: string;
  private readonly unidadeId: string;
  private readonly servicoId: string;
  private readonly profissionalId: string | null;
  private readonly dataInicio: Date;
  private readonly dataFim: Date;
  private readonly diasHorarios: ConfiguracaoDiaHorario[];
  private readonly capacidadePorHorario: number;
  private situacao: SituacaoAgenda;
  private readonly createdAt: Date;
  private updatedAt: Date;

  constructor(props: AgendaProps) {
    if (!props.id || props.id.trim().length === 0) {
      throw new ValidationError('Identificador da agenda é obrigatório');
    }
    if (!props.unidadeId || props.unidadeId.trim().length === 0) {
      throw new ValidationError('Unidade de saúde é obrigatória na agenda');
    }
    if (!props.servicoId || props.servicoId.trim().length === 0) {
      throw new ValidationError('Serviço é obrigatório na agenda');
    }

    if (
      !(props.dataInicio instanceof Date) ||
      Number.isNaN(props.dataInicio.getTime()) ||
      !(props.dataFim instanceof Date) ||
      Number.isNaN(props.dataFim.getTime())
    ) {
      throw new ValidationError('Período da agenda inválido');
    }

    const inicioUtc = Date.UTC(
      props.dataInicio.getUTCFullYear(),
      props.dataInicio.getUTCMonth(),
      props.dataInicio.getUTCDate()
    );
    const fimUtc = Date.UTC(
      props.dataFim.getUTCFullYear(),
      props.dataFim.getUTCMonth(),
      props.dataFim.getUTCDate()
    );

    if (fimUtc < inicioUtc) {
      throw new ValidationError(
        'Data final da agenda não pode ser anterior à data inicial'
      );
    }

    if (
      !Number.isInteger(props.capacidadePorHorario) ||
      props.capacidadePorHorario <= 0
    ) {
      throw new ValidationError(
        'Capacidade por horário deve ser maior que zero'
      );
    }

    if (!Array.isArray(props.diasHorarios) || props.diasHorarios.length === 0) {
      throw new ValidationError(
        'Agenda deve possuir pelo menos um dia e horário configurado'
      );
    }

    const diasValidados: ConfiguracaoDiaHorario[] = props.diasHorarios.map(
      (item) => {
        if (
          !Number.isInteger(item.diaSemana) ||
          item.diaSemana < 0 ||
          item.diaSemana > 6
        ) {
          throw new ValidationError('Dia da semana inválido (esperado 0 a 6)');
        }
        if (!Array.isArray(item.horarios) || item.horarios.length === 0) {
          throw new ValidationError(
            'Cada dia configurado deve informar ao menos um horário'
          );
        }
        const horariosUnicos = Array.from(
          new Set(item.horarios.map((h) => h.trim()))
        );
        for (const horario of horariosUnicos) {
          if (!REGEX_HORARIO.test(horario)) {
            throw new ValidationError(`Horário inválido: ${horario}`);
          }
        }
        return {
          diaSemana: item.diaSemana,
          horarios: horariosUnicos.sort(),
        };
      }
    );

    this.id = props.id.trim();
    this.unidadeId = props.unidadeId.trim();
    this.servicoId = props.servicoId.trim();
    this.profissionalId =
      props.profissionalId && props.profissionalId.trim().length > 0
        ? props.profissionalId.trim()
        : null;
    this.dataInicio = new Date(inicioUtc);
    this.dataFim = new Date(fimUtc);
    this.diasHorarios = diasValidados;
    this.capacidadePorHorario = props.capacidadePorHorario;
    this.situacao = props.situacao ?? 'RASCUNHO';
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }

  /**
   * Publica a agenda e materializa os objetos `VagaAgenda` para o intervalo configurado.
   */
  public publicar(
    fusoOffset = '-03:00',
    gerarId: () => string = randomUUID
  ): VagaAgenda[] {
    if (this.situacao === 'ENCERRADA') {
      throw new ConflictError('Não é possível publicar uma agenda encerrada');
    }
    if (this.situacao === 'PUBLICADA') {
      throw new ConflictError('Agenda já está publicada');
    }

    const vagas: VagaAgenda[] = [];
    const timestampsVistos = new Set<number>();
    const inicioMs = this.dataInicio.getTime();
    const fimMs = this.dataFim.getTime();
    const umDiaMs = 24 * 60 * 60 * 1000;

    for (let ts = inicioMs; ts <= fimMs; ts += umDiaMs) {
      const dataDia = new Date(ts);
      const diaSemana = dataDia.getUTCDay();
      const configuracoesDoDia = this.diasHorarios.filter(
        (cfg) => cfg.diaSemana === diaSemana
      );

      if (configuracoesDoDia.length === 0) {
        continue;
      }

      const yyyy = String(dataDia.getUTCFullYear()).padStart(4, '0');
      const mm = String(dataDia.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(dataDia.getUTCDate()).padStart(2, '0');

      for (const cfg of configuracoesDoDia) {
        for (const horario of cfg.horarios) {
          const iso =
            fusoOffset === 'Z'
              ? `${yyyy}-${mm}-${dd}T${horario}:00Z`
              : `${yyyy}-${mm}-${dd}T${horario}:00${fusoOffset}`;
          const dataHoraInicio = new Date(iso);

          if (Number.isNaN(dataHoraInicio.getTime())) {
            throw new ValidationError(
              `Fuso ou horário inválido ao materializar vaga: ${iso}`
            );
          }

          const epoch = dataHoraInicio.getTime();
          if (timestampsVistos.has(epoch)) {
            continue;
          }
          timestampsVistos.add(epoch);

          vagas.push(
            new VagaAgenda({
              id: gerarId(),
              agendaId: this.id,
              dataHoraInicio,
              capacidadeTotal: this.capacidadePorHorario,
              vagasOcupadas: 0,
            })
          );
        }
      }
    }

    vagas.sort(
      (a, b) =>
        a.getDataHoraInicio().getTime() - b.getDataHoraInicio().getTime()
    );

    this.situacao = 'PUBLICADA';
    this.updatedAt = new Date();
    return vagas;
  }

  public bloquear(): void {
    if (this.situacao === 'ENCERRADA') {
      throw new ConflictError('Não é possível bloquear uma agenda encerrada');
    }
    this.situacao = 'BLOQUEADA';
    this.updatedAt = new Date();
  }

  public encerrar(): void {
    if (this.situacao === 'ENCERRADA') {
      throw new ConflictError('Agenda já está encerrada');
    }
    this.situacao = 'ENCERRADA';
    this.updatedAt = new Date();
  }

  public estaPublicada(): boolean {
    return this.situacao === 'PUBLICADA';
  }

  public getId(): string {
    return this.id;
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

  public getDataInicio(): Date {
    return new Date(this.dataInicio.getTime());
  }

  public getDataFim(): Date {
    return new Date(this.dataFim.getTime());
  }

  public getDiasHorarios(): ConfiguracaoDiaHorario[] {
    return this.diasHorarios.map((d) => ({
      diaSemana: d.diaSemana,
      horarios: [...d.horarios],
    }));
  }

  public getCapacidadePorHorario(): number {
    return this.capacidadePorHorario;
  }

  public getSituacao(): SituacaoAgenda {
    return this.situacao;
  }

  public getCreatedAt(): Date {
    return this.createdAt;
  }

  public getUpdatedAt(): Date {
    return this.updatedAt;
  }
}
