import { EntradaFila } from '../entities/EntradaFila';
import { EstrategiaChamadaFila } from './EstrategiaChamadaFila';

/**
 * Estratégia estritamente cronológica baseada na ordem de check-in (`ordemEntrada`).
 */
export class OrdemChegadaStrategy implements EstrategiaChamadaFila {
  public readonly nome = 'ORDEM_CHEGADA';

  public selecionarProximaEntrada(
    aguardando: EntradaFila[],
    _prioritariosSeguidosNoCiclo: number
  ): EntradaFila | null {
    const elegiveis = aguardando
      .filter((entrada) => entrada.getSituacao() === 'AGUARDANDO')
      .sort((a, b) => a.getOrdemEntrada() - b.getOrdemEntrada());

    return elegiveis[0] ?? null;
  }
}
