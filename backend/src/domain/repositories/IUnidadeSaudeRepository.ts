import { StatusUnidade, UnidadeSaude } from '../entities/UnidadeSaude';

export interface FiltroUnidadesSaude {
  status?: StatusUnidade;
  municipio?: string;
}

export interface IUnidadeSaudeRepository {
  buscarPorId(id: string): Promise<UnidadeSaude | null>;
  buscarPorCnes(cnes: string): Promise<UnidadeSaude | null>;
  buscarPorNomeEMunicipio(
    nome: string,
    municipio: string
  ): Promise<UnidadeSaude | null>;
  listar(filtros?: FiltroUnidadesSaude): Promise<UnidadeSaude[]>;
  salvar(unidade: UnidadeSaude): Promise<UnidadeSaude>;
  atualizar(unidade: UnidadeSaude): Promise<UnidadeSaude>;
}
