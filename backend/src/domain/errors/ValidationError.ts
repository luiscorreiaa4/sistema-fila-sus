import { DomainError } from './DomainError';

export class ValidationError extends DomainError {
  constructor(mensagem: string, codigo = 'VALIDATION_ERROR') {
    super(mensagem, 400, codigo);
  }
}
