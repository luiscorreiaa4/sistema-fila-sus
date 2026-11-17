import { DomainError } from './DomainError';

export class ForbiddenError extends DomainError {
  constructor(mensagem = 'Acesso negado', codigo = 'FORBIDDEN') {
    super(mensagem, 403, codigo);
  }
}
