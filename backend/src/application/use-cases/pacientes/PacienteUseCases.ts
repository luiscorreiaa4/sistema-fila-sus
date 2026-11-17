import { randomUUID } from 'node:crypto';
import { Endereco } from '../../../domain/entities/Endereco';
import {
  OrigemCadastro,
  Paciente,
  PossuiDeficiencia,
  TipoDeficiencia,
} from '../../../domain/entities/Paciente';
import { ConflictError } from '../../../domain/errors/ConflictError';
import { NotFoundError } from '../../../domain/errors/NotFoundError';
import { ValidationError } from '../../../domain/errors/ValidationError';
import { IPacienteRepository } from '../../../domain/repositories/IPacienteRepository';
import { Cns } from '../../../domain/value-objects/Cns';
import { Cpf } from '../../../domain/value-objects/Cpf';
import { Senha } from '../../../domain/value-objects/Senha';
import { IHashService } from '../../services/IHashService';
import { converterDataIsoParaDateUtc } from '../../utils/dataMaceio';

export interface CadastrarPacienteInput {
  cpf: string;
  cns: string;
  nomeCompleto: string;
  nomeSocial?: string | null;
  dataNascimento: string | Date;
  email?: string | null;
  celular?: string | null;
  celularWhatsapp?: boolean;
  possuiDeficiencia: PossuiDeficiencia;
  tiposDeficiencia?: TipoDeficiencia[];
  preferenciasAcessibilidade?: string | null;
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string | null;
  bairro: string;
  municipio: string;
  estado: string;
  senha: string;
  cienciaPrivacidade: boolean;
  origemCadastro?: OrigemCadastro;
}

export class CadastrarPacienteUseCase {
  constructor(
    private readonly pacienteRepo: IPacienteRepository,
    private readonly hashService: IHashService
  ) {}

  public async executar(input: CadastrarPacienteInput): Promise<Paciente> {
    if (input.cienciaPrivacidade !== true) {
      throw new ValidationError(
        'Aceite do termo de ciência de privacidade (LGPD) é obrigatório'
      );
    }

    const cpfVo = Cpf.criar(input.cpf);
    const cnsVo = Cns.criar(input.cns);
    const dataNascimento =
      input.dataNascimento instanceof Date
        ? input.dataNascimento
        : converterDataIsoParaDateUtc(input.dataNascimento);

    const senhaVo = Senha.criarDeTextoPlano(
      input.senha,
      cpfVo.getValor(),
      dataNascimento,
      (plana) => this.hashService.gerarHash(plana)
    );

    const endereco: Endereco = {
      cep: input.cep,
      logradouro: input.logradouro,
      numero: input.numero,
      complemento: input.complemento,
      bairro: input.bairro,
      municipio: input.municipio,
      estado: input.estado,
    };

    const paciente = new Paciente({
      id: randomUUID(),
      cpf: cpfVo,
      cns: cnsVo,
      nomeCompleto: input.nomeCompleto,
      nomeSocial: input.nomeSocial,
      dataNascimento,
      email: input.email,
      celular: input.celular,
      celularWhatsapp: input.celularWhatsapp ?? false,
      possuiDeficiencia: input.possuiDeficiencia,
      tiposDeficiencia: input.tiposDeficiencia ?? [],
      preferenciasAcessibilidade: input.preferenciasAcessibilidade,
      endereco,
      senhaHash: senhaVo,
      cienciaPrivacidadeEm: new Date(),
      situacaoCns: 'PENDENTE_CONFIRMACAO',
      origemCadastro: input.origemCadastro ?? 'AUTOATENDIMENTO',
      status: 'ATIVO',
    });

    const existentePorCpf = await this.pacienteRepo.buscarPorCpf(
      paciente.getCpf().getValor()
    );
    if (existentePorCpf) {
      throw new ConflictError('Já existe paciente cadastrado com este CPF');
    }

    const existentePorCns = await this.pacienteRepo.buscarPorCns(
      paciente.getCns().getValor()
    );
    if (existentePorCns) {
      throw new ConflictError('Já existe paciente cadastrado com este CNS');
    }

    const email = paciente.getEmail();
    if (email) {
      const existentePorEmail = await this.pacienteRepo.buscarPorEmail(email);
      if (existentePorEmail) {
        throw new ConflictError('Já existe paciente cadastrado com este e-mail');
      }
    }

    return this.pacienteRepo.salvar(paciente);
  }
}

export class ObterPerfilPacienteUseCase {
  constructor(private readonly pacienteRepo: IPacienteRepository) {}

  public async executar(pacienteId: string): Promise<Paciente> {
    const paciente = await this.pacienteRepo.buscarPorId(pacienteId);
    if (!paciente) {
      throw new NotFoundError('Paciente não encontrado');
    }
    return paciente;
  }
}

export class BuscarPacientePorCpfUseCase {
  constructor(private readonly pacienteRepo: IPacienteRepository) {}

  public async executar(cpf: string): Promise<Paciente> {
    const cpfVo = Cpf.criar(cpf);
    const paciente = await this.pacienteRepo.buscarPorCpf(cpfVo.getValor());
    if (!paciente) {
      throw new NotFoundError('Paciente não encontrado');
    }
    return paciente;
  }
}

export interface AtualizarPerfilPacienteInput {
  pacienteId: string;
  cpf?: unknown;
  nomeSocial?: string | null;
  email?: string | null;
  celular?: string | null;
  celularWhatsapp?: boolean;
  possuiDeficiencia?: PossuiDeficiencia;
  tiposDeficiencia?: TipoDeficiencia[];
  preferenciasAcessibilidade?: string | null;
  endereco?: Endereco;
}

export class AtualizarPerfilPacienteUseCase {
  constructor(private readonly pacienteRepo: IPacienteRepository) {}

  public async executar(input: AtualizarPerfilPacienteInput): Promise<Paciente> {
    if (input.cpf !== undefined) {
      throw new ValidationError('Não é permitido alterar o CPF do paciente');
    }

    const paciente = await this.pacienteRepo.buscarPorId(input.pacienteId);
    if (!paciente) {
      throw new NotFoundError('Paciente não encontrado');
    }

    const emailAnterior = paciente.getEmail();

    paciente.atualizarDadosCadastrais({
      nomeSocial: input.nomeSocial,
      email: input.email,
      celular: input.celular,
      celularWhatsapp: input.celularWhatsapp,
      possuiDeficiencia: input.possuiDeficiencia,
      tiposDeficiencia: input.tiposDeficiencia,
      preferenciasAcessibilidade: input.preferenciasAcessibilidade,
      endereco: input.endereco,
    });

    const novoEmail = paciente.getEmail();
    if (novoEmail && novoEmail !== emailAnterior) {
      const outro = await this.pacienteRepo.buscarPorEmail(novoEmail);
      if (outro && outro.getId() !== paciente.getId()) {
        throw new ConflictError('Já existe paciente cadastrado com este e-mail');
      }
    }

    return this.pacienteRepo.atualizar(paciente);
  }
}
