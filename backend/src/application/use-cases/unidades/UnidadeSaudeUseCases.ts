import { randomUUID } from 'node:crypto';
import { Endereco } from '../../../domain/entities/Endereco';
import { StatusUnidade, UnidadeSaude } from '../../../domain/entities/UnidadeSaude';
import { ConflictError } from '../../../domain/errors/ConflictError';
import { NotFoundError } from '../../../domain/errors/NotFoundError';
import { IUnidadeSaudeRepository } from '../../../domain/repositories/IUnidadeSaudeRepository';

export interface CadastrarUnidadeSaudeInput {
  cnes?: string | null;
  cnpj: string;
  nome: string;
  telefone?: string | null;
  email?: string | null;
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string | null;
  bairro: string;
  municipio: string;
  estado: string;
  fusoHorario?: string;
}

export class CadastrarUnidadeSaudeUseCase {
  constructor(private readonly unidadeRepo: IUnidadeSaudeRepository) {}

  public async executar(input: CadastrarUnidadeSaudeInput): Promise<UnidadeSaude> {
    const endereco: Endereco = {
      cep: input.cep,
      logradouro: input.logradouro,
      numero: input.numero,
      complemento: input.complemento,
      bairro: input.bairro,
      municipio: input.municipio,
      estado: input.estado,
    };

    const unidade = new UnidadeSaude({
      id: randomUUID(),
      cnes: input.cnes,
      cnpj: input.cnpj,
      nome: input.nome,
      telefone: input.telefone,
      email: input.email,
      endereco,
      fusoHorario: input.fusoHorario ?? 'America/Maceio',
    });

    const cnes = unidade.getCnes();
    if (cnes) {
      const existentePorCnes = await this.unidadeRepo.buscarPorCnes(cnes);
      if (existentePorCnes) {
        throw new ConflictError('Já existe unidade de saúde cadastrada com este CNES');
      }
    }

    const existentePorNomeMunicipio =
      await this.unidadeRepo.buscarPorNomeEMunicipio(
        unidade.getNome(),
        unidade.getEndereco().municipio
      );

    if (existentePorNomeMunicipio) {
      throw new ConflictError(
        'Já existe unidade de saúde cadastrada com este nome neste município'
      );
    }

    return this.unidadeRepo.salvar(unidade);
  }
}

export interface ListarUnidadesSaudeInput {
  status?: StatusUnidade;
  municipio?: string;
}

export class ListarUnidadesSaudeUseCase {
  constructor(private readonly unidadeRepo: IUnidadeSaudeRepository) {}

  public async executar(
    filtros: ListarUnidadesSaudeInput = {}
  ): Promise<UnidadeSaude[]> {
    return this.unidadeRepo.listar({
      status: filtros.status,
      municipio: filtros.municipio,
    });
  }
}

export interface InativarUnidadeSaudeInput {
  unidadeId: string;
  motivoInativacao: string;
}

export class InativarUnidadeSaudeUseCase {
  constructor(private readonly unidadeRepo: IUnidadeSaudeRepository) {}

  public async executar(input: InativarUnidadeSaudeInput): Promise<UnidadeSaude> {
    const unidade = await this.unidadeRepo.buscarPorId(input.unidadeId);
    if (!unidade) {
      throw new NotFoundError('Unidade de saúde não encontrada');
    }

    unidade.inativar(input.motivoInativacao);
    return this.unidadeRepo.atualizar(unidade);
  }
}
