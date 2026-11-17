import { DomainError } from './DomainError';

export class UnauthorizedError extends DomainError {
  constructor(
    mensagem = 'Não autorizado',
    statusCode = 401,
    codigo = 'UNAUTHORIZED_ERROR'
  ) {
    super(mensagem, statusCode, codigo);
  }
}
