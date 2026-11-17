import { DomainError } from './DomainError';

export class ConflictError extends DomainError {
  constructor(mensagem: string, codigo = 'CONFLICT_ERROR') {
    super(mensagem, 409, codigo);
  }
}
