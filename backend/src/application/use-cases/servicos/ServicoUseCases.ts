import { randomUUID } from 'node:crypto';
import {
  CategoriaServico,
  ModoAcessoServico,
  Servico,
  StatusServico,
} from '../../../domain/entities/Servico';
import { ConflictError } from '../../../domain/errors/ConflictError';
import { NotFoundError } from '../../../domain/errors/NotFoundError';
import { IServicoRepository } from '../../../domain/repositories/IServicoRepository';

export interface CadastrarServicoInput {
  nome: string;
  categoria: CategoriaServico;
  especialidade: string;
  modoAcesso?: ModoAcessoServico;
  orientacoesPreparo?: string | null;
}

export class CadastrarServicoUseCase {
  constructor(private readonly servicoRepo: IServicoRepository) {}

  public async executar(input: CadastrarServicoInput): Promise<Servico> {
    const servico = new Servico({
      id: randomUUID(),
      nome: input.nome,
      categoria: input.categoria,
      especialidade: input.especialidade,
      modoAcesso: input.modoAcesso ?? 'DIRETO',
      orientacoesPreparo: input.orientacoesPreparo,
      status: 'ATIVO',
    });

    const existente = await this.servicoRepo.buscarPorNomeEEspecialidade(
      servico.getNome(),
      servico.getEspecialidade()
    );
    if (existente) {
      throw new ConflictError(
        'Já existe serviço cadastrado com este nome e especialidade'
      );
    }

    return this.servicoRepo.salvar(servico);
  }
}

export interface ListarServicosInput {
  categoria?: CategoriaServico;
  especialidade?: string;
  status?: StatusServico;
  incluirInativos?: boolean;
}

export class ListarServicosUseCase {
  constructor(private readonly servicoRepo: IServicoRepository) {}

  public async executar(filtros: ListarServicosInput = {}): Promise<Servico[]> {
    const status = filtros.incluirInativos
      ? filtros.status
      : (filtros.status ?? 'ATIVO');

    return this.servicoRepo.listar({
      categoria: filtros.categoria,
      especialidade: filtros.especialidade,
      status,
    });
  }
}

export class InativarServicoUseCase {
  constructor(private readonly servicoRepo: IServicoRepository) {}

  public async executar(servicoId: string): Promise<Servico> {
    const servico = await this.servicoRepo.buscarPorId(servicoId);
    if (!servico) {
      throw new NotFoundError('Serviço não encontrado');
    }

    servico.inativar();
    return this.servicoRepo.atualizar(servico);
  }
}
