import { EntradaFila } from '../entities/EntradaFila';
import { ValidationError } from '../errors/ValidationError';
import { EstrategiaChamadaFila } from './EstrategiaChamadaFila';

/**
 * Implementa o rodízio legal configurável (padrão 5 prioritários para 1 comum),
 * evitando ociosidade de guichê quando um dos grupos estiver vazio.
 */
export class RodizioPrioritarioComumStrategy implements EstrategiaChamadaFila {
  public readonly nome = 'RODIZIO_5_1';
  private readonly proporcaoPrioritarios: number;

  constructor(proporcaoPrioritarios = 5) {
    if (
      !Number.isInteger(proporcaoPrioritarios) ||
      proporcaoPrioritarios < 1
    ) {
      throw new ValidationError(
        'Proporção de prioritários no rodízio deve ser um inteiro maior ou igual a 1'
      );
    }
    this.proporcaoPrioritarios = proporcaoPrioritarios;
  }

  public getProporcaoPrioritarios(): number {
    return this.proporcaoPrioritarios;
  }

  public selecionarProximaEntrada(
    aguardando: EntradaFila[],
    prioritariosSeguidosNoCiclo: number
  ): EntradaFila | null {
    const elegiveis = aguardando.filter(
      (entrada) => entrada.getSituacao() === 'AGUARDANDO'
    );

    if (elegiveis.length === 0) {
      return null;
    }

    const prioritarios = elegiveis
      .filter((entrada) => entrada.ehPrioritario())
      .sort((a, b) => a.getOrdemEntrada() - b.getOrdemEntrada());

    const comuns = elegiveis
      .filter((entrada) => !entrada.ehPrioritario())
      .sort((a, b) => a.getOrdemEntrada() - b.getOrdemEntrada());

    const seguidos = Math.max(0, prioritariosSeguidosNoCiclo);

    if (seguidos < this.proporcaoPrioritarios) {
      return prioritarios[0] ?? comuns[0] ?? null;
    }

    return comuns[0] ?? prioritarios[0] ?? null;
  }

  /**
   * Simula a sequência completa de chamadas esperada para calcular posição na fila (RF005).
   */
  public ordenarFilaSimulada(
    aguardando: EntradaFila[],
    prioritariosSeguidosNoCiclo = 0
  ): EntradaFila[] {
    const restantes = aguardando.filter(
      (entrada) => entrada.getSituacao() === 'AGUARDANDO'
    );
    const ordenados: EntradaFila[] = [];
    let seguidos = Math.max(0, prioritariosSeguidosNoCiclo);

    while (restantes.length > 0) {
      const proximo = this.selecionarProximaEntrada(restantes, seguidos);
      if (!proximo) {
        break;
      }

      ordenados.push(proximo);
      const idx = restantes.findIndex((item) => item.getId() === proximo.getId());
      if (idx >= 0) {
        restantes.splice(idx, 1);
      }

      if (proximo.ehPrioritario()) {
        seguidos += 1;
      } else {
        seguidos = 0;
      }
    }

    return ordenados;
  }
}
