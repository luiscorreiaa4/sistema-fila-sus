import {
  CategoriaServico,
  Servico,
  StatusServico,
} from '../entities/Servico';

export interface FiltroServicos {
  categoria?: CategoriaServico;
  especialidade?: string;
  status?: StatusServico;
}

export interface IServicoRepository {
  buscarPorId(id: string): Promise<Servico | null>;
  buscarPorNomeEEspecialidade(
    nome: string,
    especialidade: string
  ): Promise<Servico | null>;
  listar(filtros?: FiltroServicos): Promise<Servico[]>;
  salvar(servico: Servico): Promise<Servico>;
  atualizar(servico: Servico): Promise<Servico>;
}
