import { ValidationError } from '../errors/ValidationError';

export interface Endereco {
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string | null;
  bairro: string;
  municipio: string;
  estado: string;
}

/**
 * Valida e normaliza campos obrigatórios de endereço postal brasileiro.
 */
export function validarENormalizarEndereco(endereco: Endereco): Endereco {
  if (!endereco) {
    throw new ValidationError('Endereço é obrigatório');
  }

  const cepLimpo = (endereco.cep ?? '').replace(/\D/g, '');
  if (!/^\d{8}$/.test(cepLimpo)) {
    throw new ValidationError('CEP inválido: deve conter exatamente 8 dígitos');
  }

  const logradouro = endereco.logradouro?.trim() ?? '';
  const numero = endereco.numero?.trim() ?? '';
  const bairro = endereco.bairro?.trim() ?? '';
  const municipio = endereco.municipio?.trim() ?? '';
  const estado = endereco.estado?.trim().toUpperCase() ?? '';
  const complemento =
    endereco.complemento && endereco.complemento.trim().length > 0
      ? endereco.complemento.trim()
      : null;

  if (!logradouro || logradouro.length > 200) {
    throw new ValidationError('Logradouro é obrigatório (máx. 200 caracteres)');
  }
  if (!numero || numero.length > 20) {
    throw new ValidationError('Número do endereço é obrigatório');
  }
  if (!bairro || bairro.length > 100) {
    throw new ValidationError('Bairro é obrigatório (máx. 100 caracteres)');
  }
  if (!municipio || municipio.length > 100) {
    throw new ValidationError('Município é obrigatório (máx. 100 caracteres)');
  }
  if (!/^[A-Z]{2}$/.test(estado)) {
    throw new ValidationError('UF do endereço deve conter 2 letras');
  }

  return {
    cep: cepLimpo,
    logradouro,
    numero,
    complemento,
    bairro,
    municipio,
    estado,
  };
}
