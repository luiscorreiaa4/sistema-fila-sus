import { UnauthorizedError } from '../errors/UnauthorizedError';
import { ValidationError } from '../errors/ValidationError';
import { Cpf } from '../value-objects/Cpf';
import { Senha } from '../value-objects/Senha';

export type StatusCadastro = 'ATIVO' | 'INATIVO';

export interface UsuarioProps {
  id: string;
  cpf: Cpf;
  nomeCompleto: string;
  nomeSocial?: string | null;
  email?: string | null;
  celular?: string | null;
  senhaHash: Senha;
  status?: StatusCadastro;
  tentativasMalsucedidas?: number;
  bloqueioTemporarioAte?: Date | null;
  ultimoAcesso?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const LIMITE_TENTATIVAS_LOGIN = 5;
const MINUTOS_BLOQUEIO_LOGIN = 15;

/**
 * Classe base abstrata que encapsula identidade, credenciais e controle de bloqueio
 * compartilhados entre cidadãos (`Paciente`) e colaboradores (`Profissional`).
 */
export abstract class Usuario {
  protected readonly id: string;
  protected readonly cpf: Cpf;
  protected nomeCompleto: string;
  protected nomeSocial: string | null;
  protected email: string | null;
  protected celular: string | null;
  protected senhaHash: Senha;
  protected status: StatusCadastro;
  protected tentativasMalsucedidas: number;
  protected bloqueioTemporarioAte: Date | null;
  protected ultimoAcesso: Date | null;
  protected readonly createdAt: Date;
  protected updatedAt: Date;

  protected constructor(props: UsuarioProps) {
    if (!props.id || props.id.trim().length === 0) {
      throw new ValidationError('Identificador do usuário é obrigatório');
    }

    const nomeTrimmed = props.nomeCompleto?.trim() ?? '';
    if (nomeTrimmed.length < 3 || nomeTrimmed.length > 150) {
      throw new ValidationError(
        'Nome completo deve ter entre 3 e 150 caracteres'
      );
    }

    const emailNormalizado = Usuario.normalizarEmail(props.email);
    const celularNormalizado = Usuario.normalizarCelular(props.celular);
    const nomeSocialNormalizado =
      props.nomeSocial && props.nomeSocial.trim().length > 0
        ? props.nomeSocial.trim()
        : null;

    if (nomeSocialNormalizado && nomeSocialNormalizado.length > 150) {
      throw new ValidationError('Nome social deve ter no máximo 150 caracteres');
    }

    const tentativas = props.tentativasMalsucedidas ?? 0;
    if (!Number.isInteger(tentativas) || tentativas < 0) {
      throw new ValidationError(
        'Tentativas malsucedidas devem ser um inteiro não negativo'
      );
    }

    this.id = props.id.trim();
    this.cpf = props.cpf;
    this.nomeCompleto = nomeTrimmed;
    this.nomeSocial = nomeSocialNormalizado;
    this.email = emailNormalizado;
    this.celular = celularNormalizado;
    this.senhaHash = props.senhaHash;
    this.status = props.status ?? 'ATIVO';
    this.tentativasMalsucedidas = tentativas;
    this.bloqueioTemporarioAte = props.bloqueioTemporarioAte ?? null;
    this.ultimoAcesso = props.ultimoAcesso ?? null;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }

  protected static normalizarEmail(email?: string | null): string | null {
    if (!email || email.trim().length === 0) {
      return null;
    }

    const limpo = email.trim().toLowerCase();
    if (limpo.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpo)) {
      throw new ValidationError('E-mail inválido');
    }
    return limpo;
  }

  protected static normalizarCelular(celular?: string | null): string | null {
    if (!celular || celular.trim().length === 0) {
      return null;
    }

    const limpo = celular.trim();
    const digitos = limpo.replace(/\D/g, '');
    if (limpo.length > 20 || digitos.length < 10 || digitos.length > 13) {
      throw new ValidationError('Celular inválido');
    }
    return limpo;
  }

  /**
   * Retorna o nome social quando informado, preservando identidade de gênero e inclusão (SUS).
   */
  public obterNomeExibicao(): string {
    return this.nomeSocial && this.nomeSocial.trim().length > 0
      ? this.nomeSocial.trim()
      : this.nomeCompleto;
  }

  /**
   * Indica se o usuário cumpre bloqueio temporário por excesso de tentativas.
   */
  public estaBloqueado(agora: Date = new Date()): boolean {
    return (
      this.bloqueioTemporarioAte !== null &&
      this.bloqueioTemporarioAte.getTime() > agora.getTime()
    );
  }

  /**
   * Incrementa contador de falhas e aplica bloqueio de 15 minutos ao atingir 5 tentativas.
   */
  public registrarFalhaAutenticacao(agora: Date = new Date()): void {
    this.tentativasMalsucedidas += 1;
    if (this.tentativasMalsucedidas >= LIMITE_TENTATIVAS_LOGIN) {
      this.bloqueioTemporarioAte = new Date(
        agora.getTime() + MINUTOS_BLOQUEIO_LOGIN * 60 * 1000
      );
    }
    this.updatedAt = agora;
  }

  /**
   * Reseta contadores de falha e registra o instante do último acesso bem-sucedido.
   */
  public registrarSucessoAutenticacao(agora: Date = new Date()): void {
    if (this.estaBloqueado(agora)) {
      throw new UnauthorizedError(
        'Acesso temporariamente bloqueado por excesso de tentativas. Tente novamente em 15 minutos.',
        423
      );
    }

    if (!this.podeAutenticar()) {
      throw new UnauthorizedError('Usuário inativo ou sem permissão para autenticar');
    }

    this.tentativasMalsucedidas = 0;
    this.bloqueioTemporarioAte = null;
    this.ultimoAcesso = agora;
    this.updatedAt = agora;
  }

  /**
   * Verifica a credencial respeitando bloqueio temporário e atualizando o estado de tentativas.
   */
  public verificarCredencial(
    senhaPlana: string,
    agora: Date = new Date(),
    compareFn?: (plana: string, hash: string) => boolean
  ): boolean {
    if (this.estaBloqueado(agora)) {
      throw new UnauthorizedError(
        'Acesso temporariamente bloqueado por excesso de tentativas. Tente novamente em 15 minutos.',
        423
      );
    }

    if (!this.podeAutenticar()) {
      return false;
    }

    const senhaValida = this.senhaHash.comparar(senhaPlana, compareFn);
    if (!senhaValida) {
      this.registrarFalhaAutenticacao(agora);
      return false;
    }

    this.registrarSucessoAutenticacao(agora);
    return true;
  }

  public abstract obterPerfilAcesso(): string;
  public abstract podeAutenticar(): boolean;
  protected abstract validarRegrasEspecificas(): void;

  public getId(): string {
    return this.id;
  }

  public getCpf(): Cpf {
    return this.cpf;
  }

  public getNomeCompleto(): string {
    return this.nomeCompleto;
  }

  public getNomeSocial(): string | null {
    return this.nomeSocial;
  }

  public getEmail(): string | null {
    return this.email;
  }

  public getCelular(): string | null {
    return this.celular;
  }

  public getSenhaHash(): Senha {
    return this.senhaHash;
  }

  public getStatus(): StatusCadastro {
    return this.status;
  }

  public getTentativasMalsucedidas(): number {
    return this.tentativasMalsucedidas;
  }

  public getBloqueioTemporarioAte(): Date | null {
    return this.bloqueioTemporarioAte;
  }

  public getUltimoAcesso(): Date | null {
    return this.ultimoAcesso;
  }

  public getCreatedAt(): Date {
    return this.createdAt;
  }

  public getUpdatedAt(): Date {
    return this.updatedAt;
  }
}
