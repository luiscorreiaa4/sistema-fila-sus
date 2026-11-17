import { EntradaFila } from '../entities/EntradaFila';

/**
 * Contrato polimórfico para algoritmos de ordenação e seleção do próximo paciente na fila.
 */
export interface EstrategiaChamadaFila {
  readonly nome: string;

  selecionarProximaEntrada(
    aguardando: EntradaFila[],
    prioritariosSeguidosNoCiclo: number
  ): EntradaFila | null;
}
