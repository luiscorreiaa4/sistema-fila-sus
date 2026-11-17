import { ValidationError } from '../errors/ValidationError';

/**
 * Value Object imutável que representa o Cartão Nacional de Saúde (CNS)
 * validado pelo algoritmo oficial do Ministério da Saúde (DATASUS).
 */
export class Cns {
  private readonly valor: string;

  private constructor(valor: string) {
    this.valor = valor;
  }

  /**
   * Normaliza, valida e instancia um `Cns` definitivo (início 1 ou 2) ou provisório (início 7, 8 ou 9).
   */
  public static criar(raw: string): Cns {
    if (typeof raw !== 'string') {
      throw new ValidationError('CNS inválido');
    }

    const limpo = raw.replace(/\D/g, '');

    if (limpo.length !== 15 || /^(\d)\1{14}$/.test(limpo)) {
      throw new ValidationError('CNS inválido');
    }

    const primeiroDigito = limpo[0];

    if (primeiroDigito === '1' || primeiroDigito === '2') {
      if (!Cns.validarDefinitivo(limpo)) {
        throw new ValidationError('CNS inválido');
      }
      return new Cns(limpo);
    }

    if (primeiroDigito === '7' || primeiroDigito === '8' || primeiroDigito === '9') {
      if (!Cns.validarProvisorio(limpo)) {
        throw new ValidationError('CNS inválido');
      }
      return new Cns(limpo);
    }

    throw new ValidationError('CNS inválido');
  }

  private static validarDefinitivo(limpo: string): boolean {
    const pis = limpo.slice(0, 11);
    let soma = 0;

    for (let i = 0; i < 11; i += 1) {
      soma += Number(pis[i]) * (15 - i);
    }

    const resto = soma % 11;
    let dv = 11 - resto;
    if (dv === 11) {
      dv = 0;
    }

    let resultado: string;
    if (dv === 10) {
      const somaAjustada = soma + 2;
      const restoAjustado = somaAjustada % 11;
      let dvAjustado = 11 - restoAjustado;
      if (dvAjustado === 11) {
        dvAjustado = 0;
      }
      resultado = `${pis}001${dvAjustado}`;
    } else {
      resultado = `${pis}000${dv}`;
    }

    return limpo === resultado;
  }

  private static validarProvisorio(limpo: string): boolean {
    let soma = 0;
    for (let i = 0; i < 15; i += 1) {
      soma += Number(limpo[i]) * (15 - i);
    }
    return soma % 11 === 0;
  }

  public getValor(): string {
    return this.valor;
  }

  public ehDefinitivo(): boolean {
    return this.valor[0] === '1' || this.valor[0] === '2';
  }

  public ehProvisorio(): boolean {
    return this.valor[0] === '7' || this.valor[0] === '8' || this.valor[0] === '9';
  }

  public equals(outro: Cns): boolean {
    return this.valor === outro.valor;
  }

  public toString(): string {
    return this.valor;
  }
}
