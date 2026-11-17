import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { ValidationError } from '../errors/ValidationError';

/**
 * Value Object imutável que encapsula regras de força e comparação de senha.
 */
export class Senha {
  private readonly hash: string;

  private constructor(hash: string) {
    this.hash = hash;
  }

  /**
   * Valida força da senha em texto plano: 8 a 64 caracteres, letras e números,
   * distinta do CPF e da data de nascimento.
   */
  public static validarForca(
    senhaPlana: string,
    cpf?: string,
    dataNascimento?: Date | string
  ): void {
    if (typeof senhaPlana !== 'string') {
      throw new ValidationError('Senha deve ter entre 8 e 64 caracteres');
    }

    if (senhaPlana.length < 8 || senhaPlana.length > 64) {
      throw new ValidationError('Senha deve ter entre 8 e 64 caracteres');
    }

    const senhaTrimmed = senhaPlana.trim();
    const senhaDigitos = senhaPlana.replace(/\D/g, '');

    if (cpf) {
      const cpfLimpo = cpf.replace(/\D/g, '');
      if (
        senhaTrimmed === cpf.trim() ||
        (cpfLimpo.length === 11 &&
          (senhaTrimmed === cpfLimpo || senhaDigitos === cpfLimpo))
      ) {
        throw new ValidationError('Senha não pode ser igual ao CPF');
      }
    }

    if (dataNascimento) {
      const { formatosTexto, formatosNumericos } =
        Senha.extrairCandidatosDataNascimento(dataNascimento);

      if (
        formatosTexto.has(senhaTrimmed) ||
        (senhaDigitos.length === 8 && formatosNumericos.has(senhaDigitos))
      ) {
        throw new ValidationError(
          'Senha não pode coincidir com a data de nascimento'
        );
      }
    }

    if (!/[a-zA-Z]/.test(senhaPlana) || !/[0-9]/.test(senhaPlana)) {
      throw new ValidationError(
        'Senha deve conter ao menos uma letra e um número'
      );
    }
  }

  /**
   * Valida a senha plana e gera um `Senha` com função de hash injetável (ou `scrypt` nativo).
   */
  public static criarDeTextoPlano(
    senhaPlana: string,
    cpf?: string,
    dataNascimento?: Date | string,
    hashFn?: (plana: string) => string
  ): Senha {
    Senha.validarForca(senhaPlana, cpf, dataNascimento);

    if (hashFn) {
      const hashGerado = hashFn(senhaPlana);
      if (!hashGerado || hashGerado.trim().length === 0) {
        throw new ValidationError('Hash de senha inválido');
      }
      return new Senha(hashGerado);
    }

    const salt = randomBytes(16).toString('hex');
    const derivedKey = scryptSync(senhaPlana, salt, 64).toString('hex');
    return new Senha(`scrypt$${salt}$${derivedKey}`);
  }

  /**
   * Reconstitui o Value Object a partir de um hash já persistido.
   */
  public static deHash(hash: string): Senha {
    if (typeof hash !== 'string' || hash.trim().length === 0) {
      throw new ValidationError('Hash de senha inválido');
    }
    return new Senha(hash);
  }

  /**
   * Compara uma senha em texto plano contra o hash encapsulado.
   */
  public comparar(
    senhaPlana: string,
    compareFn?: (plana: string, hash: string) => boolean
  ): boolean {
    if (typeof senhaPlana !== 'string') {
      return false;
    }

    if (compareFn) {
      return compareFn(senhaPlana, this.hash);
    }

    if (!this.hash.startsWith('scrypt$')) {
      return false;
    }

    const partes = this.hash.split('$');
    if (partes.length !== 3 || !partes[1] || !partes[2]) {
      return false;
    }

    const [, salt, hashHex] = partes;
    const esperado = Buffer.from(hashHex, 'hex');
    const derivado = scryptSync(senhaPlana, salt, 64);

    if (esperado.length !== derivado.length) {
      return false;
    }

    return timingSafeEqual(esperado, derivado);
  }

  public getHash(): string {
    return this.hash;
  }

  private static extrairCandidatosDataNascimento(dataNascimento: Date | string): {
    formatosTexto: Set<string>;
    formatosNumericos: Set<string>;
  } {
    const formatosTexto = new Set<string>();
    const formatosNumericos = new Set<string>();

    const adicionarPartes = (dia: number, mes: number, ano: number) => {
      const dd = String(dia).padStart(2, '0');
      const mm = String(mes).padStart(2, '0');
      const aaaa = String(ano).padStart(4, '0');

      const ddmmaaaa = `${dd}${mm}${aaaa}`;
      const aaaammdd = `${aaaa}${mm}${dd}`;

      formatosNumericos.add(ddmmaaaa);
      formatosNumericos.add(aaaammdd);

      formatosTexto.add(ddmmaaaa);
      formatosTexto.add(aaaammdd);
      formatosTexto.add(`${dd}/${mm}/${aaaa}`);
      formatosTexto.add(`${aaaa}-${mm}-${dd}`);
      formatosTexto.add(`${dd}-${mm}-${aaaa}`);
    };

    if (dataNascimento instanceof Date) {
      if (!Number.isNaN(dataNascimento.getTime())) {
        adicionarPartes(
          dataNascimento.getUTCDate(),
          dataNascimento.getUTCMonth() + 1,
          dataNascimento.getUTCFullYear()
        );
        adicionarPartes(
          dataNascimento.getDate(),
          dataNascimento.getMonth() + 1,
          dataNascimento.getFullYear()
        );
      }
      return { formatosTexto, formatosNumericos };
    }

    const bruto = dataNascimento.trim();
    const matchIso = /^(\d{4})-(\d{2})-(\d{2})/.exec(bruto);
    if (matchIso) {
      adicionarPartes(
        Number(matchIso[3]),
        Number(matchIso[2]),
        Number(matchIso[1])
      );
      return { formatosTexto, formatosNumericos };
    }

    const matchBr = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(bruto);
    if (matchBr) {
      adicionarPartes(
        Number(matchBr[1]),
        Number(matchBr[2]),
        Number(matchBr[3])
      );
      return { formatosTexto, formatosNumericos };
    }

    const parsed = new Date(bruto);
    if (!Number.isNaN(parsed.getTime())) {
      adicionarPartes(
        parsed.getUTCDate(),
        parsed.getUTCMonth() + 1,
        parsed.getUTCFullYear()
      );
      adicionarPartes(
        parsed.getDate(),
        parsed.getMonth() + 1,
        parsed.getFullYear()
      );
    }

    return { formatosTexto, formatosNumericos };
  }
}
