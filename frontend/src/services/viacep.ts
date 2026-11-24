import { somenteDigitos } from '../utils/formatters';

export interface ViaCepAddress {
  cep: string;
  logradouro: string;
  bairro: string;
  municipio: string;
  estado: string;
}

export class ViaCepError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ViaCepError';
  }
}

interface ViaCepRawResponse {
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean | string;
}

export async function consultarViaCep(
  cep: string,
  signal?: AbortSignal
): Promise<ViaCepAddress> {
  const cepLimpo = somenteDigitos(cep);

  if (!/^\d{8}$/.test(cepLimpo) || /^(\d)\1{7}$/.test(cepLimpo)) {
    throw new ViaCepError(
      'CEP inválido. Verifique os 8 dígitos ou preencha o endereço manualmente.'
    );
  }

  let response: Response;
  try {
    response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`, {
      signal,
      headers: { Accept: 'application/json' },
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    throw new ViaCepError(
      'Não foi possível consultar o CEP no momento. Preencha o endereço manualmente.'
    );
  }

  if (!response.ok) {
    throw new ViaCepError(
      'Não foi possível consultar o CEP no momento. Preencha o endereço manualmente.'
    );
  }

  let data: ViaCepRawResponse;
  try {
    data = (await response.json()) as ViaCepRawResponse;
  } catch {
    throw new ViaCepError(
      'Não foi possível interpretar a resposta do CEP. Preencha o endereço manualmente.'
    );
  }

  if (data.erro === true || data.erro === 'true') {
    throw new ViaCepError(
      'CEP não encontrado. Verifique os dígitos ou preencha o endereço manualmente.'
    );
  }

  return {
    cep: cepLimpo,
    logradouro: (data.logradouro ?? '').trim(),
    bairro: (data.bairro ?? '').trim(),
    municipio: (data.localidade ?? '').trim(),
    estado: (data.uf ?? '').trim().toUpperCase(),
  };
}
