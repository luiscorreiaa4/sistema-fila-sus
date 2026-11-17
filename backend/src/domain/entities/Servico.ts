import { ConflictError } from '../errors/ConflictError';
import { ValidationError } from '../errors/ValidationError';

export type CategoriaServico = 'CONSULTA' | 'PROCEDIMENTO' | 'CIRURGIA';
export type ModoAcessoServico = 'DIRETO' | 'REGULADO';
export type StatusServico = 'ATIVO' | 'INATIVO';

export interface ServicoProps {
  id: string;
  nome: string;
  categoria: CategoriaServico;
  especialidade: string;
  modoAcesso?: ModoAcessoServico;
  orientacoesPreparo?: string | null;
  status?: StatusServico;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Entidade de domínio que representa um serviço clínico, procedimento ou especialidade ofertada.
 */
export class Servico {
  private readonly id: string;
  private nome: string;
  private readonly categoria: CategoriaServico;
  private especialidade: string;
  private readonly modoAcesso: ModoAcessoServico;
  private orientacoesPreparo: string | null;
  private status: StatusServico;
  private readonly createdAt: Date;
  private updatedAt: Date;

  constructor(props: ServicoProps) {
    if (!props.id || props.id.trim().length === 0) {
      throw new ValidationError('Identificador do serviço é obrigatório');
    }

    const nomeTrimmed = props.nome?.trim() ?? '';
    if (nomeTrimmed.length < 3 || nomeTrimmed.length > 150) {
      throw new ValidationError(
        'Nome do serviço deve ter entre 3 e 150 caracteres'
      );
    }

    const especialidadeTrimmed = props.especialidade?.trim() ?? '';
    if (especialidadeTrimmed.length < 2 || especialidadeTrimmed.length > 100) {
      throw new ValidationError(
        'Especialidade do serviço deve ter entre 2 e 100 caracteres'
      );
    }

    this.id = props.id.trim();
    this.nome = nomeTrimmed;
    this.categoria = props.categoria;
    this.especialidade = especialidadeTrimmed;
    this.modoAcesso = props.modoAcesso ?? 'DIRETO';
    this.orientacoesPreparo =
      props.orientacoesPreparo && props.orientacoesPreparo.trim().length > 0
        ? props.orientacoesPreparo.trim()
        : null;
    this.status = props.status ?? 'ATIVO';
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }

  public inativar(): void {
    if (this.status === 'INATIVO') {
      throw new ConflictError('Serviço já está inativo');
    }
    this.status = 'INATIVO';
    this.updatedAt = new Date();
  }

  public ativar(): void {
    this.status = 'ATIVO';
    this.updatedAt = new Date();
  }

  public estaAtivo(): boolean {
    return this.status === 'ATIVO';
  }

  public getId(): string {
    return this.id;
  }

  public getNome(): string {
    return this.nome;
  }

  public getCategoria(): CategoriaServico {
    return this.categoria;
  }

  public getEspecialidade(): string {
    return this.especialidade;
  }

  public getModoAcesso(): ModoAcessoServico {
    return this.modoAcesso;
  }

  public getOrientacoesPreparo(): string | null {
    return this.orientacoesPreparo;
  }

  public getStatus(): StatusServico {
    return this.status;
  }

  public getCreatedAt(): Date {
    return this.createdAt;
  }

  public getUpdatedAt(): Date {
    return this.updatedAt;
  }
}
