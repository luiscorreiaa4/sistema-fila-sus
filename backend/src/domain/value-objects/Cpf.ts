import { ValidationError } from '../errors/ValidationError';

/**
 * Value Object imutável que representa um CPF válido segundo o algoritmo da Receita Federal.
 */
export class Cpf {
  private readonly valor: string;

  private constructor(valor: string) {
    this.valor = valor;
  }

  /**
   * Normaliza, valida e instancia um `Cpf`.
   */
  public static criar(raw: string): Cpf {
    if (typeof raw !== 'string') {
      throw new ValidationError('CPF inválido');
    }

    const limpo = raw.replace(/\D/g, '');

    if (limpo.length !== 11 || /^(\d)\1{10}$/.test(limpo)) {
      throw new ValidationError('CPF inválido');
    }

    const dv1 = Cpf.calcularDigitoVerificador(limpo.slice(0, 9), 10);
    const dv2 = Cpf.calcularDigitoVerificador(limpo.slice(0, 10), 11);

    if (dv1 !== Number(limpo[9]) || dv2 !== Number(limpo[10])) {
      throw new ValidationError('CPF inválido');
    }

    return new Cpf(limpo);
  }

  private static calcularDigitoVerificador(base: string, pesoInicial: number): number {
    let soma = 0;
    for (let i = 0; i < base.length; i += 1) {
      soma += Number(base[i]) * (pesoInicial - i);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  }

  public getValor(): string {
    return this.valor;
  }

  public formatado(): string {
    return this.valor.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  public equals(outro: Cpf): boolean {
    return this.valor === outro.valor;
  }

  public toString(): string {
    return this.valor;
  }
}
