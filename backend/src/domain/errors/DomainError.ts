export class DomainError extends Error {
  public readonly statusCode: number;
  public readonly codigo: string;

  constructor(mensagem: string, statusCode = 400, codigo = 'DOMAIN_ERROR') {
    super(mensagem);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.codigo = codigo;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
