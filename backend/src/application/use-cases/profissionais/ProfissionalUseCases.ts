import { randomUUID } from 'node:crypto';
import {
  NivelAcesso,
  Profissional,
} from '../../../domain/entities/Profissional';
import { StatusCadastro } from '../../../domain/entities/Usuario';
import { ConflictError } from '../../../domain/errors/ConflictError';
import { NotFoundError } from '../../../domain/errors/NotFoundError';
import { ValidationError } from '../../../domain/errors/ValidationError';
import { IProfissionalRepository } from '../../../domain/repositories/IProfissionalRepository';
import { IUnidadeSaudeRepository } from '../../../domain/repositories/IUnidadeSaudeRepository';
import { Cpf } from '../../../domain/value-objects/Cpf';
import { Senha } from '../../../domain/value-objects/Senha';
import { IHashService } from '../../services/IHashService';

export interface CadastrarProfissionalInput {
  cpf: string;
  nomeCompleto: string;
  nomeSocial?: string | null;
  conselhoProfissional?: string | null;
  numeroRegistro?: string | null;
  ufRegistro?: string | null;
  email: string;
  celular?: string | null;
  unidadesVinculadas: string[];
  especialidades?: string[];
  nivelAcesso: NivelAcesso;
  senha: string;
}

export class CadastrarProfissionalUseCase {
  constructor(
    private readonly profissionalRepo: IProfissionalRepository,
    private readonly unidadeRepo: IUnidadeSaudeRepository,
    private readonly hashService: IHashService
  ) {}

  public async executar(
    input: CadastrarProfissionalInput
  ): Promise<Profissional> {
    const cpfVo = Cpf.criar(input.cpf);
    const senhaVo = Senha.criarDeTextoPlano(
      input.senha,
      cpfVo.getValor(),
      undefined,
      (plana) => this.hashService.gerarHash(plana)
    );

    const profissional = new Profissional({
      id: randomUUID(),
      cpf: cpfVo,
      nomeCompleto: input.nomeCompleto,
      nomeSocial: input.nomeSocial,
      conselhoProfissional: input.conselhoProfissional,
      numeroRegistro: input.numeroRegistro,
      ufRegistro: input.ufRegistro,
      email: input.email,
      celular: input.celular,
      nivelAcesso: input.nivelAcesso,
      situacaoAcesso: 'ATIVO',
      status: 'ATIVO',
      unidadesVinculadas: input.unidadesVinculadas,
      especialidades: input.especialidades ?? [],
      senhaHash: senhaVo,
    });

    const existentePorCpf = await this.profissionalRepo.buscarPorCpf(
      profissional.getCpf().getValor()
    );
    if (existentePorCpf) {
      throw new ConflictError('Já existe profissional cadastrado com este CPF');
    }

    const email = profissional.getEmail();
    if (email) {
      const existentePorEmail = await this.profissionalRepo.buscarPorEmail(email);
      if (existentePorEmail) {
        throw new ConflictError(
          'Já existe profissional cadastrado com este e-mail'
        );
      }
    }

    for (const unidadeId of profissional.getUnidadesVinculadas()) {
      const unidade = await this.unidadeRepo.buscarPorId(unidadeId);
      if (!unidade || !unidade.aceitaAgendas()) {
        throw new ValidationError(
          `Unidade de saúde vinculada (${unidadeId}) não existe ou está inativa`
        );
      }
    }

    return this.profissionalRepo.salvar(profissional);
  }
}

export interface ListarProfissionaisInput {
  unidadeId?: string;
  status?: StatusCadastro;
}

export class ListarProfissionaisUseCase {
  constructor(private readonly profissionalRepo: IProfissionalRepository) {}

  public async executar(
    filtros: ListarProfissionaisInput = {}
  ): Promise<Profissional[]> {
    return this.profissionalRepo.listar(filtros);
  }
}

export interface InativarProfissionalInput {
  profissionalId: string;
  motivoInativacao: string;
  executorId: string;
}

export class InativarProfissionalUseCase {
  constructor(private readonly profissionalRepo: IProfissionalRepository) {}

  public async executar(
    input: InativarProfissionalInput
  ): Promise<Profissional> {
    const profissional = await this.profissionalRepo.buscarPorId(
      input.profissionalId
    );
    if (!profissional) {
      throw new NotFoundError('Profissional não encontrado');
    }

    profissional.inativar(input.motivoInativacao, input.executorId);
    return this.profissionalRepo.atualizar(profissional);
  }
}
