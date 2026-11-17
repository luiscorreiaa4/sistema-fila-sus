import bcrypt from 'bcryptjs';
import { IHashService } from '../../application/services/IHashService';
import { Senha } from '../../domain/value-objects/Senha';

/**
 * Implementação de hash de credenciais utilizando bcryptjs (salt factor 10).
 */
export class BcryptHashService implements IHashService {
  private readonly rounds: number;

  constructor(rounds = 10) {
    this.rounds = rounds;
  }

  public gerarHash(senhaPlana: string): string {
    return bcrypt.hashSync(senhaPlana, this.rounds);
  }

  public comparar(senhaPlana: string, hash: string): boolean {
    if (hash.startsWith('scrypt$')) {
      return Senha.deHash(hash).comparar(senhaPlana);
    }
    return bcrypt.compareSync(senhaPlana, hash);
  }
}
