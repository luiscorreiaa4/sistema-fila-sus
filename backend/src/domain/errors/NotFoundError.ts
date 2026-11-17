import { DomainError } from './DomainError';

export class NotFoundError extends DomainError {
  constructor(mensagem = 'Recurso não encontrado', codigo = 'NOT_FOUND') {
    super(mensagem, 404, codigo);
  }
}
