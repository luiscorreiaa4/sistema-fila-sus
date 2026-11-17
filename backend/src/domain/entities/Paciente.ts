import { ValidationError } from '../errors/ValidationError';
import { Cns } from '../value-objects/Cns';
import { Endereco, validarENormalizarEndereco } from './Endereco';
import { Usuario, UsuarioProps } from './Usuario';

export type PossuiDeficiencia = 'SIM' | 'NAO' | 'PREFIRO_NAO_INFORMAR';
export type TipoDeficiencia =
  | 'FISICA'
  | 'AUDITIVA'
  | 'VISUAL'
  | 'INTELECTUAL'
  | 'PSICOSSOCIAL'
  | 'TEA';
export type SituacaoCns = 'PENDENTE_CONFIRMACAO' | 'CONFIRMADO' | 'DIVERGENTE';
export type OrigemCadastro = 'AUTOATENDIMENTO' | 'ASSISTIDO';
export type CriterioPrioridade = 'IDOSO_60_MAIS' | 'PCD' | 'AMBOS' | 'PADRAO';
export type GrupoAtendimentoPaciente = 'PRIORITARIO' | 'COMUM';

const TIPOS_DEFICIENCIA_VALIDOS: ReadonlySet<string> = new Set([
  'FISICA',
  'AUDITIVA',
  'VISUAL',
  'INTELECTUAL',
  'PSICOSSOCIAL',
  'TEA',
]);

export interface PacienteProps extends UsuarioProps {
  cns: Cns;
  dataNascimento: Date;
  possuiDeficiencia?: PossuiDeficiencia;
  tiposDeficiencia?: TipoDeficiencia[];
  preferenciasAcessibilidade?: string | null;
  endereco: Endereco;
  celularWhatsapp?: boolean;
  cienciaPrivacidadeEm: Date;
  situacaoCns?: SituacaoCns;
  origemCadastro?: OrigemCadastro;
}

export interface AtualizacaoCadastralPaciente {
  nomeSocial?: string | null;
  email?: string | null;
  celular?: string | null;
  celularWhatsapp?: boolean;
  possuiDeficiencia?: PossuiDeficiencia;
  tiposDeficiencia?: TipoDeficiencia[];
  preferenciasAcessibilidade?: string | null;
  endereco?: Endereco;
}

/**
 * Entidade de domínio que representa o cidadão usuário do SUS.
 */
export class Paciente extends Usuario {
  private readonly cns: Cns;
  private readonly dataNascimento: Date;
  private possuiDeficiencia: PossuiDeficiencia;
  private tiposDeficiencia: TipoDeficiencia[];
  private preferenciasAcessibilidade: string | null;
  private endereco: Endereco;
  private celularWhatsapp: boolean;
  private readonly cienciaPrivacidadeEm: Date;
  private situacaoCns: SituacaoCns;
  private readonly origemCadastro: OrigemCadastro;

  constructor(props: PacienteProps) {
    super(props);

    this.cns = props.cns;
    this.dataNascimento = props.dataNascimento;
    this.possuiDeficiencia = props.possuiDeficiencia ?? 'NAO';
    this.tiposDeficiencia = [...(props.tiposDeficiencia ?? [])];
    this.preferenciasAcessibilidade =
      props.preferenciasAcessibilidade &&
      props.preferenciasAcessibilidade.trim().length > 0
        ? props.preferenciasAcessibilidade.trim()
        : null;
    this.endereco = validarENormalizarEndereco(props.endereco);
    this.celularWhatsapp = props.celularWhatsapp ?? false;
    this.cienciaPrivacidadeEm = props.cienciaPrivacidadeEm;
    this.situacaoCns = props.situacaoCns ?? 'PENDENTE_CONFIRMACAO';
    this.origemCadastro = props.origemCadastro ?? 'AUTOATENDIMENTO';

    this.validarRegrasEspecificas();
  }

  protected validarRegrasEspecificas(): void {
    if (!this.email && !this.celular) {
      throw new ValidationError(
        'Paciente deve possuir pelo menos um contato: e-mail ou celular'
      );
    }

    if (
      !(this.dataNascimento instanceof Date) ||
      Number.isNaN(this.dataNascimento.getTime())
    ) {
      throw new ValidationError('Data de nascimento inválida');
    }

    const agora = new Date();
    if (this.dataNascimento.getTime() > agora.getTime()) {
      throw new ValidationError('Data de nascimento não pode ser futura');
    }

    const idade = this.calcularIdade(agora);
    if (idade < 0 || idade > 130) {
      throw new ValidationError('Data de nascimento resulta em idade inválida');
    }

    if (
      !(this.cienciaPrivacidadeEm instanceof Date) ||
      Number.isNaN(this.cienciaPrivacidadeEm.getTime())
    ) {
      throw new ValidationError('Aceite do termo de privacidade é obrigatório');
    }

    for (const tipo of this.tiposDeficiencia) {
      if (!TIPOS_DEFICIENCIA_VALIDOS.has(tipo)) {
        throw new ValidationError(`Tipo de deficiência inválido: ${tipo}`);
      }
    }
  }

  /**
   * Calcula a idade completa em anos na data de referência informada (em UTC).
   */
  public calcularIdade(referencia: Date = new Date()): number {
    const anoRef = referencia.getUTCFullYear();
    const mesRef = referencia.getUTCMonth();
    const diaRef = referencia.getUTCDate();

    const anoNasc = this.dataNascimento.getUTCFullYear();
    const mesNasc = this.dataNascimento.getUTCMonth();
    const diaNasc = this.dataNascimento.getUTCDate();

    let idade = anoRef - anoNasc;
    if (mesRef < mesNasc || (mesRef === mesNasc && diaRef < diaNasc)) {
      idade -= 1;
    }

    return idade;
  }

  /**
   * Verifica elegibilidade à fila prioritária legal (idoso >= 60 anos ou PCD).
   */
  public ehPrioritarioLegal(referencia: Date = new Date()): boolean {
    return (
      this.calcularIdade(referencia) >= 60 || this.possuiDeficiencia === 'SIM'
    );
  }

  /**
   * Retorna o critério específico de prioridade legal do paciente na data de referência.
   */
  public obterCriterioPrioridade(
    referencia: Date = new Date()
  ): CriterioPrioridade {
    const idoso = this.calcularIdade(referencia) >= 60;
    const pcd = this.possuiDeficiencia === 'SIM';

    if (idoso && pcd) {
      return 'AMBOS';
    }
    if (idoso) {
      return 'IDOSO_60_MAIS';
    }
    if (pcd) {
      return 'PCD';
    }
    return 'PADRAO';
  }

  public obterGrupoAtendimento(
    referencia: Date = new Date()
  ): GrupoAtendimentoPaciente {
    return this.ehPrioritarioLegal(referencia) ? 'PRIORITARIO' : 'COMUM';
  }

  public obterPerfilAcesso(): string {
    return 'PACIENTE';
  }

  public podeAutenticar(): boolean {
    return this.status === 'ATIVO';
  }

  /**
   * Atualiza dados permitidos ao cidadão mantendo o CPF estritamente imutável.
   */
  public atualizarDadosCadastrais(dados: AtualizacaoCadastralPaciente): void {
    if (dados.nomeSocial !== undefined) {
      const normalizado =
        dados.nomeSocial && dados.nomeSocial.trim().length > 0
          ? dados.nomeSocial.trim()
          : null;
      if (normalizado && normalizado.length > 150) {
        throw new ValidationError(
          'Nome social deve ter no máximo 150 caracteres'
        );
      }
      this.nomeSocial = normalizado;
    }

    if (dados.email !== undefined) {
      this.email = Usuario.normalizarEmail(dados.email);
    }

    if (dados.celular !== undefined) {
      this.celular = Usuario.normalizarCelular(dados.celular);
    }

    if (dados.celularWhatsapp !== undefined) {
      this.celularWhatsapp = dados.celularWhatsapp;
    }

    if (dados.possuiDeficiencia !== undefined) {
      this.possuiDeficiencia = dados.possuiDeficiencia;
    }

    if (dados.tiposDeficiencia !== undefined) {
      this.tiposDeficiencia = [...dados.tiposDeficiencia];
    }

    if (dados.preferenciasAcessibilidade !== undefined) {
      this.preferenciasAcessibilidade =
        dados.preferenciasAcessibilidade &&
        dados.preferenciasAcessibilidade.trim().length > 0
          ? dados.preferenciasAcessibilidade.trim()
          : null;
    }

    if (dados.endereco !== undefined) {
      this.endereco = validarENormalizarEndereco(dados.endereco);
    }

    this.validarRegrasEspecificas();
    this.updatedAt = new Date();
  }

  public getCns(): Cns {
    return this.cns;
  }

  public getDataNascimento(): Date {
    return new Date(this.dataNascimento.getTime());
  }

  public getPossuiDeficiencia(): PossuiDeficiencia {
    return this.possuiDeficiencia;
  }

  public getTiposDeficiencia(): TipoDeficiencia[] {
    return [...this.tiposDeficiencia];
  }

  public getPreferenciasAcessibilidade(): string | null {
    return this.preferenciasAcessibilidade;
  }

  public getEndereco(): Endereco {
    return { ...this.endereco };
  }

  public getCelularWhatsapp(): boolean {
    return this.celularWhatsapp;
  }

  public getCienciaPrivacidadeEm(): Date {
    return new Date(this.cienciaPrivacidadeEm.getTime());
  }

  public getSituacaoCns(): SituacaoCns {
    return this.situacaoCns;
  }

  public getOrigemCadastro(): OrigemCadastro {
    return this.origemCadastro;
  }
}
