import { Profissional } from '../entities/Profissional';
import { StatusCadastro } from '../entities/Usuario';

export interface FiltroProfissionais {
  unidadeId?: string;
  status?: StatusCadastro;
}

export interface IProfissionalRepository {
  buscarPorId(id: string): Promise<Profissional | null>;
  buscarPorCpf(cpf: string): Promise<Profissional | null>;
  buscarPorEmail(email: string): Promise<Profissional | null>;
  listar(filtros?: FiltroProfissionais): Promise<Profissional[]>;
  salvar(profissional: Profissional): Promise<Profissional>;
  atualizar(profissional: Profissional): Promise<Profissional>;
}
