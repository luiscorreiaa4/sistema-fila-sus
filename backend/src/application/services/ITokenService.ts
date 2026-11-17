export type TipoUsuarioAutenticado = 'PACIENTE' | 'PROFISSIONAL';

export interface TokenPayload {
  sub: string;
  tipoUsuario: TipoUsuarioAutenticado;
  perfil: string;
  unidadesVinculadas: string[];
  nomeExibicao: string;
}

/**
 * Contrato de serviço para emissão e validação de tokens de autenticação.
 */
export interface ITokenService {
  gerarToken(payload: TokenPayload): string;
  verificarToken(token: string): TokenPayload;
}
