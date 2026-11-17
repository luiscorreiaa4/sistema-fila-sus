import { ConflictError } from '../errors/ConflictError';
import { ValidationError } from '../errors/ValidationError';
import { Usuario, UsuarioProps } from './Usuario';

export type NivelAcesso =
  | 'ATENDENTE'
  | 'PROFISSIONAL_SAUDE'
  | 'ADMINISTRADOR';
export type SituacaoAcesso = 'CONVITE_PENDENTE' | 'ATIVO' | 'BLOQUEADO';

export interface ProfissionalProps extends UsuarioProps {
  conselhoProfissional?: string | null;
  numeroRegistro?: string | null;
  ufRegistro?: string | null;
  nivelAcesso: NivelAcesso;
  situacaoAcesso?: SituacaoAcesso;
  unidadesVinculadas: string[];
  especialidades?: string[];
  motivoInativacao?: string | null;
}

/**
 * Entidade de domínio que representa o colaborador operacional ou de saúde vinculado às unidades.
 */
export class Profissional extends Usuario {
  private conselhoProfissional: string | null;
  private numeroRegistro: string | null;
  private ufRegistro: string | null;
  private nivelAcesso: NivelAcesso;
  private situacaoAcesso: SituacaoAcesso;
  private unidadesVinculadas: string[];
  private especialidades: string[];
  private motivoInativacao: string | null;

  constructor(props: ProfissionalProps) {
    super(props);

    this.conselhoProfissional =
      props.conselhoProfissional && props.conselhoProfissional.trim().length > 0
        ? props.conselhoProfissional.trim()
        : null;
    this.numeroRegistro =
      props.numeroRegistro && props.numeroRegistro.trim().length > 0
        ? props.numeroRegistro.trim()
        : null;
    this.ufRegistro =
      props.ufRegistro && props.ufRegistro.trim().length > 0
        ? props.ufRegistro.trim().toUpperCase()
        : null;
    this.nivelAcesso = props.nivelAcesso;
    this.situacaoAcesso = props.situacaoAcesso ?? 'ATIVO';
    this.unidadesVinculadas = Array.from(
      new Set(
        (props.unidadesVinculadas ?? [])
          .map((u) => u.trim())
          .filter((u) => u.length > 0)
      )
    );
    this.especialidades = Array.from(
      new Set(
        (props.especialidades ?? [])
          .map((e) => e.trim())
          .filter((e) => e.length > 0)
      )
    );
    this.motivoInativacao =
      props.motivoInativacao && props.motivoInativacao.trim().length > 0
        ? props.motivoInativacao.trim()
        : null;

    this.validarRegrasEspecificas();
  }

  protected validarRegrasEspecificas(): void {
    if (!this.email) {
      throw new ValidationError('E-mail do profissional é obrigatório');
    }

    if (this.unidadesVinculadas.length === 0) {
      throw new ValidationError(
        'Profissional deve estar vinculado a pelo menos uma unidade de saúde'
      );
    }

    if (this.ufRegistro && !/^[A-Z]{2}$/.test(this.ufRegistro)) {
      throw new ValidationError('UF de registro profissional inválida');
    }

    if (this.nivelAcesso === 'PROFISSIONAL_SAUDE') {
      if (!this.conselhoProfissional || !this.numeroRegistro || !this.ufRegistro) {
        throw new ValidationError(
          'Profissional de saúde exige conselho profissional, número de registro e UF'
        );
      }
      if (this.especialidades.length === 0) {
        throw new ValidationError(
          'Profissional de saúde exige pelo menos uma especialidade'
        );
      }
    }

    if (
      this.status === 'INATIVO' &&
      (!this.motivoInativacao || this.motivoInativacao.length < 5)
    ) {
      throw new ValidationError(
        'Profissional inativo exige motivo de inativação com pelo menos 5 caracteres'
      );
    }
  }

  public estaVinculadoAUnidade(unidadeId: string): boolean {
    return this.unidadesVinculadas.includes(unidadeId);
  }

  public podeGerenciarAgenda(): boolean {
    return (
      this.podeAutenticar() &&
      (this.nivelAcesso === 'ADMINISTRADOR' ||
        this.nivelAcesso === 'PROFISSIONAL_SAUDE')
    );
  }

  public podeChamarFila(): boolean {
    return (
      this.podeAutenticar() &&
      (this.nivelAcesso === 'ATENDENTE' ||
        this.nivelAcesso === 'PROFISSIONAL_SAUDE' ||
        this.nivelAcesso === 'ADMINISTRADOR')
    );
  }

  public inativar(motivo: string, executorId?: string): void {
    if (executorId && executorId === this.id) {
      throw new ConflictError('Administrador não pode inativar o próprio usuário');
    }

    const motivoLimpo = motivo?.trim() ?? '';
    if (motivoLimpo.length < 5) {
      throw new ValidationError(
        'Motivo de inativação deve ter pelo menos 5 caracteres'
      );
    }

    this.status = 'INATIVO';
    this.motivoInativacao = motivoLimpo;
    this.updatedAt = new Date();
  }

  public alterarNivelAcesso(novoNivel: NivelAcesso, executorId: string): void {
    if (executorId === this.id) {
      throw new ConflictError(
        'Usuário não pode alterar o próprio nível de acesso'
      );
    }

    const anterior = this.nivelAcesso;
    this.nivelAcesso = novoNivel;

    try {
      this.validarRegrasEspecificas();
    } catch (erro) {
      this.nivelAcesso = anterior;
      throw erro;
    }

    this.updatedAt = new Date();
  }

  public obterPerfilAcesso(): string {
    return this.nivelAcesso;
  }

  public podeAutenticar(): boolean {
    return this.status === 'ATIVO' && this.situacaoAcesso === 'ATIVO';
  }

  public getConselhoProfissional(): string | null {
    return this.conselhoProfissional;
  }

  public getNumeroRegistro(): string | null {
    return this.numeroRegistro;
  }

  public getUfRegistro(): string | null {
    return this.ufRegistro;
  }

  public getNivelAcesso(): NivelAcesso {
    return this.nivelAcesso;
  }

  public getSituacaoAcesso(): SituacaoAcesso {
    return this.situacaoAcesso;
  }

  public getUnidadesVinculadas(): string[] {
    return [...this.unidadesVinculadas];
  }

  public getEspecialidades(): string[] {
    return [...this.especialidades];
  }

  public getMotivoInativacao(): string | null {
    return this.motivoInativacao;
  }
}
