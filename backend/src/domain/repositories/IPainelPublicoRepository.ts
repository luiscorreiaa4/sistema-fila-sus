import { EstadoChamada } from '../entities/ChamadaFila';

/**
 * Projeção pública LGPD (sem dados pessoais do paciente).
 */
export interface ChamadaPainelPublicoDTO {
  chamadaId: string;
  unidadeId: string;
  unidadeNome: string;
  senhaAtendimento: string;
  guicheSala: string;
  horarioChamada: Date;
  tentativa: number;
  estado: EstadoChamada;
}

export interface IPainelPublicoRepository {
  listarChamadasPublicas(
    unidadeId: string,
    limite?: number
  ): Promise<ChamadaPainelPublicoDTO[]>;
}
