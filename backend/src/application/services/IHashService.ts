/**
 * Contrato de serviço para geração e comparação de hashes seguros de senha.
 */
export interface IHashService {
  gerarHash(senhaPlana: string): string;
  comparar(senhaPlana: string, hash: string): boolean;
}
