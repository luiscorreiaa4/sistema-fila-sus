import { ConflictError } from '../errors/ConflictError';
import { ValidationError } from '../errors/ValidationError';
import { Endereco, validarENormalizarEndereco } from './Endereco';

export type StatusUnidade = 'ATIVA' | 'INATIVA';

export interface UnidadeSaudeProps {
  id: string;
  cnes?: string | null;
  cnpj: string;
  nome: string;
  telefone?: string | null;
  email?: string | null;
  endereco: Endereco;
  fusoHorario?: string;
  status?: StatusUnidade;
  motivoInativacao?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Entidade de domínio que representa uma Unidade de Saúde do SUS (UBS, UPA, Policlínica, etc.).
 */
export class UnidadeSaude {
  private readonly id: string;
  private readonly cnes: string | null;
  private readonly cnpj: string;
  private nome: string;
  private telefone: string | null;
  private email: string | null;
  private endereco: Endereco;
  private readonly fusoHorario: string;
  private status: StatusUnidade;
  private motivoInativacao: string | null;
  private readonly createdAt: Date;
  private updatedAt: Date;

  constructor(props: UnidadeSaudeProps) {
    if (!props.id || props.id.trim().length === 0) {
      throw new ValidationError('Identificador da unidade é obrigatório');
    }

    const nomeTrimmed = props.nome?.trim() ?? '';
    if (nomeTrimmed.length < 3 || nomeTrimmed.length > 150) {
      throw new ValidationError(
        'Nome da unidade deve ter entre 3 e 150 caracteres'
      );
    }

    const cnesNormalizado = UnidadeSaude.normalizarEValidarCnes(props.cnes);
    const cnpjNormalizado = UnidadeSaude.normalizarEValidarCnpj(props.cnpj);
    const enderecoNormalizado = validarENormalizarEndereco(props.endereco);

    const emailNormalizado =
      props.email && props.email.trim().length > 0
        ? props.email.trim().toLowerCase()
        : null;
    if (
      emailNormalizado &&
      (emailNormalizado.length > 150 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalizado))
    ) {
      throw new ValidationError('E-mail da unidade inválido');
    }

    const telefoneNormalizado =
      props.telefone && props.telefone.trim().length > 0
        ? props.telefone.trim()
        : null;
    if (telefoneNormalizado && telefoneNormalizado.length > 20) {
      throw new ValidationError('Telefone da unidade inválido');
    }

    const fuso = props.fusoHorario?.trim() || 'America/Maceio';
    const status = props.status ?? 'ATIVA';
    const motivo =
      props.motivoInativacao && props.motivoInativacao.trim().length > 0
        ? props.motivoInativacao.trim()
        : null;

    if (status === 'INATIVA' && (!motivo || motivo.length < 5)) {
      throw new ValidationError(
        'Unidade inativa exige motivo de inativação com pelo menos 5 caracteres'
      );
    }

    this.id = props.id.trim();
    this.cnes = cnesNormalizado;
    this.cnpj = cnpjNormalizado;
    this.nome = nomeTrimmed;
    this.telefone = telefoneNormalizado;
    this.email = emailNormalizado;
    this.endereco = enderecoNormalizado;
    this.fusoHorario = fuso;
    this.status = status;
    this.motivoInativacao = motivo;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }

  private static normalizarEValidarCnes(cnes?: string | null): string | null {
    if (!cnes || cnes.trim().length === 0) {
      return null;
    }

    const limpo = cnes.replace(/\D/g, '');
    if (!/^\d{7}$/.test(limpo)) {
      throw new ValidationError('CNES inválido: deve conter exatamente 7 dígitos');
    }
    return limpo;
  }

  private static normalizarEValidarCnpj(raw: string): string {
    if (typeof raw !== 'string') {
      throw new ValidationError('CNPJ inválido');
    }

    const limpo = raw.replace(/\D/g, '');
    if (limpo.length !== 14 || /^(\d)\1{13}$/.test(limpo)) {
      throw new ValidationError('CNPJ inválido');
    }

    const dv1 = UnidadeSaude.calcularDigitoCnpj(limpo.slice(0, 12));
    const dv2 = UnidadeSaude.calcularDigitoCnpj(limpo.slice(0, 13));

    if (dv1 !== Number(limpo[12]) || dv2 !== Number(limpo[13])) {
      throw new ValidationError('CNPJ inválido');
    }

    return limpo;
  }

  private static calcularDigitoCnpj(base: string): number {
    const pesos =
      base.length === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

    let soma = 0;
    for (let i = 0; i < base.length; i += 1) {
      soma += Number(base[i]) * pesos[i];
    }

    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  }

  public inativar(motivo: string): void {
    if (this.status === 'INATIVA') {
      throw new ConflictError('Unidade de saúde já está inativa');
    }

    const motivoLimpo = motivo?.trim() ?? '';
    if (motivoLimpo.length < 5) {
      throw new ValidationError(
        'Motivo de inativação deve ter pelo menos 5 caracteres'
      );
    }

    this.status = 'INATIVA';
    this.motivoInativacao = motivoLimpo;
    this.updatedAt = new Date();
  }

  public aceitaAgendas(): boolean {
    return this.status === 'ATIVA';
  }

  public getId(): string {
    return this.id;
  }

  public getCnes(): string | null {
    return this.cnes;
  }

  public getCnpj(): string {
    return this.cnpj;
  }

  public getNome(): string {
    return this.nome;
  }

  public getTelefone(): string | null {
    return this.telefone;
  }

  public getEmail(): string | null {
    return this.email;
  }

  public getEndereco(): Endereco {
    return { ...this.endereco };
  }

  public getFusoHorario(): string {
    return this.fusoHorario;
  }

  public getStatus(): StatusUnidade {
    return this.status;
  }

  public getMotivoInativacao(): string | null {
    return this.motivoInativacao;
  }

  public getCreatedAt(): Date {
    return this.createdAt;
  }

  public getUpdatedAt(): Date {
    return this.updatedAt;
  }
}
