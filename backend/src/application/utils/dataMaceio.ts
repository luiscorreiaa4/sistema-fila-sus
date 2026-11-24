import { ValidationError } from '../../domain/errors/ValidationError';

const DESLOCAMENTO_MACEIO_MS = -3 * 60 * 60 * 1000;
const REGEX_DATA_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

export type TurnoAtendimento = 'MANHA' | 'TARDE' | 'NOITE';

export interface IntervaloDia {
  dataInicioDia: Date;
  dataFimDia: Date;
  dataIso: string;
}

/**
 * Retorna a hora (0..23) no fuso America/Maceio (-03:00).
 */
export function obterHoraMaceio(data: Date): number {
  const deslocado = new Date(data.getTime() + DESLOCAMENTO_MACEIO_MS);
  return deslocado.getUTCHours();
}

/**
 * Classifica o horário no turno de atendimento em America/Maceio (-03:00).
 */
export function obterTurnoMaceio(data: Date): TurnoAtendimento {
  const hora = obterHoraMaceio(data);
  if (hora < 12) return 'MANHA';
  if (hora < 18) return 'TARDE';
  return 'NOITE';
}

/**
 * Retorna a data ISO (`YYYY-MM-DD`) no fuso America/Maceio (-03:00).
 */
export function extrairDataIsoMaceio(data: Date): string {
  return obterIntervaloDiaMaceio(data).dataIso;
}

/**
 * Retorna os limites inicial e final do dia corrente no fuso America/Maceio (-03:00).
 */
export function obterIntervaloDiaMaceio(referencia: Date = new Date()): IntervaloDia {
  const deslocado = new Date(referencia.getTime() + DESLOCAMENTO_MACEIO_MS);
  const yyyy = String(deslocado.getUTCFullYear()).padStart(4, '0');
  const mm = String(deslocado.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(deslocado.getUTCDate()).padStart(2, '0');
  const dataIso = `${yyyy}-${mm}-${dd}`;

  return {
    dataIso,
    dataInicioDia: new Date(`${dataIso}T00:00:00.000-03:00`),
    dataFimDia: new Date(`${dataIso}T23:59:59.999-03:00`),
  };
}

/**
 * Converte uma data ISO (`YYYY-MM-DD`) no intervalo completo do dia em America/Maceio (-03:00).
 */
export function obterIntervaloDeDataIsoMaceio(dataIso: string): IntervaloDia {
  converterDataIsoParaDateUtc(dataIso);

  return {
    dataIso,
    dataInicioDia: new Date(`${dataIso}T00:00:00.000-03:00`),
    dataFimDia: new Date(`${dataIso}T23:59:59.999-03:00`),
  };
}

/**
 * Converte string `YYYY-MM-DD` para Date em 00:00:00.000Z validando a existência no calendário.
 */
export function converterDataIsoParaDateUtc(dataIso: string): Date {
  const match = REGEX_DATA_ISO.exec(dataIso?.trim() ?? '');
  if (!match) {
    throw new ValidationError('Data inválida: esperado formato YYYY-MM-DD');
  }

  const ano = Number(match[1]);
  const mes = Number(match[2]);
  const dia = Number(match[3]);
  const data = new Date(Date.UTC(ano, mes - 1, dia));

  if (
    Number.isNaN(data.getTime()) ||
    data.getUTCFullYear() !== ano ||
    data.getUTCMonth() !== mes - 1 ||
    data.getUTCDate() !== dia
  ) {
    throw new ValidationError(`Data inválida no calendário: ${dataIso}`);
  }

  return data;
}
